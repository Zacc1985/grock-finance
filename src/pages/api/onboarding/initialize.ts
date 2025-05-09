import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Default categories with suggested budgets
const defaultCategories = [
  { name: 'Housing', budget: 1500 },
  { name: 'Food & Dining', budget: 500 },
  { name: 'Transportation', budget: 300 },
  { name: 'Utilities', budget: 200 },
  { name: 'Entertainment', budget: 200 },
  { name: 'Shopping', budget: 200 },
  { name: 'Healthcare', budget: 150 },
  { name: 'Savings', budget: 500 },
  { name: 'Miscellaneous', budget: 200 },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Create all default categories
    const categories = await Promise.all(
      defaultCategories.map(async (category) => {
        return prisma.category.create({
          data: {
            name: category.name,
            budget: category.budget,
          },
        });
      })
    );

    // Create a default savings goal
    const savingsGoal = await prisma.goal.create({
      data: {
        name: 'Emergency Fund',
        targetAmount: 10000,
        currentAmount: 0,
        status: 'IN_PROGRESS',
        deadline: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      },
    });

    res.status(200).json({
      message: 'Initialization successful',
      data: {
        categories,
        savingsGoal,
      },
    });
  } catch (error) {
    console.error('Error during initialization:', error);
    res.status(500).json({ error: 'Failed to initialize user data' });
  }
} 