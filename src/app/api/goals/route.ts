import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const goals = await prisma.goal.findMany({
      include: {
        transactions: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate current amount for each goal based on associated transactions
    const goalsWithProgress = goals.map(goal => ({
      ...goal,
      currentAmount: goal.transactions.reduce((sum, tx) => {
        if (tx.type === 'EXPENSE') {
          return sum - tx.amount;
        }
        return sum + tx.amount;
      }, 0),
    }));

    return NextResponse.json(goalsWithProgress);
  } catch (error) {
    console.error('Error fetching goals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goals' },
      { status: 500 }
    );
  }
} 