'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface ScoreChartProps {
  categories: {
    financials: { score: number; maxScore: number };
    convenience: { score: number; maxScore: number };
    fundamentals: { score: number; maxScore: number };
    nonNegotiables: { score: number; maxScore: number };
  };
  overallScore: number;
}

const COLORS = {
  financials: '#10b981', // green
  convenience: '#3b82f6', // blue
  fundamentals: '#8b5cf6', // purple
  nonNegotiables: '#f59e0b', // orange
};

export default function ScoreChart({ categories, overallScore }: ScoreChartProps) {
  const pieData = [
    { name: 'Financials', value: categories.financials.score, color: COLORS.financials },
    { name: 'Convenience', value: categories.convenience.score, color: COLORS.convenience },
    { name: 'Fundamentals', value: categories.fundamentals.score, color: COLORS.fundamentals },
    { name: 'Non-Negotiables', value: categories.nonNegotiables.score, color: COLORS.nonNegotiables },
  ];

  const barData = [
    { name: 'Financials', score: categories.financials.score, maxScore: categories.financials.maxScore },
    { name: 'Convenience', score: categories.convenience.score, maxScore: categories.convenience.maxScore },
    { name: 'Fundamentals', score: categories.fundamentals.score, maxScore: categories.fundamentals.maxScore },
    { name: 'Non-Negotiables', score: categories.nonNegotiables.score, maxScore: categories.nonNegotiables.maxScore },
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 border border-slate-200 dark:border-slate-700">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
        Score Breakdown
      </h3>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div>
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4 text-center">
            Category Distribution
          </h4>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [`${value}/100`, 'Score']}
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div>
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4 text-center">
            Category Scores
          </h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                stroke="#64748b"
              />
              <YAxis 
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                stroke="#64748b"
              />
              <Tooltip 
                formatter={(value: number) => [`${value}/100`, 'Score']}
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white'
                }}
              />
              <Bar 
                dataKey="score" 
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Overall Score Circle */}
      <div className="mt-6 text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full border-4 border-blue-200 dark:border-blue-800">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {overallScore}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              /100
            </div>
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Overall Investment Score
        </p>
      </div>
    </div>
  );
}

