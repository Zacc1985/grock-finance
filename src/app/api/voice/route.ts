import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

// Grok API configuration
const GROK_API_URL = process.env.GROK_API_URL;
const GROK_API_KEY = process.env.GROK_API_KEY;
const GROK_MODEL = process.env.GROK_MODEL || 'grok-3-mini-beta';

if (!GROK_API_URL || !GROK_API_KEY) {
  throw new Error('Missing required environment variables for Grok API');
}

// Define tools for Grok API
const tools = [
  {
    type: 'function',
    function: {
      name: 'addTransaction',
      description: 'Add a new transaction to track spending or income',
      parameters: {
        type: 'object',
        properties: {
          amount: {
            type: 'number',
            description: 'The amount of money involved in the transaction'
          },
          type: {
            type: 'string',
            enum: ['INCOME', 'EXPENSE'],
            description: 'Whether this is income or an expense'
          },
          description: {
            type: 'string',
            description: 'Description of the transaction'
          },
          category: {
            type: 'string',
            description: 'Category of the transaction (e.g., food, transport, salary)'
          },
          bucket: {
            type: 'string',
            enum: ['NEED', 'WANT', 'SAVING'],
            description: 'Which 50/30/20 bucket this transaction belongs to'
          }
        },
        required: ['amount', 'type', 'description', 'category', 'bucket']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'createGoal',
      description: 'Create a new financial goal',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the financial goal'
          },
          targetAmount: {
            type: 'number',
            description: 'Target amount to save or achieve'
          }
        },
        required: ['name', 'targetAmount']
      }
    }
  }
];

async function callGrokAPI(voiceText: string) {
  try {
    const response = await axios.post(
      GROK_API_URL,
      {
        model: GROK_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a financial assistant. Convert voice commands into function calls.'
          },
          {
            role: 'user',
            content: voiceText
          }
        ],
        tools: tools,
        tool_choice: 'auto'
      },
      {
        headers: {
          'Authorization': `Bearer ${GROK_API_KEY}`,
          'Content-Type': 'application/json'
        }
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
        parameters: JSON.stringify({}),
        success: false,
        processingTime: 0
      }
    });

    // Process with Grok
    const grokResponse = await callGrokAPI(voiceText);
    const toolCall = grokResponse.choices[0].message.tool_calls?.[0];

    if (!toolCall) {
      throw new Error('No tool call generated');
    }

    // Parse function arguments
    const args = JSON.parse(toolCall.function.arguments);

    // Execute the function
    let result;
    let message = '';
    if (toolCall.function.name === 'addTransaction') {
      const category = await prisma.category.upsert({
        where: { name: args.category },
        create: { name: args.category },
        update: {}
      });

      result = await prisma.transaction.create({
        data: {
          amount: args.amount,
          type: args.type,
          description: args.description,
          categoryId: category.id,
          bucket: args.bucket,
          tags: JSON.stringify([]),
          aiAnalysis: JSON.stringify({
            sentiment: 'positive',
            confidence: 1.0,
            suggestions: []
          })
        }
      });
      message = `Expense for ${args.description} added to ${args.category} category as a ${args.bucket}!`;
    } else if (toolCall.function.name === 'createGoal') {
      result = await prisma.goal.create({
        data: {
          name: args.name,
          targetAmount: args.targetAmount,
          status: 'IN_PROGRESS',
          aiSuggestions: JSON.stringify({
            recommendations: [],
            timeline: {},
            strategy: ''
          })
        }
      });
      message = `Savings goal "${args.name}" for $${args.targetAmount} created!`;
    }

    // Update the voice command status
    await prisma.voiceCommand.update({
      where: { id: voiceCommand.id },
      data: {
        intent: toolCall.function.name,
        parameters: JSON.stringify(args),
        success: true,
        processingTime: Date.now() - startTime
      }
    });

    return NextResponse.json({ success: true, result, message });
  } catch (error) {
    console.error('Error processing voice command:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process voice command' },
      { status: 500 }
    );
  }
} 