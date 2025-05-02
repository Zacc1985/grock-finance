'use client';

import React from 'react';

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
        <div className="max-w-md mx-auto bg-gray-800 rounded-lg shadow-xl p-6">
          <div className="text-center">
            <p className="text-lg mb-4">
              Coming soon! Track your spending with natural language processing and get AI-powered insights.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
} 