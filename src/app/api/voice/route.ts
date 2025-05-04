import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

// Grok API configuration
const GROK_API_URL = process.env.GROK_API_URL;
const GROK_API_KEY = process.env.GROK_API_KEY;
const GROK_MODEL = process.env.GROK_MODEL;

const DEFAULT_GROK_MODEL = 'grok-3-mini-beta';
const modelToUse = GROK_MODEL && GROK_MODEL.trim() !== '' ? GROK_MODEL : DEFAULT_GROK_MODEL;
console.log('GROK_MODEL (from env):', GROK_MODEL);
console.log('Model used in request:', modelToUse);

if (!GROK_API_URL || !GROK_API_KEY) {
  throw new Error('Missing required environment variables for Grok API');
}

console.log('GROK_MODEL:', GROK_MODEL); // Debug: log the model name

// Define function schemas for Grok function calling
const functions = [
  {
    name: 'addTransaction',
    description: 'Add a new transaction to track spending or income',
    parameters: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          description: 'The amount of money involved in the transaction',
        },
        type: {
          type: 'string',
          enum: ['INCOME', 'EXPENSE'],
          description: 'Whether this is income or an expense',
        },
        description: {
          type: 'string',
          description: 'Description of the transaction',
        },
        category: {
          type: 'string',
          description: 'Category of the transaction (e.g., food, transport, salary)',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags to help categorize the transaction',
        },
      },
      required: ['amount', 'type', 'description', 'category'],
    },
  },
  {
    name: 'createGoal',
    description: 'Create a new financial goal',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the financial goal',
        },
        targetAmount: {
          type: 'number',
          description: 'Target amount to save or achieve',
        },
        deadline: {
          type: 'string',
          description: 'Deadline for achieving the goal (ISO date string)',
        },
      },
      required: ['name', 'targetAmount'],
    },
  },
  {
    name: 'updateTransaction',
    description: 'Update an existing transaction by its ID',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID of the transaction to update' },
        amount: { type: 'number', description: 'New amount (optional)' },
        description: { type: 'string', description: 'New description (optional)' },
        category: { type: 'string', description: 'New category (optional)' },
        type: { type: 'string', enum: ['INCOME', 'EXPENSE'], description: 'New type (optional)' },
        tags: { type: 'array', items: { type: 'string' }, description: 'New tags (optional)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'deleteTransaction',
    description: 'Delete a transaction by its ID',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID of the transaction to delete' },
      },
      required: ['id'],
    },
  },
  {
    name: 'updateGoal',
    description: 'Update an existing financial goal by its ID',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID of the goal to update' },
        name: { type: 'string', description: 'New name (optional)' },
        targetAmount: { type: 'number', description: 'New target amount (optional)' },
        deadline: { type: 'string', description: 'New deadline (optional, ISO date string)' },
        status: { type: 'string', enum: ['IN_PROGRESS', 'COMPLETED', 'FAILED'], description: 'New status (optional)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'deleteGoal',
    description: 'Delete a financial goal by its ID',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID of the goal to delete' },
      },
      required: ['id'],
    },
  },
];

