import React, { useEffect, useState } from 'react';
import { 
  ExclamationTriangleIcon, 
  LightBulbIcon,
  ArrowTrendingUpIcon,
  SparklesIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { generateCoachingMessage } from '../utils/budgetCoaching';

interface Category {
  id: string;
  name: string;
  budget?: number;
}

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
  monthlyRequired: number;
}

interface BudgetAnalysis {
  monthlyIncome: number;
  needsSpent: number;
  wantsSpent: number;
  savingsSpent: number;
  categoryBreakdown: Array<{
    category: string;
    spent: number;
    budget?: number;
  }>;
  goals: Goal[];
}

interface CoachingMessage {
  mainMessage: string;
  details: string[];
  suggestions: string[];
  severity: 'success' | 'warning' | 'danger';
}

export default function BudgetCoach() {
  const [analysis, setAnalysis] = useState<BudgetAnalysis | null>(null);
  const [coachingMessage, setCoachingMessage] = useState<CoachingMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBudgetAnalysis = async () => {
      try {
        const response = await fetch('/api/budget/impact');
        if (!response.ok) {
          throw new Error('Failed to fetch budget analysis');
        }
        const data = await response.json();
        setAnalysis(data);
        setCoachingMessage(generateCoachingMessage(data));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchBudgetAnalysis();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-lg p-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis || !coachingMessage) {
    return null;
  }

  const getSeverityColor = (severity: 'success' | 'warning' | 'danger') => {
    switch (severity) {
      case 'success':
        return 'text-green-600 bg-green-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'danger':
        return 'text-red-600 bg-red-50';
    }
  };

  const getSeverityIcon = (severity: 'success' | 'warning' | 'danger') => {
    switch (severity) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5" />;
      case 'warning':
      case 'danger':
        return <ExclamationTriangleIcon className="h-5 w-5" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className={`rounded-lg p-4 mb-6 ${getSeverityColor(coachingMessage.severity)}`}>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {getSeverityIcon(coachingMessage.severity)}
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium">{coachingMessage.mainMessage}</h3>
          </div>
        </div>
      </div>

      {/* Details Section */}
      <div className="space-y-4 mb-6">
        {coachingMessage.details.map((detail, index) => (
          <div key={index} className="flex items-start">
            <div className="flex-shrink-0">
              <div className="h-2 w-2 rounded-full bg-gray-400 mt-2"></div>
            </div>
            <p className="ml-3 text-sm text-gray-700">{detail}</p>
          </div>
        ))}
      </div>

      {/* Suggestions Section */}
      {coachingMessage.suggestions.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center mb-4">
            <LightBulbIcon className="h-5 w-5 text-yellow-500 mr-2" />
            <h4 className="text-sm font-medium text-gray-900">Suggestions</h4>
          </div>
          <ul className="space-y-3">
            {coachingMessage.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-yellow-400 mt-2"></div>
                </div>
                <p className="ml-3 text-sm text-gray-700">{suggestion}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Budget Breakdown */}
      <div className="mt-6 border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-900 mb-4">Budget Breakdown</h4>
        <div className="space-y-4">
          {/* Needs */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Needs (50%)</span>
              <span className="text-gray-900">
                ${analysis.needsSpent.toFixed(2)} / ${(analysis.monthlyIncome * 0.5).toFixed(2)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  analysis.needsSpent > analysis.monthlyIncome * 0.5
                    ? 'bg-red-500'
                    : analysis.needsSpent > analysis.monthlyIncome * 0.4
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{
                  width: `${Math.min((analysis.needsSpent / (analysis.monthlyIncome * 0.5)) * 100, 100)}%`
                }}
              ></div>
            </div>
          </div>

          {/* Wants */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Wants (30%)</span>
              <span className="text-gray-900">
                ${analysis.wantsSpent.toFixed(2)} / ${(analysis.monthlyIncome * 0.3).toFixed(2)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  analysis.wantsSpent > analysis.monthlyIncome * 0.3
                    ? 'bg-red-500'
                    : analysis.wantsSpent > analysis.monthlyIncome * 0.24
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{
                  width: `${Math.min((analysis.wantsSpent / (analysis.monthlyIncome * 0.3)) * 100, 100)}%`
                }}
              ></div>
            </div>
          </div>

          {/* Savings */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Savings (20%)</span>
              <span className="text-gray-900">
                ${analysis.savingsSpent.toFixed(2)} / ${(analysis.monthlyIncome * 0.2).toFixed(2)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  analysis.savingsSpent < analysis.monthlyIncome * 0.16
                    ? 'bg-red-500'
                    : analysis.savingsSpent < analysis.monthlyIncome * 0.18
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{
                  width: `${Math.min((analysis.savingsSpent / (analysis.monthlyIncome * 0.2)) * 100, 100)}%`
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 