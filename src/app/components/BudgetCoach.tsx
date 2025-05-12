import React, { useEffect, useState } from 'react';
import { 
  ExclamationTriangleIcon, 
  LightBulbIcon,
  ArrowTrendingUpIcon,
  SparklesIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { generateCoachingMessage } from '../utils/budgetCoaching';
import BudgetTotalPopup from './BudgetTotalPopup';

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
  const [localAnalysis, setLocalAnalysis] = useState<BudgetAnalysis | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const fetchBudgetAnalysis = async () => {
      try {
        const response = await fetch('/api/budget/impact');
        if (!response.ok) {
          throw new Error('Failed to fetch budget analysis');
        }
        const data = await response.json();
        setAnalysis(data);
        setLocalAnalysis(data);
        setCoachingMessage(generateCoachingMessage(data));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchBudgetAnalysis();
  }, []);

  // Update local analysis and coaching message when amounts change
  useEffect(() => {
    if (localAnalysis) {
      setCoachingMessage(generateCoachingMessage(localAnalysis));
    }
  }, [localAnalysis]);

  const handleUpdateAmount = (type: 'needs' | 'wants' | 'savings', newAmount: number) => {
    if (!localAnalysis) return;

    setLocalAnalysis(prev => {
      if (!prev) return null;
      return {
        ...prev,
        needsSpent: type === 'needs' ? newAmount : prev.needsSpent,
        wantsSpent: type === 'wants' ? newAmount : prev.wantsSpent,
        savingsSpent: type === 'savings' ? newAmount : prev.savingsSpent,
      };
    });
  };

  const handleResetAmount = (type: 'needs' | 'wants' | 'savings') => {
    if (!analysis || !localAnalysis) return;

    setLocalAnalysis(prev => {
      if (!prev) return null;
      return {
        ...prev,
        needsSpent: type === 'needs' ? analysis.needsSpent : prev.needsSpent,
        wantsSpent: type === 'wants' ? analysis.wantsSpent : prev.wantsSpent,
        savingsSpent: type === 'savings' ? analysis.savingsSpent : prev.savingsSpent,
      };
    });
  };

  const handleResetAll = async () => {
    if (!confirm('Are you sure you want to reset all budget categories? This will clear all transactions and reset goals to their initial state.')) {
      return;
    }

    setIsResetting(true);
    try {
      const response = await fetch('/api/budget/reset', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to reset budget categories');
      }

      // Refresh the analysis after reset
      const analysisResponse = await fetch('/api/budget/impact');
      if (!analysisResponse.ok) {
        throw new Error('Failed to fetch updated budget analysis');
      }
      const data = await analysisResponse.json();
      setAnalysis(data);
      setLocalAnalysis(data);
      setCoachingMessage(generateCoachingMessage(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while resetting');
    } finally {
      setIsResetting(false);
    }
  };

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

  if (!localAnalysis || !coachingMessage) {
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
      {/* Reset Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handleResetAll}
          disabled={isResetting}
          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white 
            ${isResetting 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
            }`}
        >
          <ArrowPathIcon className={`h-4 w-4 mr-2 ${isResetting ? 'animate-spin' : ''}`} />
          {isResetting ? 'Resetting...' : 'Reset All Categories'}
        </button>
      </div>

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
            <BudgetTotalPopup
              label="Needs (50%)"
              currentAmount={localAnalysis.needsSpent}
              targetAmount={localAnalysis.monthlyIncome * 0.5}
              onUpdate={(amount) => handleUpdateAmount('needs', amount)}
              onReset={() => handleResetAmount('needs')}
              type="needs"
            />
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full ${
                  localAnalysis.needsSpent > localAnalysis.monthlyIncome * 0.5
                    ? 'bg-red-500'
                    : localAnalysis.needsSpent > localAnalysis.monthlyIncome * 0.4
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{
                  width: `${Math.min((localAnalysis.needsSpent / (localAnalysis.monthlyIncome * 0.5)) * 100, 100)}%`
                }}
              ></div>
            </div>
          </div>

          {/* Wants */}
          <div>
            <BudgetTotalPopup
              label="Wants (30%)"
              currentAmount={localAnalysis.wantsSpent}
              targetAmount={localAnalysis.monthlyIncome * 0.3}
              onUpdate={(amount) => handleUpdateAmount('wants', amount)}
              onReset={() => handleResetAmount('wants')}
              type="wants"
            />
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full ${
                  localAnalysis.wantsSpent > localAnalysis.monthlyIncome * 0.3
                    ? 'bg-red-500'
                    : localAnalysis.wantsSpent > localAnalysis.monthlyIncome * 0.24
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{
                  width: `${Math.min((localAnalysis.wantsSpent / (localAnalysis.monthlyIncome * 0.3)) * 100, 100)}%`
                }}
              ></div>
            </div>
          </div>

          {/* Savings */}
          <div>
            <BudgetTotalPopup
              label="Savings (20%)"
              currentAmount={localAnalysis.savingsSpent}
              targetAmount={localAnalysis.monthlyIncome * 0.2}
              onUpdate={(amount) => handleUpdateAmount('savings', amount)}
              onReset={() => handleResetAmount('savings')}
              type="savings"
            />
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full ${
                  localAnalysis.savingsSpent < localAnalysis.monthlyIncome * 0.16
                    ? 'bg-red-500'
                    : localAnalysis.savingsSpent < localAnalysis.monthlyIncome * 0.18
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{
                  width: `${Math.min((localAnalysis.savingsSpent / (localAnalysis.monthlyIncome * 0.2)) * 100, 100)}%`
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 