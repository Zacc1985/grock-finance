import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const key = req.query.key as string;
    if (key) {
      const config = await prisma.userConfig.findUnique({ where: { key } });
      res.status(200).json({ value: config ? config.value : '' });
    } else {
      const configs = await prisma.userConfig.findMany();
      res.status(200).json(configs);
    }
  } else if (req.method === 'POST') {
    const { key, value } = req.body;
    if (!key || value === undefined) {
      res.status(400).json({ error: 'Key and value are required' });
      return;
    }
    if (key === 'monthly_income') {
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue <= 0) {
        res.status(400).json({ error: 'Monthly income must be a positive number' });
        return;
      }
    }
    const config = await prisma.userConfig.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    });
    res.status(200).json(config);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 