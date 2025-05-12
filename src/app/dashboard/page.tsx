'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { 
  ChartBarIcon, 
  CurrencyDollarIcon, 
  LightBulbIcon,
  ArrowTrendingUpIcon,
  MicrophoneIcon
} from '@heroicons/react/24/outline';
import SpontaneousSpending from '../components/SpontaneousSpending';
import BudgetCoach from '../components/BudgetCoach';
import { useVoiceCommand } from '../hooks/useVoiceCommand';
import IncomeConfig from '../components/IncomeConfig';

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

interface Category {
  id: string;
  name: string;
}

export default function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiInsight, setAiInsight] = useState('');
  const [aiLoading, setAiLoading] = useState(true);
  // Track the last action for undo
  const [lastAction, setLastAction] = useState<{ intent: string; parameters: any } | null>(null);
  const [undoing, setUndoing] = useState(false);

  const { 
    voiceMessage, 
    setVoiceMessage, 
    handleVoiceCommand,
    error: voiceError 
  } = useVoiceCommand({
    onSuccess: (intent?: string, parameters?: any) => {
      if (intent && parameters) setLastAction({ intent, parameters });
      window.location.reload();
    },
    onError: (err) => setError(err)
  });

  const fetchAiInsight = useCallback(async () => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/insights');
      const data = await res.json();
      setAiInsight(data.insight || 'No insight available.');
    } catch (e) {
      setAiInsight('Could not load AI insight.');
    }
    setAiLoading(false);
  }, []);

  const refreshDashboard = async () => {
    setLoading(true);
    try {
      const [transactionsRes, goalsRes, categoriesRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/goals'),
        fetch('/api/categories')
      ]);

      if (!transactionsRes.ok || !goalsRes.ok || !categoriesRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const transactionsData = await transactionsRes.json();
      const goalsData = await goalsRes.json();
      const categoriesData = await categoriesRes.json();

      // Validate and transform transactions data
      const validTransactions = Array.isArray(transactionsData) 
        ? transactionsData
          .filter(tx => tx && typeof tx === 'object')
          .map(tx => ({
            id: tx.id?.toString() || Math.random().toString(),
            amount: typeof tx.amount === 'number' ? tx.amount : 0,
            description: tx.description?.toString() || 'Unknown Transaction',
            type: tx.type?.toString() || 'EXPENSE',
            category: {
              name: tx.category?.name?.toString() || 'Uncategorized'
            },
            date: tx.date ? new Date(tx.date).toISOString() : new Date().toISOString(),
            aiAnalysis: {
              sentiment: tx.aiAnalysis?.sentiment?.toString() || 'No analysis',
              confidence: typeof tx.aiAnalysis?.confidence === 'number' ? tx.aiAnalysis.confidence : 0,
              suggestions: Array.isArray(tx.aiAnalysis?.suggestions) ? tx.aiAnalysis.suggestions : []
            }
          }))
        : [];

      // Validate and transform goals data
      const validGoals = Array.isArray(goalsData)
        ? goalsData
          .filter(goal => goal && typeof goal === 'object')
          .map(goal => ({
            id: goal.id?.toString() || Math.random().toString(),
            name: goal.name?.toString() || 'Unnamed Goal',
            targetAmount: typeof goal.targetAmount === 'number' ? goal.targetAmount : 0,
            currentAmount: typeof goal.currentAmount === 'number' ? goal.currentAmount : 0,
            deadline: goal.deadline || null,
            status: goal.status?.toString() || 'IN_PROGRESS',
            aiSuggestions: {
              recommendations: Array.isArray(goal.aiSuggestions?.recommendations) ? goal.aiSuggestions.recommendations : [],
              timeline: goal.aiSuggestions?.timeline || null,
              strategy: goal.aiSuggestions?.strategy?.toString() || 'No strategy available'
            }
          }))
        : [];

      // Validate and transform categories data
      const validCategories = Array.isArray(categoriesData)
        ? categoriesData
          .filter(cat => cat && typeof cat === 'object')
          .map(cat => ({
            id: cat.id?.toString() || Math.random().toString(),
            name: cat.name?.toString() || 'Unnamed Category'
          }))
        : [];

      setTransactions(validTransactions);
      setGoals(validGoals);
      setCategories(validCategories);
      await fetchAiInsight();
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshDashboard();
  }, [fetchAiInsight]);

  // Handler to pass to children for triggering refresh
  const handleDataChange = () => {
    refreshDashboard();
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
        {/* Undo Button */}
        {lastAction && (
          <button
            className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors mr-2"
            onClick={async () => {
              setUndoing(true);
              setError('');
              try {
                // Placeholder: send undo request to backend (implement /api/undo as needed)
                const res = await fetch('/api/undo', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(lastAction)
                });
                if (!res.ok) {
                  const data = await res.json();
                  throw new Error(data.error || 'Failed to undo last action');
                }
                setLastAction(null);
                refreshDashboard();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to undo');
              } finally {
                setUndoing(false);
              }
            }}
            disabled={undoing}
          >
            {undoing ? 'Undoing...' : 'Undo Last Action'}
          </button>
        )}
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
        {voiceError && (
          <p className="text-red-400 text-sm mt-2">{voiceError}</p>
        )}
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
                <p className="text-sm text-gray-400">{tx?.date ? new Date(tx.date).toLocaleDateString() : 'No date'}</p>
                <p className="font-medium">{tx?.description || 'No description'}</p>
                <p className="text-sm text-grock-300">{tx?.aiAnalysis?.sentiment ?? "No analysis"}</p>
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
              transactions
                .filter(tx => tx && tx.type === 'EXPENSE' && tx.category?.name && typeof tx.amount === 'number')
                .reduce((acc, tx) => {
                  const categoryName = tx.category?.name || 'Uncategorized';
                  acc[categoryName] = (acc[categoryName] || 0) + (tx.amount || 0);
                  return acc;
                }, {} as Record<string, number>)
            ).map(([category, amount]) => (
              <div key={category} className="flex items-center justify-between">
                <span>{category || 'Uncategorized'}</span>
                <span className="font-mono">${(amount || 0).toFixed(2)}</span>
              </div>
            ))}
            {transactions.length === 0 && (
              <div className="text-gray-400 text-center py-4">
                No transactions to display
              </div>
            )}
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
              <div key={goal?.id || Math.random()} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>{goal?.name || 'Unnamed Goal'}</span>
                  <span className="text-sm text-grock-300">
                    ${goal?.currentAmount || 0} / ${goal?.targetAmount || 0}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div
                    className="bg-grock-500 h-2.5 rounded-full"
                    style={{
                      width: `${((goal?.currentAmount || 0) / (goal?.targetAmount || 1)) * 100}%`
                    }}
                  ></div>
                </div>
                <p className="text-sm text-grock-300">{goal?.aiSuggestions?.strategy || 'No strategy available'}</p>
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
            <div key={tx?.id || Math.random()} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
              <div>
                <p className="font-medium">{tx?.description || 'Unknown Transaction'}</p>
                <p className="text-sm text-gray-400">{tx?.date ? new Date(tx.date).toLocaleDateString() : 'No date'}</p>
              </div>
              <div className="text-right">
                <p className={`font-mono ${tx?.type === 'EXPENSE' ? 'text-red-400' : 'text-green-400'}`}>
                  {tx?.type === 'EXPENSE' ? '-' : '+'}${(tx?.amount || 0).toFixed(2)}
                </p>
                <p className="text-sm text-gray-400">{tx?.category?.name || 'Uncategorized'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add IncomeConfig at the top */}
      <div className="lg:col-span-3">
        <IncomeConfig onIncomeChange={handleDataChange} />
      </div>

      {/* Add BudgetCoach component before SpontaneousSpending */}
      <div className="lg:col-span-2 mb-6">
        <BudgetCoach onDataChange={handleDataChange} />
      </div>

      {/* SpontaneousSpending component */}
      <div className="lg:col-span-1">
        <SpontaneousSpending categories={categories} onDataChange={handleDataChange} />
      </div>

      {/* AI Financial Insight Box */}
      <div className="bg-gray-700 rounded-lg p-4 text-grock-100 text-sm mt-8">
        <div className="font-semibold text-grock-200 mb-1">AI Financial Insight:</div>
        {aiLoading ? 'Loading insight...' : aiInsight}
      </div>
    </div>
  );
} 