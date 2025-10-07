'use client';

import { useState } from 'react';

export default function SimpleLandingPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGetStarted = () => {
    console.log('🚀 Button clicked!');
    setIsLoading(true);
    // Simple navigation
    setTimeout(() => {
      window.location.href = '/preferences-redesign';
    }, 100);
  };

  return (
    <div className="min-h-screen bg-yellow-100 p-8">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">
          Find Your Dream Home 🏡
        </h1>
        
        <p className="text-xl text-gray-600 mb-8">
          Skip the guesswork. Get personalised insights based on your choices.
        </p>
        
        <button
          onClick={handleGetStarted}
          disabled={isLoading}
          className={`px-8 py-4 text-white rounded-xl text-lg font-medium transition-colors ${
            isLoading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isLoading ? 'Loading...' : 'Get Started for Free'}
        </button>
        
        <div className="mt-8">
          <p className="text-sm text-gray-500">
            Test page - if this works, the issue is with the main landing page
          </p>
        </div>
      </div>
    </div>
  );
}
