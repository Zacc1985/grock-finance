import OnboardingButton from '../components/OnboardingButton';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <OnboardingButton />
          </div>
          {/* Rest of your dashboard content */}
        </div>
      </div>
    </div>
  );
} 