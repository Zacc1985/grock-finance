import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { lookupPrice, analyzeSpendingPattern } from '@/lib/priceLookup';
import FormData from 'form-data';

const prisma = new PrismaClient();

export const config = {
  api: {
    bodyParser: false,
  },
};

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function convertAudioToText(audioData: Buffer): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error('Missing OpenAI API key');
  const formData = new FormData();
  formData.append('file', audioData, { filename: 'audio.webm', contentType: 'audio/webm' });
  formData.append('model', 'whisper-1');
  formData.append('language', 'en');
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          ...formData.getHeaders()
        },
      }
    );
    return response.data.text;
  } catch (error: any) {
    console.error('OpenAI Whisper API error:', error.response?.data || error.message);
    throw new Error('Failed to convert audio to text');
  }
}

async function callOpenAI(userInput: string): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error('Missing OpenAI API key');
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a budgeting assistant. Your job is to understand casual spending inputs and turn them into structured commands for an API. For example:\n- Input: "I bought a #7 from McDonald's today" → Output: { "function": "add_expense", "amount": 7.50, "category": "food", "date": "2023-10-17" }\n- Input: "I spent $20 on gas yesterday" → Output: { "function": "add_expense", "amount": 20, "category": "transport", "date": "2023-10-16" }\nIf details are missing, assume common prices or ask for clarification. Respond in a fun, conversational tone with some random commentary.`
        },
        { role: 'user', content: userInput }
      ],
      temperature: 0.7
    },
    {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data.choices[0].message.content;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const form = formidable({ multiples: false });
  form.parse(req, async (err, fields, files) => {
    if (err) {
      res.status(500).json({ error: 'Error parsing form data' });
      return;
    }
    let file = files.file;
    let typedFile: formidable.File | undefined;
    if (Array.isArray(file)) {
      typedFile = file[0] as unknown as formidable.File;
    } else {
      typedFile = file as unknown as formidable.File;
    }
    if (!typedFile || typeof typedFile.filepath !== 'string') {
      res.status(400).json({ error: 'No audio file provided' });
      return;
    }
    try {
      const audioBuffer = await fs.promises.readFile(typedFile.filepath);
      const voiceText = await convertAudioToText(audioBuffer);
      if (!voiceText) {
        res.status(400).json({ error: 'Failed to convert audio to text' });
        return;
      }
      const openAIResponse = await callOpenAI(voiceText);
      let structuredCommand;
      try {
        structuredCommand = JSON.parse(openAIResponse);
      } catch (e) {
        res.status(200).json({ message: openAIResponse });
        return;
      }
      let result;
      let message = '';
      if (structuredCommand.function === 'add_expense') {
        const category = await prisma.category.upsert({
          where: { name: structuredCommand.category },
          create: { name: structuredCommand.category, budget: 0 },
          update: {}
        });
        result = await prisma.transaction.create({
          data: {
            amount: structuredCommand.amount,
            type: 'EXPENSE',
            description: structuredCommand.description || structuredCommand.category,
            date: structuredCommand.date ? new Date(structuredCommand.date) : new Date(),
            categoryId: category.id,
            bucket: structuredCommand.bucket || 'NEED',
            tags: '[]'
          }
        });
        message = `Transaction for ${structuredCommand.description || structuredCommand.category} added to ${structuredCommand.category} category!`;
      } else if (structuredCommand.function === 'get_spending') {
        message = 'Spending summary feature coming soon!';
        result = {};
      } else {
        message = openAIResponse;
        result = {};
      }
      res.status(200).json({ message, result });
    } catch (error) {
      console.error('Error processing voice command:', error);
      res.status(500).json({ error: 'Failed to process voice command' });
    }
  });
} 