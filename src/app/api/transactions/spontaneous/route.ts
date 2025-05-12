import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { amount, description, categoryId } = await req.json();

    // 1. Create the spontaneous transaction
    const transaction = await prisma.transaction.create({
      data: {
        amount,
        description,
        categoryId,
        date: new Date(),
        type: 'EXPENSE',
        bucket: 'WANT',  // Spontaneous spending is always a WANT
        tags: JSON.stringify(['spontaneous']),
      },
      include: {
        category: true,
      },
    });

    // 2. Get current month's spending in WANT bucket
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const wantSpending = await prisma.transaction.aggregate({
      where: {
        bucket: 'WANT',
        date: {
          gte: firstDay,
          lte: lastDay,
        },
      },
      _sum: {
        amount: true,
      },
    });

    // 3. Calculate impact
    const monthlyIncome = 3000; // You might want to make this dynamic
    const wantBudget = monthlyIncome * 0.3; // 30% of income for wants
    const totalWantSpent = wantSpending._sum.amount || 0;
    const remainingWantBudget = wantBudget - totalWantSpent;

    // 4. Get category breakdown for WANT bucket
    const categoryBreakdown = await prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        bucket: 'WANT',
        date: {
          gte: firstDay,
          lte: lastDay,
        },
      },
      _sum: {
        amount: true,
      },
    });

    // 5. Get category names
    const categories = await prisma.category.findMany({
      where: {
        id: {
          in: categoryBreakdown.map(c => c.categoryId),
        },
      },
    });

    const categoryDetails = categoryBreakdown.map(cat => {
      const category = categories.find(c => c.id === cat.categoryId);
      return {
        category: category?.name || 'Unknown',
        spent: cat._sum.amount || 0,
      };
    });

    // 6. Prepare response with impact analysis
    const response = {
      transaction,
      impact: {
        totalWantSpent,
        wantBudget,
        remainingWantBudget,
        categoryBreakdown: categoryDetails,
        message: remainingWantBudget < 0 
          ? `This purchase puts you $${Math.abs(remainingWantBudget).toFixed(2)} over your wants budget!`
          : `You have $${remainingWantBudget.toFixed(2)} left in your wants budget this month.`,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error handling spontaneous spending:', error);
    return NextResponse.json(
      { error: 'Failed to process spontaneous spending' },
      { status: 500 }
    );
  }
} 