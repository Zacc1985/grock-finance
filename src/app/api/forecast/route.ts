import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    // Get all recurring expenses
    const recurringExpenses = await prisma.recurringExpense.findMany({
      include: {
        category: true
      }
    });

    // Calculate forecast for next 30 days
    const forecast = {
      NEED: 0,
      WANT: 0,
      SAVING: 0
    };

    // Get upcoming expenses for next 30 days
    const today = new Date();
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const upcomingExpenses = recurringExpenses
      .filter(expense => {
        const nextDue = new Date(expense.nextDueDate);
        return nextDue >= today && nextDue <= thirtyDaysFromNow;
      })
      .map(expense => ({
        ...expense,
        nextDueDate: expense.nextDueDate.toISOString()
      }));

    // Calculate forecast amounts
    upcomingExpenses.forEach(expense => {
      forecast[expense.bucket as keyof typeof forecast] += expense.amount;
    });

    return NextResponse.json({
      forecast,
      upcomingExpenses,
      period: '30 days'
    });
  } catch (error) {
    console.error('Error generating forecast:', error);
    return NextResponse.json(
      { error: 'Failed to generate forecast' },
      { status: 500 }
    );
  }
} 