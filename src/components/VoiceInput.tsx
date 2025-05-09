'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useCallback } from 'react';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function VoiceInput({ onTranscriptionComplete }: { onTranscriptionComplete: (text: string) => void }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastAudioLevelRef = useRef<number>(0);
  const [feedback, setFeedback] = useState('');
  const [result, setResult] = useState<any>(null);
  const [conversation, setConversation] = useState([
    {
      role: 'system',
      content:
        'You are a budgeting assistant. Your job is to understand casual spending inputs and turn them into structured commands for an API. For example: "I bought a #7 from McDonald\'s today" → { "function": "add_expense", "amount": 7.50, "category": "food", "date": "2023-10-17" }. If details are missing, ask for clarification. Respond in a fun, conversational tone.'
    }
  ]);

  useEffect(() => {
    if (!isRecording && audioChunksRef.current.length > 0) {
      handleUpload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Create audio context for silence detection
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let silenceStart = Date.now();
      const SILENCE_THRESHOLD = 10; // Adjust this value based on testing
      const SILENCE_DURATION = 1500; // Stop after 1.5 seconds of silence

      const checkAudioLevel = () => {
        if (!isRecording) return;
        
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        lastAudioLevelRef.current = average;

        if (average < SILENCE_THRESHOLD) {
          if (silenceTimerRef.current === null) {
            silenceStart = Date.now();
            silenceTimerRef.current = setTimeout(() => {
              if (Date.now() - silenceStart >= SILENCE_DURATION) {
                stopRecording();
              }
            }, SILENCE_DURATION);
          }
        } else {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        }

        requestAnimationFrame(checkAudioLevel);
      };

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
        audioContext.close();
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      checkAudioLevel();
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Error accessing microphone. Please ensure you have granted microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch('/api/voice', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process audio');
      }

      const data = await response.json();
      onTranscriptionComplete(data.text);
    } catch (error) {
      console.error('Error processing audio:', error);
      alert('Error processing audio. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpload = async () => {
    if (audioChunksRef.current.length === 0) return;
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('conversation', JSON.stringify(conversation));
    setFeedback('Uploading and transcribing...');
    try {
      const response = await fetch('/api/voice', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.message) {
        setConversation((prev) => [
          ...prev,
          { role: 'user', content: '[voice message]' },
          { role: 'assistant', content: data.message }
        ]);
        setResult(data.result);
        setFeedback(data.message);
      } else {
        setFeedback('Error processing command. Please try again.');
      }
    } catch (error) {
      setFeedback('Error uploading audio. Please try again.');
    } finally {
      audioChunksRef.current = [];
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 p-4">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200 ${
          isRecording
            ? 'bg-red-500 hover:bg-red-600'
            : isProcessing
            ? 'bg-gray-500'
            : 'bg-blue-500 hover:bg-blue-600'
        } text-white`}
      >
        {isRecording ? (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 animate-pulse"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                clipRule="evenodd"
              />
            </svg>
            Stop Recording
          </>
        ) : isProcessing ? (
          <>
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Processing...
          </>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                clipRule="evenodd"
              />
            </svg>
            Start Recording
          </>
        )}
      </button>
      {feedback && (
        <p className="text-grock-100 bg-gray-800 px-4 py-2 rounded-lg">
          {feedback}
        </p>
      )}
      {result && (
        <div className="mt-4 p-4 bg-gray-800 rounded-lg w-full max-w-md">
          <h3 className="text-grock-100 font-bold mb-2">Last Action:</h3>
          {result.bucket && (
            <div className="mb-2 text-sm font-semibold text-grock-300">
              50/30/20 Bucket: <span className="uppercase text-grock-400">{result.bucket}</span>
            </div>
          )}
          <pre className="text-sm text-grock-200 overflow-x-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 