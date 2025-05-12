import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({});
    const [fields, files] = await form.parse(req);
    const audioFile = files.audio?.[0];

    if (!audioFile) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Read the audio file
    const audioBuffer = fs.readFileSync(audioFile.filepath);

    // Call OpenAI Whisper API for transcription
    const formData = new FormData();
    formData.append('file', new Blob([audioBuffer]), 'audio.webm');
    formData.append('model', 'whisper-1');

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('Whisper API error:', errorText);
      throw new Error('Failed to transcribe audio');
    }

    const { text } = await whisperResponse.json();

    // Send the transcribed text to the AI intent endpoint
    const aiIntentResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/ai/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    });

    if (!aiIntentResponse.ok) {
      const errorText = await aiIntentResponse.text();
      console.error('AI Intent API error:', errorText);
      throw new Error('Failed to process intent from AI');
    }

    const { intent, parameters } = await aiIntentResponse.json();

    // Log the voice command
    await prisma.voiceCommand.create({
      data: {
        rawText: text,
        intent: intent || 'unknown',
        parameters: JSON.stringify(parameters || {}),
        success: !!intent && intent !== 'unknown',
        processingTime: 0,
      },
    });

    // Example: handle add_expense intent (expand as needed)
    if (intent === 'add_expense' && parameters) {
      let category = await prisma.category.findFirst({ where: { name: parameters.category } });
      if (!category) {
        category = await prisma.category.create({ data: { name: parameters.category, budget: 0 } });
      }
      const transaction = await prisma.transaction.create({
        data: {
          amount: parameters.amount,
          description: parameters.description || 'Voice command expense',
          categoryId: category.id,
          type: 'expense',
          tags: JSON.stringify([]),
          bucket: 'needs',
          date: parameters.date ? new Date(parameters.date) : new Date(),
        },
      });
      return res.status(200).json({
        text,
        message: `Added expense of $${parameters.amount} to ${parameters.category}`,
        result: { transaction, category, bucket: 'needs' },
      });
    }

    // If no intent or not handled, return the AI's message
    return res.status(200).json({
      text,
      message: `AI intent: ${intent}`,
      result: null,
    });

  } catch (error) {
    console.error('Error processing voice command:', error);
    return res.status(500).json({ error: 'Failed to process voice command' });
  }
} 