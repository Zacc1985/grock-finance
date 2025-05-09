'use client';

import React, { useEffect, useState } from 'react';
import VoiceInput from '../components/VoiceInput';

function AIInsight() {
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInsight() {
      setLoading(true);
      try {
        const res = await fetch('/api/ai/insights');
        const data = await res.json();
        setInsight(data.insight || 'No insight available.');
      } catch (e) {
        setInsight('Could not load AI insight.');
      }
      setLoading(false);
    }
    fetchInsight();
  }, []);

  return (
    <div className="mb-6">
      <div className="font-semibold text-grock-200 mb-1">AI Financial Insight:</div>
      <div className="bg-gray-700 rounded-lg p-4 text-grock-100 text-sm">
        {loading ? 'Loading insight...' : insight}
      </div>
    </div>
  );
}

function BucketSummary() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      setLoading(true);
      try {
        const res = await fetch('/api/buckets/summary');
        const data = await res.json();
        setReport(data);
      } catch (e) {
        setReport(null);
      }
      setLoading(false);
    }
    fetchSummary();
  }, []);

  if (loading) return <div className="mb-6 text-center text-gray-400">Loading budget summary...</div>;
  if (!report) return <div className="mb-6 text-center text-red-400">Could not load budget summary.</div>;

  return (
    <div className="mb-8">
      {/* Alerts */}
      {report.alerts && report.alerts.length > 0 && (
        <div className="mb-2 text-center">
          {report.alerts.map((alert: string, i: number) => (
            <div key={i} className="text-red-400 font-semibold">{alert}</div>
          ))}
        </div>
      )}
      {/* Suggestions */}
      {report.suggestions && report.suggestions.length > 0 && (
        <div className="mb-2 text-center">
          {report.suggestions.map((s: string, i: number) => (
            <div key={i} className="text-grock-300">{s}</div>
          ))}
        </div>
      )}
      {/* Main bucket summary */}
      <div className="flex flex-col md:flex-row justify-center gap-4 mb-4">
        {report.summary.map((b: any) => (
          <div key={b.bucket} className="bg-gray-700 rounded-lg p-4 min-w-[180px] text-center">
            <div className="font-bold text-lg text-grock-200 mb-1">{b.bucket}</div>
            <div className="text-sm text-gray-300">Allowed: <span className="font-semibold">${b.allowed.toFixed(2)}</span></div>
            <div className="text-sm text-gray-300">Spent: <span className="font-semibold">${b.spent.toFixed(2)}</span></div>
            <div className={`text-sm font-semibold ${b.remaining < 0 ? 'text-red-400' : 'text-green-400'}`}>Left: ${b.remaining.toFixed(2)}</div>
          </div>
        ))}
      </div>
      {/* Category breakdown */}
      {report.categoryBreakdown && report.categoryBreakdown.length > 0 && (
        <div className="mb-2">
          <div className="font-semibold text-grock-200 mb-1">Category Breakdown:</div>
          <div className="flex flex-wrap gap-2">
            {report.categoryBreakdown.map((cat: any) => (
              <div key={cat.name} className="bg-gray-700 rounded px-3 py-1 text-sm">
                <span className="font-bold text-grock-300">{cat.name}</span>: ${cat.total.toFixed(2)}
                {cat.bucket && (
                  <span className="ml-2 text-xs text-grock-400">({cat.bucket})</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Report summary */}
      <div className="mt-2 text-center text-gray-300 text-sm">
        <div>Period: <span className="font-semibold">{report.period}</span></div>
        <div>Total Spent: <span className="font-semibold">${report.totalSpent.toFixed(2)}</span></div>
        <div>Total Saved: <span className="font-semibold">${report.totalSaved.toFixed(2)}</span></div>
      </div>
    </div>
  );
}

export default function Home() {
  const handleTranscriptionComplete = (text: string) => {
    // Refresh the page data after a voice command is processed
    window.location.reload();
  };

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
          <AIInsight />
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
          <VoiceInput onTranscriptionComplete={handleTranscriptionComplete} />
        </div>
      </div>
    </main>
  );
} 