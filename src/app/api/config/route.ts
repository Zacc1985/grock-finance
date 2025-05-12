import { NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/config - Get all config values or a specific one
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    if (key) {
      // Get specific config
      const config = await prisma.userConfig.findUnique({
        where: { key },
      });

      if (!config) {
        return NextResponse.json(
          { error: 'Configuration not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(config);
    }

    // Get all configs
    const configs = await prisma.userConfig.findMany();
    return NextResponse.json(configs);
  } catch (error) {
    console.error('Error fetching configuration:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}

// POST /api/config - Create or update a config value
export async function POST(req: Request) {
  try {
    const { key, value } = await req.json();

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Key and value are required' },
        { status: 400 }
      );
    }

    // Validate monthly income if that's what we're setting
    if (key === 'monthly_income') {
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue <= 0) {
        return NextResponse.json(
          { error: 'Monthly income must be a positive number' },
          { status: 400 }
        );
      }
    }

    // Upsert the config (create if doesn't exist, update if it does)
    const config = await prisma.userConfig.upsert({
      where: { key },
      update: { value: String(value) },
      create: {
        key,
        value: String(value),
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error updating configuration:', error);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          return NextResponse.json(
            { error: 'Configuration key already exists' },
            { status: 409 }
          );
        default:
          return NextResponse.json(
            { error: 'Database error occurred' },
            { status: 500 }
          );
      }
    }

    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    );
  }
} 