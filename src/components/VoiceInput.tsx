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
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [feedback, setFeedback] = useState('');
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (!isRecording && audioChunks.length > 0) {
      handleUpload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  const startRecording = async () => {
    setFeedback('Requesting microphone...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      setMediaRecorder(recorder);
      setAudioChunks([]);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks((prev) => [...prev, event.data]);
        }
      };
      recorder.onstop = () => {
        setIsRecording(false);
      };
      recorder.start();
      setIsRecording(true);
      setFeedback('Recording... Click stop when done.');
    } catch (error) {
      setFeedback('Microphone access denied or not supported.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setFeedback('Processing audio...');
    }
  };

  const handleUpload = async () => {
    if (audioChunks.length === 0) return;
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    setFeedback('Uploading and transcribing...');
    try {
      const response = await fetch('/api/voice', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.message) {
        setResult(data.result);
        setFeedback(data.message);
      } else {
        setFeedback('Error processing command. Please try again.');
      }
    } catch (error) {
      setFeedback('Error uploading audio. Please try again.');
    } finally {
      setAudioChunks([]);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 p-4">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`px-6 py-3 rounded-full text-white font-bold transition-all ${
          isRecording
            ? 'bg-red-600 hover:bg-red-700'
            : 'bg-grock-500 hover:bg-grock-600 hover:shadow-lg'
        }`}
      >
        {isRecording ? 'Stop Recording' : 'Start Voice Command'}
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