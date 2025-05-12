'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { 
  ChartBarIcon, 
  CurrencyDollarIcon, 
  LightBulbIcon,
  ArrowTrendingUpIcon,
  MicrophoneIcon
} from '@heroicons/react/24/outline';
import BudgetCoach from '../components/BudgetCoach';
import { useVoiceCommand } from '../hooks/useVoiceCommand';

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
      <h1 className="text-4xl font-bold mb-8">All-in-One Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Quick Add Panel */}
        <div className="bg-gray-800 rounded-xl p-6 shadow-xl col-span-1">
          <h2 className="text-xl font-semibold mb-4">Quick Add</h2>
          <p className="text-gray-400">Add income, expense, or tracker entry here.</p>
          {/* TODO: Add unified add form */}
        </div>
        {/* Income Sources */}
        <div className="bg-gray-800 rounded-xl p-6 shadow-xl col-span-1">
          <h2 className="text-xl font-semibold mb-4">Income Sources</h2>
          <p className="text-gray-400">Manage your income streams here.</p>
          {/* TODO: List and manage income sources */}
        </div>
        {/* Expenses */}
        <div className="bg-gray-800 rounded-xl p-6 shadow-xl col-span-1">
          <h2 className="text-xl font-semibold mb-4">Expenses</h2>
          <p className="text-gray-400">View and add expenses here.</p>
          {/* TODO: List and add expenses */}
        </div>
        {/* Scheduler/Reminders */}
        <div className="bg-gray-800 rounded-xl p-6 shadow-xl col-span-1">
          <h2 className="text-xl font-semibold mb-4">Scheduler & Reminders</h2>
          <p className="text-gray-400">See upcoming events and reminders.</p>
          {/* TODO: List and manage events */}
        </div>
        {/* Trackers */}
        <div className="bg-gray-800 rounded-xl p-6 shadow-xl col-span-1">
          <h2 className="text-xl font-semibold mb-4">Trackers</h2>
          <p className="text-gray-400">Track habits, routines, or anything else.</p>
          {/* TODO: List and log tracker entries */}
        </div>
        {/* AI Assistant Panel */}
        <div className="bg-gray-800 rounded-xl p-6 shadow-xl col-span-1">
          <h2 className="text-xl font-semibold mb-4">AI Assistant</h2>
          <p className="text-gray-400">Type or speak commands, get help, and see AI responses.</p>
          {/* TODO: AI input and response area */}
        </div>
      </div>
    </div>
  );
} 