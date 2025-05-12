import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    // Reset all transactions to 0
    await prisma.transaction.updateMany({
      data: {
        amount: 0,
        aiAnalysis: null
      }
    });

    // Reset all goals to initial state
    await prisma.goal.updateMany({
      data: {
        currentAmount: 0,
        status: 'IN_PROGRESS',
        aiSuggestions: null
      }
    });

    // Reset user config (except monthly income)
    await prisma.userConfig.deleteMany({
      where: {
        NOT: {
          key: 'monthly_income'
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'All budget categories have been reset successfully' 
    });
  } catch (error) {
    console.error('Error resetting budget:', error);
    return NextResponse.json(
      { error: 'Failed to reset budget categories' },
      { status: 500 }
    );
  }
} 