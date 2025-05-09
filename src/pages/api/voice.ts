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
      throw new Error('Failed to transcribe audio');
    }

    const { text } = await whisperResponse.json();

    // Process the transcribed text with OpenAI
    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a budgeting assistant. Your job is to understand casual spending inputs and turn them into structured commands for an API. For example: "I bought a #7 from McDonald\'s today" → { "function": "add_expense", "amount": 7.50, "category": "food", "date": "2023-10-17" }. If details are missing, ask for clarification. Respond in a fun, conversational tone.'
          },
          {
            role: 'user',
            content: text
          }
        ],
        functions: [
          {
            name: 'add_expense',
            description: 'Add a new expense to the budget',
            parameters: {
              type: 'object',
              properties: {
                amount: {
                  type: 'number',
                  description: 'The amount of the expense'
                },
                category: {
                  type: 'string',
                  description: 'The category of the expense'
                },
                description: {
                  type: 'string',
                  description: 'A description of the expense'
                },
                date: {
                  type: 'string',
                  description: 'The date of the expense in YYYY-MM-DD format'
                }
              },
              required: ['amount', 'category']
            }
          }
        ],
        function_call: 'auto'
      }),
    });

    if (!chatResponse.ok) {
      throw new Error('Failed to process text with OpenAI');
    }

    const chatData = await chatResponse.json();
    const message = chatData.choices[0].message;

    // Log the voice command
    await prisma.voiceCommand.create({
      data: {
        rawText: text,
        intent: message.function_call?.name || 'unknown',
        parameters: JSON.stringify(message.function_call?.arguments || {}),
        success: true,
        processingTime: 0, // You might want to calculate this
      },
    });

    // If there's a function call, process it
    if (message.function_call) {
      const { name, arguments: args } = message.function_call;
      const parsedArgs = JSON.parse(args);

      if (name === 'add_expense') {
        // Find or create the category
        let category = await prisma.category.findFirst({
          where: { name: parsedArgs.category }
        });

        if (!category) {
          category = await prisma.category.create({
            data: {
              name: parsedArgs.category,
              budget: 0, // You might want to set a default budget
            },
          });
        }

        // Create the transaction
        const transaction = await prisma.transaction.create({
          data: {
            amount: parsedArgs.amount,
            description: parsedArgs.description || 'Voice command expense',
            categoryId: category.id,
            type: 'expense',
            tags: JSON.stringify([]),
            bucket: 'needs', // You might want to determine this based on the category
          },
        });

        return res.status(200).json({
          text,
          message: `Added expense of $${parsedArgs.amount} to ${parsedArgs.category}`,
          result: {
            transaction,
            category,
            bucket: 'needs'
          }
        });
      }
    }

    // If no function call or not handled, return the assistant's message
    return res.status(200).json({
      text,
      message: message.content,
      result: null
    });

  } catch (error) {
    console.error('Error processing voice command:', error);
    return res.status(500).json({ error: 'Failed to process voice command' });
  }
} 