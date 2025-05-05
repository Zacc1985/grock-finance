'use client';

import React, { useEffect, useState } from 'react';
import VoiceInput from '../components/VoiceInput';

function BucketSummary() {
  const [summary, setSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      setLoading(true);
      try {
        const res = await fetch('/api/buckets/summary');
        const data = await res.json();
        setSummary(data.summary);
      } catch (e) {
        setSummary([]);
      }
      setLoading(false);
    }
    fetchSummary();
  }, []);

  if (loading) return <div className="mb-6 text-center text-gray-400">Loading budget summary...</div>;
  if (!summary.length) return <div className="mb-6 text-center text-red-400">Could not load budget summary.</div>;

  return (
    <div className="mb-8 flex flex-col md:flex-row justify-center gap-4">
      {summary.map((b) => (
        <div key={b.bucket} className="bg-gray-700 rounded-lg p-4 min-w-[180px] text-center">
          <div className="font-bold text-lg text-grock-200 mb-1">{b.bucket}</div>
          <div className="text-sm text-gray-300">Allowed: <span className="font-semibold">${b.allowed.toFixed(2)}</span></div>
          <div className="text-sm text-gray-300">Spent: <span className="font-semibold">${b.spent.toFixed(2)}</span></div>
          <div className={`text-sm font-semibold ${b.remaining < 0 ? 'text-red-400' : 'text-green-400'}`}>Left: ${b.remaining.toFixed(2)}</div>
        </div>
      ))}
    </div>
  );
}

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
          <BucketSummary />
          <div className="text-center mb-8">
            <p className="text-lg mb-4">
              Try these voice commands:
            </p>
            <ul className="text-grock-200 space-y-2">
              <li>"Add expense of 25 dollars for lunch in food category as a need"</li>
              <li>"Add expense of 40 dollars for movie tickets in entertainment category as a want"</li>
              <li>"Add income of 500 dollars to savings as a saving"</li>
            </ul>
          </div>
          <VoiceInput />
        </div>
      </div>
    </main>
  );
} 