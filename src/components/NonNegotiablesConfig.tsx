'use client';

import { useState } from 'react';
import { Settings, Minus, Plus } from 'lucide-react';

interface NonNegotiablesConfigProps {
  onConfigChange: (config: {
    minBathrooms: number;
    minSize: number;
    requiresGarden: boolean;
    requiresParking: boolean;
  }) => void;
}

export default function NonNegotiablesConfig({ onConfigChange }: NonNegotiablesConfigProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState({
    minBathrooms: 2,
    minSize: 100,
    requiresGarden: true,
    requiresParking: false,
  });

  const updateConfig = (updates: Partial<typeof config>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 border border-slate-200 dark:border-slate-700">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 w-full text-left"
      >
        <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
          <Settings className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">Non-Negotiables</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Customize your essential requirements
          </p>
        </div>
      </button>

      {isOpen && (
        <div className="mt-6 space-y-4">
          {/* Minimum Bathrooms */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Minimum Bathrooms
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => updateConfig({ minBathrooms: Math.max(1, config.minBathrooms - 1) })}
                className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="text-lg font-medium text-slate-900 dark:text-white min-w-[2rem] text-center">
                {config.minBathrooms}
              </span>
              <button
                onClick={() => updateConfig({ minBathrooms: Math.min(10, config.minBathrooms + 1) })}
                className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Minimum Size */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Minimum Size (sqm)
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => updateConfig({ minSize: Math.max(50, config.minSize - 10) })}
                className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="text-lg font-medium text-slate-900 dark:text-white min-w-[3rem] text-center">
                {config.minSize}
              </span>
              <button
                onClick={() => updateConfig({ minSize: Math.min(1000, config.minSize + 10) })}
                className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Garden Requirement */}
          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.requiresGarden}
                onChange={(e) => updateConfig({ requiresGarden: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Requires Garden
              </span>
            </label>
          </div>

          {/* Parking Requirement */}
          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.requiresParking}
                onChange={(e) => updateConfig({ requiresParking: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Requires Parking
              </span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

