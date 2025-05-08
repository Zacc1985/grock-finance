import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { lookupPrice, analyzeSpendingPattern } from '@/lib/priceLookup';
import FormData from 'form-data';

const prisma = new PrismaClient();

// API configuration
const GROK_API_URL = process.env.GROK_API_URL;
const GROK_API_KEY = process.env.GROK_API_KEY;
const GROK_MODEL = process.env.GROK_MODEL || 'grok-3-mini-beta';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

if (!GROK_API_URL || !GROK_API_KEY) {
  throw new Error('Missing required environment variables for Grok API');
}

// Function to convert audio to text using OpenAI Whisper (Node.js compatible, with contentType and error logging)
async function convertAudioToText(audioData: Buffer): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error('Missing OpenAI API key');
  const formData = new FormData();
  formData.append('file', audioData, { filename: 'audio.webm', contentType: 'audio/webm' });
  formData.append('model', 'whisper-1');
  formData.append('language', 'en');

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          ...formData.getHeaders()
        },
      }
    );
    return response.data.text;
  } catch (error: any) {
    console.error('OpenAI Whisper API error:', error.response?.data || error.message);
    throw new Error('Failed to convert audio to text');
  }
}

// Function to get budget status for a category
async function getBudgetStatus(categoryId: string, period: 'day' | 'week' | 'month' = 'month'): Promise<{
  spent: number;
  budget: number;
  remaining: number;
  percentage: number;
}> {
  const now = new Date();
  let startDate = new Date();
  
  // Set start date based on period
  if (period === 'day') {
    startDate.setHours(0, 0, 0, 0);
  } else if (period === 'week') {
    startDate.setDate(now.getDate() - 7);
  } else if (period === 'month') {
    startDate.setDate(1);
  }

  // Get category budget
  const category = await prisma.category.findUnique({
    where: { id: categoryId }
  });

  const budget = category?.budget || 0;

  // Get total spent in period
  const spent = await prisma.transaction.aggregate({
    where: {
      categoryId,
      date: { gte: startDate },
      type: 'EXPENSE'
    },
    _sum: {
      amount: true
    }
  });

  const totalSpent = spent._sum.amount || 0;
  const remaining = budget - totalSpent;
  const percentage = budget > 0 ? (totalSpent / budget) * 100 : 0;

  return {
    spent: totalSpent,
    budget,
    remaining,
    percentage
  };
}

