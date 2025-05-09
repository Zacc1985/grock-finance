import React, { useState } from 'react';
import { useRouter } from 'next/router';

type Step = 'welcome' | 'categories' | 'bank' | 'first-transaction';

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const initializeData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/onboarding/initialize', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to initialize');
      setCurrentStep('categories');
    } catch (error) {
      console.error('Error during initialization:', error);
      alert('Failed to initialize. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <div className="text-center p-8">
            <h1 className="text-3xl font-bold mb-4">Welcome to Grock Finance!</h1>
            <p className="mb-6">Let's get your financial journey started.</p>
            <button
              onClick={initializeData}
              disabled={isLoading}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading ? 'Setting up...' : 'Get Started'}
            </button>
          </div>
        );

      case 'categories':
        return (
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold mb-4">Your Categories Are Ready!</h2>
            <p className="mb-6">
              We've set up some default categories and budgets for you.
              You can customize these later in the settings.
            </p>
            <button
              onClick={() => setCurrentStep('bank')}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
            >
              Next: Connect Your Bank
            </button>
          </div>
        );

      case 'bank':
        return (
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold mb-4">Connect Your Bank</h2>
            <p className="mb-6">
              You can either connect your bank account or upload a statement.
            </p>
            <div className="space-y-4">
              <button
                onClick={() => setCurrentStep('first-transaction')}
                className="block w-full bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
              >
                Connect Bank Account
              </button>
              <button
                onClick={() => setCurrentStep('first-transaction')}
                className="block w-full bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
              >
                Upload Statement
              </button>
            </div>
          </div>
        );

      case 'first-transaction':
        return (
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold mb-4">Record Your First Transaction</h2>
            <p className="mb-6">
              Try recording a transaction using voice or text.
            </p>
            <div className="space-y-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="block w-full bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
              >
                Try Voice Command
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="block w-full bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
              >
                Enter Manually
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 bg-white rounded-lg shadow-lg">
      {renderStep()}
    </div>
  );
} 