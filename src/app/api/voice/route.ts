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

async function callGrokAPI(voiceText: string) {
  try {
    const response = await axios.post(
      GROK_API_URL,
      {
        model: GROK_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are a friendly financial assistant that understands natural language. You can understand casual conversations about money and convert them into appropriate actions. For example:\n\n- \"I just spent $50 on groceries\" → addTransaction\n- \"I want to save up for a new laptop\" → createGoal\n- \"How much did I spend on food this month?\" → summarizeSpending\n- \"Show me my travel expenses from last year\" → summarizeSpending\n- \"Remind me to pay my credit card bill\" → addRecurringExpense\n- \"How much money do I have left this month?\" → getBudgetStatus\n- \"What are my top spending categories?\" → showTopSpendingCategories\n- \"Give me a financial tip\" → getFinancialTip\n- \"Show my recent activity\" → showRecentActivity\n- \"List all my goals\" → listGoals\n- \"Delete my last transaction\" → deleteTransaction\n- \"Update my savings goal for a new car\" → updateGoal\n\nConvert the user's natural language into the appropriate function calls. If you are unsure, return a help message or suggest the user ask for help.`
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
    if (!voiceText) {
      return NextResponse.json(
        { error: 'No voice text provided' },
        { status: 400 }
      );
    }

    const response = await callGrokAPI(voiceText);
    
    // Check if response is valid
    if (!response || typeof response !== 'object') {
      return NextResponse.json(
        { error: 'Invalid response from Grok API' },
        { status: 500 }
      );
    }

    // Check if tool_calls exists and has items
    if (!response.tool_calls || !Array.isArray(response.tool_calls) || response.tool_calls.length === 0) {
      return NextResponse.json(
        { error: 'Sorry, I didn't understand that. Try rephrasing, or ask "What can you do?" for help.' },
        { status: 400 }
      );
    }

    const toolCall = response.tool_calls[0];
    
    // Validate tool call structure
    if (!toolCall || !toolCall.function || !toolCall.function.name || !toolCall.function.arguments) {
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
          type: 'SAVING'
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
          type: 'SAVING'
        },
        update: {}
      });

      result = await prisma.goal.create({
        data: {
          name: args.name,
          targetAmount: args.targetAmount,
          currentAmount: 0,
          status: 'IN_PROGRESS',
          category: {
            connect: {
              id: category.id
            }
          },
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
        include: { category: true }
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