// Enhanced Grok API configuration with better natural language understanding
const tools = [
  {
    type: 'function',
    function: {
      name: 'addTransaction',
      description: 'Add a new transaction to track spending or income. Understands casual inputs like "I bought a #7 from McDonald\'s" or "Spent $20 on gas"',
      parameters: {
        type: 'object',
        properties: {
          amount: {
            type: 'number',
            description: 'The amount of money involved in the transaction. If not specified, try to look up common prices (e.g., McDonald\'s #7 is typically $7.50)'
          },
          type: {
            type: 'string',
            enum: ['INCOME', 'EXPENSE'],
            description: 'Whether this is income or an expense. Default to EXPENSE for casual spending mentions'
          },
          description: {
            type: 'string',
            description: 'Description of the transaction. For casual inputs, expand abbreviations (e.g., "McD\'s" to "McDonald\'s")'
          },
          category: {
            type: 'string',
            description: 'Category of the transaction. For casual inputs, infer from context (e.g., "McDonald\'s" → "Dining", "gas" → "Transport")'
          },
          bucket: {
            type: 'string',
            enum: ['NEED', 'WANT', 'SAVING'],
            description: 'Which 50/30/20 bucket this transaction belongs to. Infer from context (e.g., "groceries" → NEED, "movie" → WANT)'
          },
          date: {
            type: 'string',
            description: 'Date of the transaction. Default to today if not specified'
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
  },
  {
    type: 'function',
    function: {
      name: 'listTransactions',
      description: 'List transactions by date, category, or bucket',
      parameters: {
        type: 'object',
        properties: {
          startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)', nullable: true },
          endDate: { type: 'string', description: 'End date (YYYY-MM-DD)', nullable: true },
          category: { type: 'string', description: 'Category name', nullable: true },
          bucket: { type: 'string', description: 'Bucket (NEED, WANT, SAVING)', nullable: true },
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'summarizeSpending',
      description: 'Summarize spending by week, month, category, or bucket',
      parameters: {
        type: 'object',
        properties: {
          period: { type: 'string', description: 'Period (week, month)', nullable: true },
          category: { type: 'string', description: 'Category name', nullable: true },
          bucket: { type: 'string', description: 'Bucket (NEED, WANT, SAVING)', nullable: true },
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'updateGoal',
      description: 'Update a financial goal (change target, mark as complete, add progress)',
      parameters: {
        type: 'object',
        properties: {
          goalId: { type: 'string', description: 'Goal ID' },
          name: { type: 'string', description: 'New name', nullable: true },
          targetAmount: { type: 'number', description: 'New target amount', nullable: true },
          status: { type: 'string', description: 'New status (IN_PROGRESS, COMPLETED, FAILED)', nullable: true },
          addAmount: { type: 'number', description: 'Add this amount to current progress', nullable: true },
        },
        required: ['goalId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'deleteTransaction',
      description: 'Delete a transaction by ID',
      parameters: {
        type: 'object',
        properties: {
          transactionId: { type: 'string', description: 'Transaction ID' },
        },
        required: ['transactionId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'deleteGoal',
      description: 'Delete a goal by ID',
      parameters: {
        type: 'object',
        properties: {
          goalId: { type: 'string', description: 'Goal ID' },
        },
        required: ['goalId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getBudgetStatus',
      description: 'Get the current budget status for each bucket',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'listGoals',
      description: 'List all financial goals',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getHelp',
      description: 'Get help on what commands you can use',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'setCategoryBudget',
      description: 'Set or update the budget for a category',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Category name' },
          budget: { type: 'number', description: 'Budget amount' },
        },
        required: ['category', 'budget']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getFinancialTip',
      description: 'Get a random financial tip',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'showRecentActivity',
      description: 'Show recent financial activity',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'showGoalProgress',
      description: 'Show progress toward a specific goal',
      parameters: {
        type: 'object',
        properties: {
          goalId: { type: 'string', description: 'Goal ID' },
        },
        required: ['goalId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'suggestWaysToSave',
      description: 'Suggest ways to save money based on spending patterns',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'showTopSpendingCategories',
      description: 'Show top spending categories for the current month',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'showIncomeVsExpenses',
      description: 'Show income vs. expenses for the current month',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'listCommands',
      description: 'List all commands Grok understands',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'addRecurringExpense',
      description: 'Add a new recurring expense or bill',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name of the expense' },
          amount: { type: 'number', description: 'Amount of the expense' },
          frequency: { type: 'string', enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'], description: 'How often this expense occurs' },
          nextDueDate: { type: 'string', description: 'Next due date (YYYY-MM-DD)' },
          category: { type: 'string', description: 'Category name' },
          bucket: { type: 'string', enum: ['NEED', 'WANT', 'SAVING'], description: 'Which 50/30/20 bucket this belongs to' },
          isAutomatic: { type: 'boolean', description: 'Whether this is an automatic payment' }
        },
        required: ['name', 'amount', 'frequency', 'nextDueDate', 'category', 'bucket']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getUpcomingExpenses',
      description: 'Get a list of upcoming expenses and bills',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'number', description: 'Number of days to look ahead', nullable: true }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getBudgetForecast',
      description: 'Get a forecast of your budget based on upcoming expenses',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'number', description: 'Number of days to forecast', nullable: true }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'setExpenseReminder',
      description: 'Set a reminder for an upcoming expense',
      parameters: {
        type: 'object',
        properties: {
          expenseId: { type: 'string', description: 'ID of the recurring expense' },
          daysBefore: { type: 'number', description: 'How many days before to remind' }
        },
        required: ['expenseId', 'daysBefore']
      }
    }
  }
];

// Enhanced Grok API call with better context and personality
async function callGrokAPI(voiceText: string) {
  try {
    console.log('Calling Grok API with text:', voiceText);
    
    const response = await axios.post(
      GROK_API_URL,
      {
        model: GROK_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are a friendly, conversational financial assistant. When processing transactions:
            1. Understand casual language and common abbreviations
            2. Look up common prices for known items (e.g., McDonald's #7 = $7.50)
            3. Infer categories and buckets from context
            4. Respond conversationally, like a friend helping with finances
            5. Add helpful insights or gentle reminders about spending patterns
            6. If information is missing, ask follow-up questions naturally
            
            Example inputs and responses:
            User: "I bought a #7 from McDonald's"
            Assistant: "Got it! I've logged $7.50 for your McDonald's #7 combo. That's your third fast food meal this week - maybe we should look at some home cooking options? 😊"
            
            User: "Spent $20 on gas"
            Assistant: "Added your $20 gas expense to the NEED bucket. Your fuel spending is actually down 15% from last month - great job! 🚗"
            
            User: "Bought a new game for $60"
            Assistant: "Logged your $60 game purchase in the WANT bucket. That's a bit higher than your usual entertainment spending - everything okay with the budget? 🎮"`
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
    console.log('Grok API response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error: any) {
    console.error('Error calling Grok API:', error.response?.data || error.message);
    throw error;
  }
}

// Function to call OpenAI for chat parsing
async function callOpenAI(userInput: string): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error('Missing OpenAI API key');
  const response = await axios.post(
    OPENAI_API_URL,
    {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a budgeting assistant. Your job is to understand casual spending inputs and turn them into structured commands for an API. For example:
- Input: "I bought a #7 from McDonald's today" → Output: { "function": "add_expense", "amount": 7.50, "category": "food", "date": "2023-10-17" }
- Input: "I spent $20 on gas yesterday" → Output: { "function": "add_expense", "amount": 20, "category": "transport", "date": "2023-10-16" }
If details are missing, assume common prices or ask for clarification. Respond in a fun, conversational tone with some random commentary.`
        },
        { role: 'user', content: userInput }
      ],
      temperature: 0.7
    },
    {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data.choices[0].message.content;
}

// Enhanced transaction processing with budget tracking
async function processTransaction(amount: number, description: string, category: string, bucket: string, type: string = 'EXPENSE') {
  try {
    // Look up price and details if not provided
    const priceInfo = lookupPrice(description);
    if (priceInfo && !amount) {
      amount = priceInfo.price;
      category = priceInfo.category;
      bucket = priceInfo.bucket;
    }

    // Get recent transactions for pattern analysis
    const recentTransactions = await prisma.transaction.findMany({
      where: {
        date: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    // First, ensure the category exists
    const categoryRecord = await prisma.category.upsert({
      where: { name: category },
      update: {},
      create: {
        name: category,
        budget: 0 // Optional, but good to have a default
      }
    });

    // Add the new transaction
    const transaction = await prisma.transaction.create({
      data: {
        amount,
        description,
        categoryId: categoryRecord.id,
        type,
        bucket,
        date: new Date(),
        tags: '[]' // Default empty tags array as JSON string
      }
    });

    // Get budget status
    const budgetStatus = await getBudgetStatus(categoryRecord.id);

    // Analyze spending patterns
    const patterns = analyzeSpendingPattern([...recentTransactions, transaction]);

    // Generate a conversational response with budget info
    let response = `Got it! I've logged $${amount.toFixed(2)} for ${description} in the ${bucket} bucket.`;
    
    // Add budget status
    if (budgetStatus.budget > 0) {
      response += `\nBudget Status for ${category}:`;
      response += `\n- Spent: $${budgetStatus.spent.toFixed(2)}`;
      response += `\n- Budget: $${budgetStatus.budget.toFixed(2)}`;
      response += `\n- Remaining: $${budgetStatus.remaining.toFixed(2)}`;
      
      // Add budget warnings or encouragement
      if (budgetStatus.percentage >= 90) {
        response += `\n⚠️ You're at ${budgetStatus.percentage.toFixed(1)}% of your budget for ${category}!`;
      } else if (budgetStatus.percentage >= 75) {
        response += `\n⚠️ You're at ${budgetStatus.percentage.toFixed(1)}% of your budget for ${category}.`;
      } else if (budgetStatus.remaining > 0) {
        response += `\n✅ You're doing great with your ${category} budget!`;
      }
    }

    // Add spending patterns
    if (patterns) {
      response += `\n${patterns}`;
    }

    // Add some personality based on the transaction and budget
    if (bucket === 'WANT' && amount > 50) {
      response += `\nThat's a bit of a splurge - everything okay with the budget? 😊`;
    } else if (bucket === 'NEED' && amount < 20) {
      response += `\nNice job keeping your essential spending low! 💪`;
    }

    return { transaction, response };
  } catch (error) {
    console.error('Error processing transaction:', error);
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    // Get the audio data from the request
    const audioData = await req.arrayBuffer();
    if (!audioData || audioData.byteLength === 0) {
      return NextResponse.json(
        { error: 'No audio data provided' },
        { status: 400 }
      );
    }

    // Convert audio to text (using Grok or your existing method)
    const voiceText = await convertAudioToText(Buffer.from(audioData));
    if (!voiceText) {
      return NextResponse.json(
        { error: 'Failed to convert audio to text' },
        { status: 400 }
      );
    }

    // Use OpenAI to parse the text and get a structured command
    const openAIResponse = await callOpenAI(voiceText);
    let structuredCommand;
    try {
      structuredCommand = JSON.parse(openAIResponse);
    } catch (e) {
      // If OpenAI didn't return valid JSON, just return the text
      return NextResponse.json({ message: openAIResponse });
    }

    // Now pass the structured command to your Grok logic (simulate tool call)
    // For example, if function is add_expense, call your addTransaction logic
    let result;
    let message = '';
    if (structuredCommand.function === 'add_expense') {
      // Use your existing addTransaction logic here
      const category = await prisma.category.upsert({
        where: { name: structuredCommand.category },
        create: { name: structuredCommand.category, budget: 0 },
        update: {}
      });
      result = await prisma.transaction.create({
        data: {
          amount: structuredCommand.amount,
          type: 'EXPENSE',
          description: structuredCommand.description || structuredCommand.category,
          date: structuredCommand.date ? new Date(structuredCommand.date) : new Date(),
          categoryId: category.id,
          bucket: structuredCommand.bucket || 'NEED',
          tags: '[]'
        }
      });
      message = `Transaction for ${structuredCommand.description || structuredCommand.category} added to ${structuredCommand.category} category!`;
    } else if (structuredCommand.function === 'get_spending') {
      // Example: handle get_spending queries
      // You can expand this logic as needed
      message = 'Spending summary feature coming soon!';
      result = {};
    } else {
      // Fallback: just return the OpenAI response
      message = openAIResponse;
      result = {};
    }

    return NextResponse.json({ message, result });
  } catch (error) {
    console.error('Error processing voice command:', error);
    return NextResponse.json(
      { error: 'Failed to process voice command' },
      { status: 500 }
    );
  }
} 