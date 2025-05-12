import React, { useState } from 'react';
import { GiftIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface Category {
  id: string;
  name: string;
}

interface SpontaneousSpendingProps {
  categories: Category[];
}

export default function SpontaneousSpending({ categories }: SpontaneousSpendingProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [impact, setImpact] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setImpact(null);

    try {
      const response = await fetch('/api/transactions/spontaneous', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          description,
          categoryId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process spontaneous spending');
      }

      const data = await response.json();
      setImpact(data.impact);
      
      // Reset form
      setAmount('');
      setDescription('');
      setCategoryId('');
    } catch (err) {
      setError('Failed to process your spontaneous spending. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
      <div className="flex items-center mb-4">
        <GiftIcon className="h-8 w-8 text-grock-500 mr-3" />
        <h2 className="text-xl font-semibold">Spontaneous Spending</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="How much did you spend?"
            className="w-full p-2 rounded bg-gray-700 border border-gray-600"
            required
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What did you buy?"
            className="w-full p-2 rounded bg-gray-700 border border-gray-600"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 border border-gray-600"
            required
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 px-4 rounded-lg text-white font-medium ${
            loading
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-grock-500 hover:bg-grock-600'
          }`}
        >
          {loading ? 'Processing...' : 'Log Spontaneous Spending'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
          {error}
        </div>
      )}

      {impact && (
        <div className="mt-6 space-y-4">
          <div className={`p-4 rounded-lg ${
            impact.remainingWantBudget < 0
              ? 'bg-red-900/50 border border-red-500'
              : 'bg-green-900/50 border border-green-500'
          }`}>
            <div className="flex items-center mb-2">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
              <h3 className="font-semibold">Budget Impact</h3>
            </div>
            <p>{impact.message}</p>
          </div>

          <div className="bg-gray-700/50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Category Breakdown</h3>
            <div className="space-y-2">
              {impact.categoryBreakdown.map((cat: any) => (
                <div key={cat.category} className="flex justify-between">
                  <span>{cat.category}</span>
                  <span className="font-mono">${cat.spent.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 