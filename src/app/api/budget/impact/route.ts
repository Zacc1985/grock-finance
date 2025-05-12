import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get user's monthly income from configuration
async function getMonthlyIncome() {
  try {
    const config = await prisma.userConfig.findFirst({
      where: { key: 'monthly_income' }
    });
    return config ? parseFloat(config.value) : 3000; // Default to 3000 if not set
  } catch (error) {
    console.error('Error fetching monthly income:', error);
    return 3000; // Fallback to default
  }
}

export async function GET() {
  try {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Get monthly income
    const monthlyIncome = await getMonthlyIncome();

    // Get all transactions for the current month
    const transactions = await prisma.transaction.findMany({
      where: {
        date: {
          gte: firstDay,
          lte: lastDay,
        },
      },
      include: {
        category: true,
      },
    });

    // Get all goals
    const goals = await prisma.goal.findMany({
      include: {
        category: true,
      },
    });

    // Calculate spending by bucket
    const bucketSpending = transactions.reduce((acc, tx) => {
      if (tx.type === 'EXPENSE') {
        acc[tx.bucket] = (acc[tx.bucket] || 0) + tx.amount;
      }
      return acc;
    }, {} as Record<string, number>);

    // Calculate category spending
    const categorySpending = transactions.reduce((acc, tx) => {
      if (tx.type === 'EXPENSE') {
        const categoryName = tx.category.name;
        acc[categoryName] = (acc[categoryName] || 0) + tx.amount;
      }
      return acc;
    }, {} as Record<string, number>);

    // Monthly income (you might want to make this dynamic)
    const budgetLimits = {
      NEED: monthlyIncome * 0.5,  // 50% for needs
      WANT: monthlyIncome * 0.3,  // 30% for wants
      SAVING: monthlyIncome * 0.2, // 20% for savings
    };

    // Calculate overspending
    const overspending = Object.entries(bucketSpending).reduce((acc, [bucket, spent]) => {
      const limit = budgetLimits[bucket as keyof typeof budgetLimits];
      if (spent > limit) {
        acc[bucket] = spent - limit;
      }
      return acc;
    }, {} as Record<string, number>);

    // Generate coaching message
    const generateCoachingMessage = () => {
      const messages = [];
      
      if (Object.keys(overspending).length > 0) {
        messages.push("💅 Oh honey, we need to talk about your spending habits!");
        
        if (overspending.WANT) {
          messages.push(`You've overspent your wants budget by $${overspending.WANT.toFixed(2)} this month.`);
          const topWants = Object.entries(categorySpending)
            .filter(([_, amount]) => amount > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
          
          if (topWants.length > 0) {
            messages.push("Your biggest splurges were:");
            topWants.forEach(([category, amount]) => {
              messages.push(`- ${category}: $${amount.toFixed(2)}`);
            });
          }
        }

        if (overspending.NEED) {
          messages.push(`\nYour needs spending is $${overspending.NEED.toFixed(2)} over budget.`);
          messages.push("This is serious - these are your essential expenses!");
        }

        // Impact on goals
        const totalOverspending = Object.values(overspending).reduce((a, b) => a + b, 0);
        goals.forEach(goal => {
          const monthlyContribution = (goal.targetAmount - goal.currentAmount) / 
            (Math.ceil((new Date(goal.deadline!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)));
          
          if (totalOverspending > monthlyContribution) {
            messages.push(`\nThis overspending is delaying your "${goal.name}" goal by ${Math.ceil(totalOverspending / monthlyContribution)} months!`);
          }
        });

        // Add tough love
        messages.push("\n💅 Here's what you need to do:");
        if (overspending.WANT) {
          messages.push("1. Take a deep breath and step away from that shopping cart");
          messages.push("2. Review your last 3 spontaneous purchases - were they worth it?");
          messages.push("3. Set a 24-hour cooling period for any purchase over $50");
        }
        if (overspending.NEED) {
          messages.push("4. Time to audit your recurring expenses - what can you cut?");
          messages.push("5. Consider if any 'needs' are actually 'wants' in disguise");
        }
      } else {
        messages.push("💅 Slay queen! You're staying within your budget!");
        messages.push("Keep up the good work and watch those goals get closer!");
      }

      return messages.join('\n');
    };

    return NextResponse.json({
      bucketSpending,
      categorySpending,
      budgetLimits,
      overspending,
      coachingMessage: generateCoachingMessage(),
      goals: goals.map(goal => ({
        ...goal,
        monthlyRequired: (goal.targetAmount - goal.currentAmount) / 
          (Math.ceil((new Date(goal.deadline!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30))),
      })),
    });
  } catch (error) {
    console.error('Error analyzing budget impact:', error);
    return NextResponse.json(
      { error: 'Failed to analyze budget impact' },
      { status: 500 }
    );
  }
} 