async function callGrokAPI(voiceText: string) {
  try {
    const requestBody = {
      model: modelToUse,
      messages: [
        {
          role: 'system',
          content: 'You are a financial assistant that helps users track their spending and manage their budget. Convert voice commands into structured function calls.',
        },
        {
          role: 'user',
          content: voiceText,
        },
      ],
      tools: functions,
      tool_choice: 'auto',
    };
    console.log('Request body:', JSON.stringify(requestBody));
    const response = await axios.post(
      GROK_API_URL,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${GROK_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('Full Grok API response:', JSON.stringify(response.data));
    return response.data;
  } catch (error: any) {
    if (error && error.response && error.response.data) {
      console.error('Error calling Grok API:', JSON.stringify(error.response.data));
    } else {
      console.error('Error calling Grok API:', error?.message || error);
    }
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    const { voiceText } = await req.json();
    const startTime = Date.now();

    // Log the voice command
    const voiceCommand = await prisma.voiceCommand.create({
      data: {
        rawText: voiceText,
        intent: 'PROCESSING',
        parameters: JSON.stringify({}),
        success: false,
        processingTime: 0,
      },
    });

    // Process with Grok
    const grokResponse = await callGrokAPI(voiceText);
    const toolCall = grokResponse.choices[0].message.tool_calls?.[0];

    if (!toolCall) {
      throw new Error('No tool call generated');
    }

    // Safely parse function arguments
    let parsedArgs;
    try {
      parsedArgs = JSON.parse(toolCall.function.arguments);
    } catch (error) {
      console.error('Error parsing function arguments:', error);
      throw new Error('Invalid function arguments format');
    }

    // Log the AI tool call
    const aiFunctionCall = await prisma.aIFunctionCall.create({
      data: {
        name: toolCall.function.name,
        parameters: JSON.stringify(parsedArgs),
        processingTime: Date.now() - startTime,
      },
    });

    // Execute the function
    let result;
    if (toolCall.function.name === 'addTransaction') {
      const category = await prisma.category.upsert({
        where: { name: parsedArgs.category },
        create: { name: parsedArgs.category },
        update: {},
      });

      result = await prisma.transaction.create({
        data: {
          amount: parsedArgs.amount,
          type: parsedArgs.type,
          description: parsedArgs.description,
          categoryId: category.id,
          tags: JSON.stringify(parsedArgs.tags || []),
          aiAnalysis: JSON.stringify({
            sentiment: grokResponse.choices[0].message.content || '',
            confidence: grokResponse.choices[0].message.score || 1.0,
            suggestions: grokResponse.choices[0].message.suggestions || []
          })
        },
      });
    } else if (toolCall.function.name === 'createGoal') {
      result = await prisma.goal.create({
        data: {
          name: parsedArgs.name,
          targetAmount: parsedArgs.targetAmount,
          deadline: parsedArgs.deadline ? new Date(parsedArgs.deadline) : null,
          status: 'IN_PROGRESS',
          aiSuggestions: JSON.stringify({
            recommendations: grokResponse.choices[0].message.suggestions || [],
            timeline: grokResponse.choices[0].message.timeline || {},
            strategy: grokResponse.choices[0].message.strategy || ''
          })
        },
      });
    } else if (toolCall.function.name === 'updateTransaction') {
      const updateData: any = {};
      if (parsedArgs.amount !== undefined) updateData.amount = parsedArgs.amount;
      if (parsedArgs.description !== undefined) updateData.description = parsedArgs.description;
      if (parsedArgs.type !== undefined) updateData.type = parsedArgs.type;
      if (parsedArgs.tags !== undefined) updateData.tags = JSON.stringify(parsedArgs.tags);
      if (parsedArgs.category !== undefined) {
        const category = await prisma.category.upsert({
          where: { name: parsedArgs.category },
          create: { name: parsedArgs.category },
          update: {},
        });
        updateData.categoryId = category.id;
      }
      result = await prisma.transaction.update({
        where: { id: parsedArgs.id },
        data: updateData,
      });
    } else if (toolCall.function.name === 'deleteTransaction') {
      result = await prisma.transaction.delete({
        where: { id: parsedArgs.id },
      });
    } else if (toolCall.function.name === 'updateGoal') {
      const updateData: any = {};
      if (parsedArgs.name !== undefined) updateData.name = parsedArgs.name;
      if (parsedArgs.targetAmount !== undefined) updateData.targetAmount = parsedArgs.targetAmount;
      if (parsedArgs.deadline !== undefined) updateData.deadline = new Date(parsedArgs.deadline);
      if (parsedArgs.status !== undefined) updateData.status = parsedArgs.status;
      result = await prisma.goal.update({
        where: { id: parsedArgs.id },
        data: updateData,
      });
    } else if (toolCall.function.name === 'deleteGoal') {
      result = await prisma.goal.delete({
        where: { id: parsedArgs.id },
      });
    }

    // Update the function call with the result
    await prisma.aIFunctionCall.update({
      where: { id: aiFunctionCall.id },
      data: { 
        result: JSON.stringify(result || {}),
      },
    });

    // Update the voice command status
    await prisma.voiceCommand.update({
      where: { id: voiceCommand.id },
      data: {
        intent: toolCall.function.name,
        parameters: JSON.stringify(parsedArgs),
        success: true,
        processingTime: Date.now() - startTime,
      },
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Error processing voice command:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process voice command' },
      { status: 500 }
    );
  }
} 