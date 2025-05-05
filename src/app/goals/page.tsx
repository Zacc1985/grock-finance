'use client';

import React, { useEffect, useState } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, SparklesIcon, MicrophoneIcon } from '@heroicons/react/24/outline';

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  status: string;
  category?: string;
  aiInsights?: string;
}

interface AIRecommendation {
  type: string;
  title: string;
  description: string;
  action: string;
}

const GoalsPage: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newGoal, setNewGoal] = useState<Partial<Goal>>({
    name: '',
    targetAmount: 0,
    currentAmount: 0,
    category: 'SAVING',
  });
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [voiceCommand, setVoiceCommand] = useState('');

  useEffect(() => {
    fetchGoals();
    fetchAIRecommendations();
  }, []);

  const fetchGoals = async () => {
    try {
      const response = await fetch('/api/goals');
      if (!response.ok) throw new Error('Failed to fetch goals');
      const data = await response.json();
      setGoals(data);
      
      // Fetch AI insights for each goal
      data.forEach((goal: Goal) => {
        fetchAIInsights(goal.id);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const fetchAIRecommendations = async () => {
    try {
      const response = await fetch('/api/ai/goals/recommendations');
      if (!response.ok) throw new Error('Failed to fetch AI recommendations');
      const data = await response.json();
      setAiRecommendations(data.recommendations);
    } catch (err) {
      console.error('Failed to fetch AI recommendations:', err);
    }
  };

  const fetchAIInsights = async (goalId: string) => {
    try {
      const response = await fetch(`/api/ai/goals/${goalId}/insights`);
      if (!response.ok) throw new Error('Failed to fetch AI insights');
      const data = await response.json();
      
      setGoals(prevGoals => 
        prevGoals.map(goal => 
          goal.id === goalId 
            ? { ...goal, aiInsights: data.insights }
            : goal
        )
      );
    } catch (err) {
      console.error('Failed to fetch AI insights:', err);
    }
  };

  const handleVoiceCommand = async () => {
    setIsListening(true);
    try {
      const response = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceText: voiceCommand })
      });
      
      if (!response.ok) throw new Error('Failed to process voice command');
      
      const data = await response.json();
      
      // Handle different types of voice commands
      if (data.action === 'create_goal') {
        setNewGoal(data.goal);
        setShowForm(true);
      } else if (data.action === 'update_progress') {
        handleUpdateProgress(data.goalId, data.amount);
      } else if (data.action === 'get_insights') {
        fetchAIInsights(data.goalId);
      }
      
      setVoiceCommand('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process voice command');
    } finally {
      setIsListening(false);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGoal),
      });
      
      if (!response.ok) throw new Error('Failed to create goal');
      
      await fetchGoals();
      setShowForm(false);
      setNewGoal({
        name: '',
        targetAmount: 0,
        currentAmount: 0,
        category: 'SAVING',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create goal');
    }
  };

  const handleUpdateProgress = async (goalId: string, newAmount: number) => {
    try {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentAmount: newAmount }),
      });
      
      if (!response.ok) throw new Error('Failed to update goal');
      
      await fetchGoals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update goal');
    }
  };

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-grock-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Financial Goals</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsListening(!isListening)}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              isListening 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-grock-500 hover:bg-grock-600'
            } text-white`}
          >
            <MicrophoneIcon className="h-5 w-5 mr-2" />
            {isListening ? 'Stop Listening' : 'Voice Command'}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center px-4 py-2 bg-grock-500 text-white rounded-lg hover:bg-grock-600 transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New Goal
          </button>
        </div>
      </div>

      {isListening && (
        <div className="mb-6 p-4 bg-gray-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-pulse h-3 w-3 bg-red-500 rounded-full"></div>
            <p className="text-gray-300">Listening... Say something like:</p>
          </div>
          <ul className="mt-2 text-sm text-gray-400">
            <li>• "Create a new goal to save $5000 for a vacation"</li>
            <li>• "Update my emergency fund progress"</li>
            <li>• "Show insights for my retirement goal"</li>
          </ul>
        </div>
      )}

      {aiRecommendations.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <SparklesIcon className="h-5 w-5 mr-2 text-grock-500" />
            AI Recommendations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aiRecommendations.map((rec, index) => (
              <div key={index} className="bg-gray-800 p-4 rounded-lg">
                <h3 className="font-semibold text-grock-500">{rec.title}</h3>
                <p className="text-sm text-gray-400 mt-1">{rec.description}</p>
                <button
                  onClick={() => {
                    if (rec.type === 'create_goal') {
                      setNewGoal(JSON.parse(rec.action));
                      setShowForm(true);
                    } else if (rec.type === 'update_progress') {
                      const { goalId, amount } = JSON.parse(rec.action);
                      handleUpdateProgress(goalId, amount);
                    }
                  }}
                  className="mt-2 text-sm text-grock-500 hover:text-grock-400"
                >
                  {rec.type === 'create_goal' ? 'Create Goal' : 'Update Progress'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreateGoal} className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Create New Goal</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Goal Name</label>
              <input
                type="text"
                value={newGoal.name}
                onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                className="w-full p-2 rounded bg-gray-700 border border-gray-600"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={newGoal.category}
                onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value })}
                className="w-full p-2 rounded bg-gray-700 border border-gray-600"
              >
                <option value="SAVING">Saving</option>
                <option value="INVESTMENT">Investment</option>
                <option value="DEBT">Debt Payoff</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Target Amount</label>
              <input
                type="number"
                value={newGoal.targetAmount}
                onChange={(e) => setNewGoal({ ...newGoal, targetAmount: Number(e.target.value) })}
                className="w-full p-2 rounded bg-gray-700 border border-gray-600"
                required
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Current Amount</label>
              <input
                type="number"
                value={newGoal.currentAmount}
                onChange={(e) => setNewGoal({ ...newGoal, currentAmount: Number(e.target.value) })}
                className="w-full p-2 rounded bg-gray-700 border border-gray-600"
                required
                min="0"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-grock-500 text-white rounded hover:bg-grock-600"
            >
              Create Goal
            </button>
          </div>
        </form>
      )}

      {!loading && !error && goals.length === 0 && (
        <div className="text-center p-8 bg-gray-800 rounded-lg">
          <p className="text-xl">No goals yet! 🎯</p>
          <p className="text-gray-400 mt-2">Click "New Goal" to start tracking your financial goals.</p>
        </div>
      )}

      {!loading && !error && goals.length > 0 && (
        <div className="space-y-4">
          {goals.map((goal) => (
            <div key={goal.id} className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold">{goal.name}</h3>
                  <p className="text-gray-400">{goal.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-grock-500">
                    ${goal.currentAmount.toLocaleString()} / ${goal.targetAmount.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-400">
                    {calculateProgress(goal.currentAmount, goal.targetAmount).toFixed(1)}% Complete
                  </p>
                </div>
              </div>
              
              <div className="w-full bg-gray-700 rounded-full h-2.5 mb-4">
                <div
                  className="bg-grock-500 h-2.5 rounded-full"
                  style={{ width: `${calculateProgress(goal.currentAmount, goal.targetAmount)}%` }}
                ></div>
              </div>

              {goal.aiInsights && (
                <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-300">{goal.aiInsights}</p>
                </div>
              )}

              <div className="flex justify-between items-center">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleUpdateProgress(goal.id, goal.currentAmount + 100)}
                    className="px-3 py-1 bg-grock-500 text-white rounded hover:bg-grock-600 text-sm"
                  >
                    +$100
                  </button>
                  <button
                    onClick={() => handleUpdateProgress(goal.id, goal.currentAmount + 500)}
                    className="px-3 py-1 bg-grock-500 text-white rounded hover:bg-grock-600 text-sm"
                  >
                    +$500
                  </button>
                  <button
                    onClick={() => fetchAIInsights(goal.id)}
                    className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 text-sm flex items-center"
                  >
                    <SparklesIcon className="h-4 w-4 mr-1" />
                    Get Insights
                  </button>
                </div>
                {goal.deadline && (
                  <p className="text-sm text-gray-400">
                    Deadline: {new Date(goal.deadline).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GoalsPage; 