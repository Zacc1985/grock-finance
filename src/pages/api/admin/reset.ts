import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    // Delete all data in the correct order to avoid foreign key issues
    await prisma.transaction.deleteMany({});
    await prisma.goal.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.voiceCommand.deleteMany({});
    await prisma.aIFunctionCall.deleteMany({});
    res.status(200).json({ message: 'All data reset successfully.' });
  } catch (error) {
    console.error('Error resetting data:', error);
    res.status(500).json({ error: 'Failed to reset data.' });
  }
} 