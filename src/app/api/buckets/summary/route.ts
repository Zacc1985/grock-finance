import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MONTHLY_INCOME = 3000;
const BUCKET_TARGETS = {
  NEED: 0.5,    // 50%
  WANT: 0.3,    // 30%
  SAVING: 0.2,  // 20%
};

function getPeriodDates(period: string) {
  const now = new Date();
  if (period === 'month') {
    return [
      new Date(now.getFullYear(), now.getMonth(), 1),
      new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    ];
  } else if (period === 'week') {
    const first = new Date(now);
    first.setDate(now.getDate() - now.getDay());
    const last = new Date(first);
    last.setDate(first.getDate() + 6);
    last.setHours(23, 59, 59, 999);
    return [first, last];
  }
  // Default to month
  return [
    new Date(now.getFullYear(), now.getMonth(), 1),
    new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
  ];
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || 'month';
  const [firstDay, lastDay] = getPeriodDates(period);

  // Get totals for each bucket
  const buckets = ['NEED', 'WANT', 'SAVING'];
  const totals: Record<string, number> = {};
  const alerts: string[] = [];
  const suggestions: string[] = [];

  for (const bucket of buckets) {
    const sum = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        bucket: { equals: bucket },
        date: {
          gte: firstDay,
          lte: lastDay,
        },
      },
    });
    totals[bucket] = (sum._sum && sum._sum.amount) ? sum._sum.amount : 0;
  }

  // Calculate allowed and remaining for each bucket
  const summary = buckets.map((bucket) => {
    const allowed = MONTHLY_INCOME * BUCKET_TARGETS[bucket as keyof typeof BUCKET_TARGETS];
    const spent = totals[bucket];
    const remaining = allowed - spent;
    // Alerts and suggestions
    if (spent > allowed) {
      alerts.push(`You are over your ${bucket} budget by $${(spent - allowed).toFixed(2)}!`);
      suggestions.push(`Try to reduce your ${bucket.toLowerCase()} spending next week.`);
    } else if (spent > allowed * 0.9) {
      alerts.push(`You are close to your ${bucket} budget.`);
    }
    return {
      bucket,
      allowed,
      spent,
      remaining,
    };
  });

  // Category breakdown
  const categories = await prisma.category.findMany({
    include: {
      transactions: {
        where: {
          date: {
            gte: firstDay,
            lte: lastDay,
          },
        },
      },
    },
  });
  const categoryBreakdown = categories.map((cat) => ({
    name: cat.name,
    total: cat.transactions.reduce((sum, t) => sum + t.amount, 0),
    bucket: cat.transactions[0]?.bucket || '',
  })).filter((c) => c.total > 0);

  // Monthly/weekly report
  const report = {
    period,
    totalSpent: summary.reduce((sum, b) => sum + b.spent, 0),
    totalSaved: summary.find((b) => b.bucket === 'SAVING')?.spent || 0,
    summary,
    categoryBreakdown,
    alerts,
    suggestions,
  };

  return NextResponse.json(report);
} 