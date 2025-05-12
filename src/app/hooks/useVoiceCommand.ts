import { useState, useCallback } from 'react';

interface UseVoiceCommandProps {
  onSuccess?: (intent?: string, parameters?: any) => void;
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
      // Send the message to the smart AI intent endpoint
      const aiRes = await fetch('/api/ai/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: voiceMessage })
      });
      if (!aiRes.ok) {
        const data = await aiRes.json();
        throw new Error(data.error || 'Failed to process command');
      }
      const { intent, parameters } = await aiRes.json();

      if (!intent || intent === 'UNKNOWN') {
        throw new Error("Sorry, I couldn't understand your command. Try rephrasing or using a different request.");
      }

      // Now handle the intent (you can expand this as you add more intents)
      // For now, just send to a generic /api/voice-command endpoint for further processing
      const response = await fetch('/api/voice-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      onSuccess?.(intent, parameters);
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