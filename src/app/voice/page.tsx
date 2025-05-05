'use client';

import React, { useState, useEffect } from 'react';
import { MicrophoneIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

interface VoiceCommand {
  id: string;
  rawText: string;
  intent: string;
  parameters: string;
  success: boolean;
  createdAt: string;
  processingTime: number;
}

export default function VoicePage() {
  const [voiceMessage, setVoiceMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [commands, setCommands] = useState<VoiceCommand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCommands();
  }, []);

  const fetchCommands = async () => {
    try {
      const response = await fetch('/api/voice/history');
      if (!response.ok) throw new Error('Failed to fetch commands');
      const data = await response.json();
      setCommands(data);
    } catch (err) {
      setError('Failed to load command history');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceCommand = async () => {
    if (!voiceMessage.trim()) return;

    try {
      const response = await fetch('/api/voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ voiceText: voiceMessage })
      });

      if (!response.ok) throw new Error('Failed to process voice command');

      const data = await response.json();
      setVoiceMessage('');
      fetchCommands(); // Refresh command history
    } catch (err) {
      setError('Failed to process voice command');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-grock-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Voice Commands</h1>

      {/* Voice Command Interface */}
      <div className="bg-gray-800 rounded-xl p-6 shadow-xl mb-8">
        <div className="flex items-center mb-4">
          <MicrophoneIcon className="h-8 w-8 text-grock-500 mr-3" />
          <h2 className="text-xl font-semibold">Speak or Type Your Command</h2>
        </div>
        <div className="flex gap-4">
          <input
            type="text"
            value={voiceMessage}
            onChange={(e) => setVoiceMessage(e.target.value)}
            placeholder="Try saying 'I spent $50 on groceries' or 'Show my spending this month'..."
            className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-grock-500"
          />
          <button
            onClick={handleVoiceCommand}
            className="bg-grock-500 text-white px-6 py-2 rounded-lg hover:bg-grock-600 transition-colors flex items-center"
          >
            <PaperAirplaneIcon className="h-5 w-5 mr-2" />
            Send
          </button>
        </div>
        <div className="mt-4 space-y-2">
          <p className="text-sm text-gray-400">Example commands:</p>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• "I spent $50 on groceries"</li>
            <li>• "How much did I spend on food this month?"</li>
            <li>• "Show my recent transactions"</li>
            <li>• "What's my current budget status?"</li>
          </ul>
        </div>
      </div>

      {/* Command History */}
      <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
        <h2 className="text-xl font-semibold mb-4">Command History</h2>
        <div className="space-y-4">
          {commands.map((cmd) => (
            <div
              key={cmd.id}
              className={`p-4 rounded-lg ${
                cmd.success ? 'bg-gray-700' : 'bg-red-900/50'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{cmd.rawText}</p>
                  <p className="text-sm text-gray-400">
                    Intent: {cmd.intent}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">
                    {new Date(cmd.createdAt).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-400">
                    {cmd.processingTime}ms
                  </p>
                </div>
              </div>
              {!cmd.success && (
                <p className="text-red-400 text-sm mt-2">
                  Failed to process command
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="text-red-500 text-center p-4 mt-4">
          {error}
        </div>
      )}
    </div>
  );
} 