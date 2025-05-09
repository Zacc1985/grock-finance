'use client';

import React, { useEffect, useState } from 'react';
import { 
  ChartBarIcon, 
  CurrencyDollarIcon, 
  LightBulbIcon,
  ArrowTrendingUpIcon,
  MicrophoneIcon
} from '@heroicons/react/24/outline';

interface Transaction {
  id: string;
  amount: number;
  description: string;
  type: string;
  category: { name: string };
  date: string;
  aiAnalysis: {
    sentiment: string;
    confidence: number;
    suggestions: string[];
  };
}

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
  status: string;
  aiSuggestions: {
    recommendations: string[];
    timeline: any;
    strategy: string;
  };
}

export default function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [transactionsRes, goalsRes] = await Promise.all([
          fetch('/api/transactions'),
          fetch('/api/goals')
        ]);

        if (!transactionsRes.ok || !goalsRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const transactionsData = await transactionsRes.json();
        const goalsData = await goalsRes.json();

        setTransactions(transactionsData);
        setGoals(goalsData);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

      if (!response.ok) {
        throw new Error('Failed to process voice command');
      }

      const data = await response.json();
      // Refresh data after successful command
      window.location.reload();
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

  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-6">
      <div className="flex justify-end mb-4">
        <a href="/fifty-thirty-twenty">
          <button className="bg-grock-500 text-white px-4 py-2 rounded-lg hover:bg-grock-600 transition-colors">
            50/30/20 Rule Overview
          </button>
        </a>
      </div>
      <h1 className="text-4xl font-bold mb-8">Financial Dashboard</h1>
      
      {/* Voice Command Interface */}
      <div className="bg-gray-800 rounded-xl p-6 shadow-xl mb-8">
        <div className="flex items-center mb-4">
          <MicrophoneIcon className="h-8 w-8 text-grock-500 mr-3" />
          <h2 className="text-xl font-semibold">Voice Commands</h2>
        </div>
        <div className="flex gap-4">
          <input
            type="text"
            value={voiceMessage}
            onChange={(e) => setVoiceMessage(e.target.value)}
            placeholder="Type or speak your command..."
            className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-grock-500"
          />
          <button
            onClick={handleVoiceCommand}
            className="bg-grock-500 text-white px-6 py-2 rounded-lg hover:bg-grock-600 transition-colors"
          >
            Send
          </button>
        </div>
        <p className="text-sm text-gray-400 mt-2">
          Try saying things like "I spent $50 on groceries" or "How much did I spend on food this month?"
        </p>
      </div>

      {/* Grok's AI Insights Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
          <div className="flex items-center mb-4">
            <LightBulbIcon className="h-8 w-8 text-grock-500 mr-3" />
            <h2 className="text-xl font-semibold">Grok's Insights</h2>
          </div>
          <div className="space-y-4">
            {transactions.slice(0, 3).map(tx => (
              <div key={tx.id} className="border-l-4 border-grock-500 pl-4">
                <p className="text-sm text-gray-400">{new Date(tx.date).toLocaleDateString()}</p>
                <p className="font-medium">{tx.description}</p>
                <p className="text-sm text-grock-300">{tx.aiAnalysis.sentiment}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Spending Analysis */}
        <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
          <div className="flex items-center mb-4">
            <ChartBarIcon className="h-8 w-8 text-grock-500 mr-3" />
            <h2 className="text-xl font-semibold">Spending Analysis</h2>
          </div>
          <div className="space-y-3">
            {Object.entries(
              transactions.reduce((acc, tx) => {
                if (tx.type === 'EXPENSE') {
                  acc[tx.category.name] = (acc[tx.category.name] || 0) + tx.amount;
                }
                return acc;
              }, {} as Record<string, number>)
            ).map(([category, amount]) => (
              <div key={category} className="flex items-center justify-between">
                <span>{category}</span>
                <span className="font-mono">${amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Goals */}
        <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
          <div className="flex items-center mb-4">
            <ArrowTrendingUpIcon className="h-8 w-8 text-grock-500 mr-3" />
            <h2 className="text-xl font-semibold">Goal Progress</h2>
          </div>
          <div className="space-y-4">
            {goals.map(goal => (
              <div key={goal.id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>{goal.name}</span>
                  <span className="text-sm text-grock-300">
                    ${goal.currentAmount} / ${goal.targetAmount}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div
                    className="bg-grock-500 h-2.5 rounded-full"
                    style={{
                      width: `${(goal.currentAmount / goal.targetAmount) * 100}%`
                    }}
                  ></div>
                </div>
                <p className="text-sm text-grock-300">{goal.aiSuggestions.strategy}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
        <div className="flex items-center mb-6">
          <CurrencyDollarIcon className="h-8 w-8 text-grock-500 mr-3" />
          <h2 className="text-xl font-semibold">Recent Activity</h2>
        </div>
        <div className="space-y-4">
          {transactions.slice(0, 5).map(tx => (
            <div key={tx.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
              <div>
                <p className="font-medium">{tx.description}</p>
                <p className="text-sm text-gray-400">{new Date(tx.date).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className={`font-mono ${tx.type === 'EXPENSE' ? 'text-red-400' : 'text-green-400'}`}>
                  {tx.type === 'EXPENSE' ? '-' : '+'}${tx.amount.toFixed(2)}
                </p>
                <p className="text-sm text-gray-400">{tx.category.name}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 