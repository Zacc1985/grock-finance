import { NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        category: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle specific Prisma errors
      switch (error.code) {
        case 'P2002':
          return NextResponse.json(
            { error: 'A unique constraint would be violated' },
            { status: 409 }
          );
        case 'P2025':
          return NextResponse.json(
            { error: 'Record not found' },
            { status: 404 }
          );
        default:
          return NextResponse.json(
            { error: 'Database error occurred' },
            { status: 500 }
          );
      }
    }

    // Handle other types of errors
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
} 