'use client';

import React from 'react';
import VoiceInput from '../components/VoiceInput';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-center mb-8">
          Welcome to Grock Finance
        </h1>
        <p className="text-xl text-center text-gray-300 mb-12">
          Your AI-powered financial assistant with the strength of Grock
        </p>
        <div className="max-w-2xl mx-auto bg-gray-800 rounded-lg shadow-xl p-6">
          <div className="text-center mb-8">
            <p className="text-lg mb-4">
              Try these voice commands:
            </p>
            <ul className="text-grock-200 space-y-2">
              <li>"Add expense of 25 dollars for lunch in food category"</li>
              <li>"Create a savings goal of 1000 dollars for vacation"</li>
              <li>"Add income of 2000 dollars from salary"</li>
            </ul>
          </div>
          <VoiceInput />
        </div>
      </div>
    </main>
  );
} 