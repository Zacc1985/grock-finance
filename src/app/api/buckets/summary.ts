import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MONTHLY_INCOME = 3000;
const BUCKET_TARGETS = {
  NEED: 0.5,    // 50%
  WANT: 0.3,    // 30%
  SAVING: 0.2,  // 20%
};

export async function GET() {
  // Get the first and last day of the current month
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Get totals for each bucket
  const buckets = ['NEED', 'WANT', 'SAVING'];
  const totals: Record<string, number> = {};

  for (const bucket of buckets) {
    const sum = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        bucket,
        date: {
          gte: firstDay,
          lte: lastDay,
        },
      },
    });
    totals[bucket] = sum._sum.amount || 0;
  }

  // Calculate allowed and remaining for each bucket
  const summary = buckets.map((bucket) => {
    const allowed = MONTHLY_INCOME * BUCKET_TARGETS[bucket as keyof typeof BUCKET_TARGETS];
    const spent = totals[bucket];
    const remaining = allowed - spent;
    return {
      bucket,
      allowed,
      spent,
      remaining,
    };
  });

  return NextResponse.json({ summary });
} 