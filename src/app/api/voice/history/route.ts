import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const commands = await prisma.voiceCommand.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Limit to last 50 commands
    });

    return NextResponse.json(commands);
  } catch (error) {
    console.error('Error fetching voice commands:', error);
    return NextResponse.json(
      { error: 'Failed to fetch voice commands' },
      { status: 500 }
    );
  }
} 