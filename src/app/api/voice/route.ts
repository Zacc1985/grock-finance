import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

// Grok API configuration
const GROK_API_URL = process.env.GROK_API_URL;
const GROK_API_KEY = process.env.GROK_API_KEY;

if (!GROK_API_URL || !GROK_API_KEY) {
  throw new Error('Missing required environment variables for Grok API');
}

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
];

async function callGrokAPI(voiceText: string) {
  try {
    const response = await axios.post(
      GROK_API_URL,
      {
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
        functions,
        function_call: 'auto',
      },
      {
        headers: {
          'Authorization': `Bearer ${GROK_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error calling Grok API:', error);
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
        parameters: {},
        success: false,
        processingTime: 0,
      },
    });

    // Process with Grok
    const grokResponse = await callGrokAPI(voiceText);
    const functionCall = grokResponse.choices[0].message.function_call;

    if (!functionCall) {
      throw new Error('No function call generated');
    }

    // Log the AI function call
    const aiFunctionCall = await prisma.aIFunctionCall.create({
      data: {
        name: functionCall.name,
        parameters: JSON.parse(functionCall.arguments),
        processingTime: Date.now() - startTime,
      },
    });

    // Execute the function
    let result;
    if (functionCall.name === 'addTransaction') {
      const params = JSON.parse(functionCall.arguments);
      const category = await prisma.category.upsert({
        where: { name: params.category },
        create: { name: params.category },
        update: {},
      });

      result = await prisma.transaction.create({
        data: {
          amount: params.amount,
          type: params.type,
          description: params.description,
          categoryId: category.id,
          tags: params.tags || [],
          // Add Grok's analysis of the transaction
          aiAnalysis: {
            sentiment: grokResponse.choices[0].message.content,
            confidence: grokResponse.choices[0].message.score || 1.0,
            suggestions: grokResponse.choices[0].message.suggestions || []
          }
        },
      });
    } else if (functionCall.name === 'createGoal') {
      const params = JSON.parse(functionCall.arguments);
      result = await prisma.goal.create({
        data: {
          name: params.name,
          targetAmount: params.targetAmount,
          deadline: params.deadline ? new Date(params.deadline) : null,
          status: 'IN_PROGRESS',
          // Add Grok's suggestions for achieving the goal
          aiSuggestions: {
            recommendations: grokResponse.choices[0].message.suggestions || [],
            timeline: grokResponse.choices[0].message.timeline || {},
            strategy: grokResponse.choices[0].message.strategy || ''
          }
        },
      });
    }

    // Update the function call with the result
    await prisma.aIFunctionCall.update({
      where: { id: aiFunctionCall.id },
      data: { 
        result: result || {},
        // Store Grok's specific insights
        aiAnalysis: {
          rawResponse: grokResponse.choices[0].message,
          confidence: grokResponse.choices[0].message.score || 1.0,
          context: grokResponse.choices[0].message.context || {}
        }
      },
    });

    // Update the voice command status
    await prisma.voiceCommand.update({
      where: { id: voiceCommand.id },
      data: {
        intent: functionCall.name,
        parameters: JSON.parse(functionCall.arguments),
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