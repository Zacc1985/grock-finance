import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const GROK_API_URL = process.env.GROK_API_URL;
const GROK_API_KEY = process.env.GROK_API_KEY;
const GROK_MODEL = process.env.GROK_MODEL || 'grok-3-mini-beta';

export async function GET() {
  // Get recent transactions (this month)
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const transactions = await prisma.transaction.findMany({
    where: {
      date: {
        gte: firstDay,
        lte: now,
      },
    },
    orderBy: { date: 'desc' },
    take: 50,
    select: {
      amount: true,
      description: true,
      bucket: true,
    },
  });

  // Prepare a prompt for Grok
  const prompt = `Here are the user's recent transactions for this month:\n${transactions.map(t => `- $${t.amount} for ${t.description} (${t.bucket})`).join('\n')}\n\nSummarize the user's spending habits in one sentence. Suggest one way they could save more next month. If possible, predict if they are on track with their 50/30/20 budget.`;

  try {
    const response = await axios.post(
      GROK_API_URL,
      {
        model: GROK_MODEL,
        messages: [
          { role: 'system', content: 'You are a financial assistant.' },
          { role: 'user', content: prompt },
        ],
      },
      {
        headers: {
          'Authorization': `Bearer ${GROK_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const aiMessage = response.data.choices[0].message.content;
    return NextResponse.json({ insight: aiMessage });
  } catch (error) {
    console.error('Error calling Grok for insights:', error);
    return NextResponse.json({ error: 'Failed to get AI insights.' }, { status: 500 });
  }
} 