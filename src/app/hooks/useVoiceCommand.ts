import { useState, useCallback } from 'react';
import { validateVoiceCommand, extractAmount, extractCategory } from '../utils/voiceCommandValidation';

interface UseVoiceCommandProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function useVoiceCommand({ onSuccess, onError }: UseVoiceCommandProps = {}) {
  const [voiceMessage, setVoiceMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVoiceCommand = useCallback(async () => {
    if (!voiceMessage.trim()) {
      setError('Please enter a command');
      onError?.('Please enter a command');
      return;
    }

    setIsListening(true);
    setError(null);

    try {
      // First, try to determine the intent from the message
      const lowerMessage = voiceMessage.toLowerCase();
      let intent = '';
      let parameters: Record<string, any> = {};

      // Determine intent based on keywords
      if (lowerMessage.includes('spent') || lowerMessage.includes('spend') || lowerMessage.includes('bought')) {
        intent = 'ADD_EXPENSE';
        const { amount, error: amountError } = extractAmount(voiceMessage);
        if (amountError) {
          throw new Error(amountError);
        }
        parameters.amount = amount;

        // Extract category from the message
        const { category, error: categoryError } = extractCategory(voiceMessage, [
          'groceries', 'food', 'dining', 'transportation', 'entertainment',
          'shopping', 'bills', 'utilities', 'rent', 'mortgage', 'health',
          'education', 'gifts', 'savings', 'investment'
        ]);
        if (categoryError) {
          throw new Error(categoryError);
        }
        parameters.category = category;

        // Extract description if present
        const descriptionMatch = voiceMessage.match(/on\s+(.+?)(?:\s+in\s+|\s+for\s+|\s*$)/i);
        if (descriptionMatch) {
          parameters.description = descriptionMatch[1].trim();
        }
      } else if (lowerMessage.includes('balance') || lowerMessage.includes('spent') || lowerMessage.includes('spending')) {
        intent = 'CHECK_BALANCE';
        const { category, error: categoryError } = extractCategory(voiceMessage, [
          'groceries', 'food', 'dining', 'transportation', 'entertainment',
          'shopping', 'bills', 'utilities', 'rent', 'mortgage', 'health',
          'education', 'gifts', 'savings', 'investment'
        ]);
        if (categoryError) {
          throw new Error(categoryError);
        }
        parameters.category = category;

        // Extract period if present
        const periodMatch = lowerMessage.match(/(today|this week|this month|this year)/);
        if (periodMatch) {
          parameters.period = periodMatch[1].replace('this ', '');
        }
      } else if (lowerMessage.includes('goal') || lowerMessage.includes('save for')) {
        intent = 'SET_GOAL';
        const { amount, error: amountError } = extractAmount(voiceMessage);
        if (amountError) {
          throw new Error(amountError);
        }
        parameters.amount = amount;

        // Extract goal name
        const nameMatch = voiceMessage.match(/save for\s+(.+?)(?:\s+by\s+|\s*$)/i) ||
                         voiceMessage.match(/goal to\s+(.+?)(?:\s+by\s+|\s*$)/i);
        if (nameMatch) {
          parameters.name = nameMatch[1].trim();
        } else {
          throw new Error('Please specify what you want to save for');
        }

        // Extract deadline if present
        const deadlineMatch = voiceMessage.match(/by\s+(.+?)$/i);
        if (deadlineMatch) {
          parameters.deadline = deadlineMatch[1].trim();
        }
      } else {
        throw new Error('I couldn\'t understand what you want to do. Try saying something like "I spent $50 on groceries" or "What\'s my balance in entertainment this month?"');
      }

      // Validate the command using our validation system
      const { isValid, errors } = validateVoiceCommand(
        voiceMessage,
        intent,
        parameters,
        [
          'groceries', 'food', 'dining', 'transportation', 'entertainment',
          'shopping', 'bills', 'utilities', 'rent', 'mortgage', 'health',
          'education', 'gifts', 'savings', 'investment'
        ]
      );

      if (!isValid) {
        throw new Error(errors.join('\n'));
      }

      // Process the command based on intent
      const response = await fetch('/api/voice-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rawText: voiceMessage,
          intent,
          parameters,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to process command');
      }

      setVoiceMessage('');
      onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsListening(false);
    }
  }, [voiceMessage, onSuccess, onError]);

  return {
    voiceMessage,
    setVoiceMessage,
    isListening,
    handleVoiceCommand,
    error,
  };
} 