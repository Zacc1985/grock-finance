'use client';

import React, { useState, useEffect } from 'react';
import { useCallback } from 'react';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function VoiceInput() {
  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [result, setResult] = useState<any>(null);

  const startListening = useCallback(async () => {
    try {
      setIsListening(true);
      setFeedback('Listening...');

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = async (event: any) => {
        const voiceText = event.results[0][0].transcript;
        setFeedback(`Processing: "${voiceText}"`);

        try {
          const response = await fetch('/api/voice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ voiceText }),
          });

          const data = await response.json();
          if (data.success) {
            setResult(data.result);
            setFeedback(data.message || 'Command processed successfully!');
          } else {
            setFeedback('Error processing command. Please try again.');
          }
        } catch (error) {
          console.error('Error processing voice command:', error);
          setFeedback('Error processing command. Please try again.');
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setFeedback('Error with speech recognition. Please try again.');
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setFeedback('Speech recognition not supported in this browser.');
      setIsListening(false);
    }
  }, []);

  return (
    <div className="flex flex-col items-center space-y-4 p-4">
      <button
        onClick={startListening}
        disabled={isListening}
        className={`px-6 py-3 rounded-full text-white font-bold transition-all ${
          isListening
            ? 'bg-grock-600 cursor-not-allowed'
            : 'bg-grock-500 hover:bg-grock-600 hover:shadow-lg'
        }`}
      >
        {isListening ? 'Listening...' : 'Start Voice Command'}
      </button>
      
      {feedback && (
        <p className="text-grock-100 bg-gray-800 px-4 py-2 rounded-lg">
          {feedback}
        </p>
      )}
      
      {result && (
        <div className="mt-4 p-4 bg-gray-800 rounded-lg w-full max-w-md">
          <h3 className="text-grock-100 font-bold mb-2">Last Action:</h3>
          <pre className="text-sm text-grock-200 overflow-x-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 