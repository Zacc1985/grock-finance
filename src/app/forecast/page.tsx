'use client';

import React, { useEffect, useState } from 'react';
import { CalendarIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  nextDueDate: string;
  category: {
    name: string;
  };
  bucket: string;
  isAutomatic: boolean;
}

interface BudgetForecast {
  forecast: {
    NEED: number;
    WANT: number;
    SAVING: number;
  };
  upcomingExpenses: RecurringExpense[];
  period: string;
}

const ForecastPage: React.FC = () => {
  const [forecast, setForecast] = useState<BudgetForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchForecast = async () => {
      try {
        const response = await fetch('/api/forecast');
        if (!response.ok) {
          throw new Error('Failed to fetch forecast');
        }
        const data = await response.json();
        setForecast(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load forecast');
      } finally {
        setLoading(false);
      }
    };

    fetchForecast();
  }, []);

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

  if (!forecast) {
    return (
      <div className="text-center p-4">
        No forecast data available.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Budget Forecast</h1>
      
      {/* Forecast Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {Object.entries(forecast.forecast).map(([bucket, amount]) => (
          <div key={bucket} className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">{bucket}</h3>
            <p className="text-2xl font-bold text-grock-500">${amount.toFixed(2)}</p>
            <p className="text-sm text-gray-400">Expected in next {forecast.period}</p>
          </div>
        ))}
      </div>

      {/* Upcoming Expenses */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Upcoming Expenses</h2>
        <div className="space-y-4">
          {forecast.upcomingExpenses.map((expense) => (
            <div key={expense.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
              <div>
                <h3 className="font-medium">{expense.name}</h3>
                <p className="text-sm text-gray-400">
                  {expense.category.name} • {expense.frequency.toLowerCase()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-lg">${expense.amount.toFixed(2)}</p>
                <p className="text-sm text-gray-400">
                  Due: {new Date(expense.nextDueDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tips and Warnings */}
      <div className="mt-8 space-y-4">
        <div className="bg-yellow-900/50 border border-yellow-500/50 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-2" />
            <h3 className="font-semibold">Pro Tips</h3>
          </div>
          <ul className="mt-2 space-y-2 text-sm">
            <li>• Set up automatic payments for recurring bills to avoid late fees</li>
            <li>• Review your upcoming expenses weekly to stay on track</li>
            <li>• Consider setting aside money for upcoming expenses in a separate account</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ForecastPage; 