import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { lookupPrice, analyzeSpendingPattern } from '@/lib/priceLookup';

const prisma = new PrismaClient();

// API configuration
const GROK_API_URL = process.env.GROK_API_URL;
const GROK_API_KEY = process.env.GROK_API_KEY;
const GROK_MODEL = process.env.GROK_MODEL || 'grok-3-mini-beta';

if (!GROK_API_URL || !GROK_API_KEY) {
  throw new Error('Missing required environment variables for Grok API');
}

// Function to convert audio to text using Grok
async function convertAudioToText(audioData: Buffer): Promise<string> {
  try {
    console.log('Converting audio to text using Grok...');
    
    // Create form data for the audio file
    const formData = new FormData();
    formData.append('file', new Blob([audioData]), 'audio.webm');
    formData.append('model', GROK_MODEL);

    const response = await axios.post(GROK_API_URL, formData, {
      headers: {
        'Authorization': `Bearer ${GROK_API_KEY}`,
        'Content-Type': 'multipart/form-data',
      },
    });

    console.log('Grok response:', response.data);
    return response.data.text;
  } catch (error: any) {
    console.error('Error converting audio to text:', error.response?.data || error.message);
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
      console.error('No audio data provided in request');
      return NextResponse.json(
        { error: 'No audio data provided' },
        { status: 400 }
      );
    }

    // Convert audio to text
    const voiceText = await convertAudioToText(Buffer.from(audioData));
    console.log('Converted voice text:', voiceText);

    if (!voiceText) {
      console.error('Failed to convert audio to text');
      return NextResponse.json(
        { error: 'Failed to convert audio to text' },
        { status: 400 }
      );
    }

    // Process the text with Grok
    const response = await callGrokAPI(voiceText);
    
    // Check if response is valid
    if (!response || typeof response !== 'object') {
      console.error('Invalid response from Grok API:', response);
      return NextResponse.json(
        { error: 'Invalid response from Grok API' },
        { status: 500 }
      );
    }

    // Check if tool_calls exists and has items
    if (!response.tool_calls || !Array.isArray(response.tool_calls) || response.tool_calls.length === 0) {
      console.error('No tool calls in response:', response);
      return NextResponse.json(
        { error: "Sorry, I didn't understand that. Try rephrasing, or ask \"What can you do?\" for help." },
        { status: 400 }
      );
    }

    const toolCall = response.tool_calls[0];
    console.log('Processing tool call:', JSON.stringify(toolCall, null, 2));
    
    // Validate tool call structure
    if (!toolCall || !toolCall.function || !toolCall.function.name || !toolCall.function.arguments) {
      console.error('Invalid tool call structure:', toolCall);
      return NextResponse.json(
        { error: 'Invalid tool call structure from Grok API' },
        { status: 500 }
      );
    }

    // Execute the function
    let result;
    let message = '';
    if (toolCall.function.name === 'addTransaction') {
      const args = JSON.parse(toolCall.function.arguments);
      const category = await prisma.category.upsert({
        where: { name: args.category },
        create: { 
          name: args.category,
          budget: 0
        },
        update: {}
      });

      result = await prisma.transaction.create({
        data: {
          amount: args.amount,
          type: args.type || 'EXPENSE',
          description: args.description,
          date: new Date(),
          categoryId: category.id,
          bucket: args.bucket || 'NEED',
          tags: '[]'
        }
      });
      message = `Transaction for ${args.description} added to ${args.category} category!`;
    } else if (toolCall.function.name === 'createGoal') {
      const args = JSON.parse(toolCall.function.arguments);
      const category = await prisma.category.upsert({
        where: { name: args.category || 'Savings' },
        create: { 
          name: args.category || 'Savings',
          budget: 0
        },
        update: {}
      });

      result = await prisma.goal.create({
        data: {
          name: args.name,
          targetAmount: args.targetAmount,
          currentAmount: 0,
          status: 'IN_PROGRESS',
          categoryId: category.id,
          aiSuggestions: JSON.stringify({
            recommendations: [],
            timeline: {},
            strategy: ''
          })
        }
      });
      message = `Savings goal "${args.name}" for $${args.targetAmount} created!`;
    } else if (toolCall.function.name === 'listTransactions') {
      const args = JSON.parse(toolCall.function.arguments);
      const where: any = {};
      if (args.startDate) where.date = { gte: new Date(args.startDate) };
      if (args.endDate) where.date = { ...(where.date || {}), lte: new Date(args.endDate) };
      if (args.category) where.category = { name: args.category };
      if (args.bucket) where.bucket = args.bucket;
      result = await prisma.transaction.findMany({
        where,
        orderBy: { date: 'desc' },
        take: 20,
        include: { category: true }
      });
      message = `Here are your recent transactions.`;
    } else if (toolCall.function.name === 'summarizeSpending') {
      message = 'Spending summary feature coming soon!';
      result = {};
    } else if (toolCall.function.name === 'updateGoal') {
      const args = JSON.parse(toolCall.function.arguments);
      const updateData: any = {};
      if (args.name) updateData.name = args.name;
      if (args.targetAmount) updateData.targetAmount = args.targetAmount;
      if (args.status) updateData.status = args.status;
      if (args.addAmount) {
        const goal = await prisma.goal.findUnique({ where: { id: args.goalId } });
        updateData.currentAmount = (goal?.currentAmount || 0) + args.addAmount;
      }
      result = await prisma.goal.update({ where: { id: args.goalId }, data: updateData });
      message = `Goal updated!`;
    } else if (toolCall.function.name === 'deleteTransaction') {
      const args = JSON.parse(toolCall.function.arguments);
      await prisma.transaction.delete({ where: { id: args.transactionId } });
      result = { deleted: true };
      message = 'Transaction deleted.';
    } else if (toolCall.function.name === 'deleteGoal') {
      const args = JSON.parse(toolCall.function.arguments);
      await prisma.goal.delete({ where: { id: args.goalId } });
      result = { deleted: true };
      message = 'Goal deleted.';
    } else if (toolCall.function.name === 'getBudgetStatus') {
      message = 'Budget status feature coming soon!';
      result = {};
    } else if (toolCall.function.name === 'listGoals') {
      result = await prisma.goal.findMany({ 
        orderBy: { createdAt: 'desc' },
        include: {
          category: true
        }
      });
      message = 'Here are your goals.';
    } else if (toolCall.function.name === 'getHelp') {
      message = 'You can ask me to add expenses, create goals, list transactions, show budget status, and more!';
      result = {};
    } else if (toolCall.function.name === 'setCategoryBudget') {
      const args = JSON.parse(toolCall.function.arguments);
      result = await prisma.category.update({ where: { name: args.category }, data: { budget: args.budget } });
      message = `Budget for ${args.category} set to $${args.budget}.`;
    } else if (toolCall.function.name === 'getFinancialTip') {
      const tips = [
        'Track your expenses daily to avoid surprises.',
        'Set savings goals and automate transfers.',
        'Review your subscriptions and cancel unused ones.',
        'Try a no-spend challenge for a week.',
        'Cook at home more often to save money.'
      ];
      const tip = tips[Math.floor(Math.random() * tips.length)];
      message = tip;
      result = { tip };
    } else if (toolCall.function.name === 'showRecentActivity') {
      result = await prisma.transaction.findMany({ 
        orderBy: { date: 'desc' }, 
        take: 5, 
        include: { category: true } 
      });
      message = 'Here is your recent activity.';
    } else if (toolCall.function.name === 'showGoalProgress') {
      const args = JSON.parse(toolCall.function.arguments);
      const goal = await prisma.goal.findUnique({ 
        where: { id: args.goalId },
        include: { category: true }
      });
      message = goal ? `Progress for goal ${goal.name}: $${goal.currentAmount} / $${goal.targetAmount}` : 'Goal not found.';
      result = goal;
    } else if (toolCall.function.name === 'suggestWaysToSave') {
      message = 'Try reducing spending in your top categories!';
      result = {};
    } else if (toolCall.function.name === 'showTopSpendingCategories') {
      const txs = await prisma.transaction.findMany({ 
        where: { type: 'EXPENSE' }, 
        include: { category: true } 
      });
      const categoryTotals: Record<string, number> = {};
      txs.forEach(tx => {
        const cat = tx.category.name;
        categoryTotals[cat] = (categoryTotals[cat] || 0) + tx.amount;
      });
      const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).slice(0, 3);
      message = 'Top spending categories this month:';
      result = sorted.map(([cat, amt]) => ({ category: cat, amount: amt }));
    } else if (toolCall.function.name === 'showIncomeVsExpenses') {
      const txs = await prisma.transaction.findMany();
      const income = txs.filter(tx => tx.type === 'INCOME').reduce((sum, tx) => sum + tx.amount, 0);
      const expenses = txs.filter(tx => tx.type === 'EXPENSE').reduce((sum, tx) => sum + tx.amount, 0);
      message = `Income: $${income}, Expenses: $${expenses}`;
      result = { income, expenses };
    } else if (toolCall.function.name === 'listCommands') {
      message = 'Commands: addTransaction, createGoal, listTransactions, summarizeSpending, updateGoal, deleteTransaction, deleteGoal, getBudgetStatus, listGoals, getHelp, setCategoryBudget, getFinancialTip, showRecentActivity, showGoalProgress, suggestWaysToSave, showTopSpendingCategories, showIncomeVsExpenses, listCommands.';
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