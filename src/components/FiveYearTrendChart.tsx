'use client';

import React from 'react';
import { YearlyTrendData } from '@/lib/enhancedLandRegistry';

interface FiveYearTrendChartProps {
  data: YearlyTrendData[];
  postcode: string;
  propertyType: string;
}

const FiveYearTrendChart: React.FC<FiveYearTrendChartProps> = ({ data, postcode, propertyType }) => {
  if (!data || data.length === 0) {
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">No trend data available for {postcode} {propertyType}</p>
      </div>
    );
  }

  // Find the min and max values for scaling
  const validData = data.filter(d => d.averagePrice > 0);
  const maxPrice = Math.max(...validData.map(d => d.averagePrice));
  const minPrice = Math.min(...validData.map(d => d.averagePrice));
  const priceRange = maxPrice - minPrice;

  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold mb-3 text-gray-700">
        5-Year Price Trend for {postcode} {propertyType}
      </h4>
      
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        {/* Chart Container */}
        <div className="relative h-64 mb-4">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-8 w-16 flex flex-col justify-between text-xs text-gray-500">
            <div>£{Math.round(maxPrice / 1000)}k</div>
            <div>£{Math.round((maxPrice - priceRange * 0.25) / 1000)}k</div>
            <div>£{Math.round((maxPrice - priceRange * 0.5) / 1000)}k</div>
            <div>£{Math.round((maxPrice - priceRange * 0.75) / 1000)}k</div>
            <div>£{Math.round(minPrice / 1000)}k</div>
          </div>

          {/* Chart Area */}
          <div className="ml-20 mr-4 h-full relative">
            {/* Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between">
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
                <div key={index} className="border-t border-gray-100"></div>
              ))}
            </div>

            {/* Data Points and Lines */}
            <div className="relative h-full">
              {validData.map((point, index) => {
                const height = priceRange > 0 ? ((point.averagePrice - minPrice) / priceRange) * 100 : 50;
                const left = (index / (validData.length - 1)) * 100;
                
                return (
                  <div key={point.year}>
                    {/* Data Point */}
                    <div
                      className="absolute w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-sm transform -translate-x-1/2 -translate-y-1/2 z-10"
                      style={{
                        left: `${left}%`,
                        bottom: `${height}%`
                      }}
                      title={`${point.year}: £${Math.round(point.averagePrice / 1000)}k (${point.salesCount} sales)`}
                    />
                    
                    {/* Connecting Line */}
                    {index < validData.length - 1 && (
                      <div
                        className="absolute h-0.5 bg-blue-500 z-0"
                        style={{
                          left: `${left}%`,
                          bottom: `${height}%`,
                          width: `${100 / (validData.length - 1)}%`,
                          transform: 'translateY(-50%)'
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* X-axis labels */}
          <div className="flex justify-between ml-20 mr-4 mt-2">
            {validData.map(point => (
              <div key={point.year} className="text-xs text-gray-500">
                {point.year}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Average Price</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500"></div>
            <span>Price Trend</span>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Total Sales:</span>
            <span className="ml-2 font-medium">{validData.reduce((sum, d) => sum + d.salesCount, 0)}</span>
          </div>
          <div>
            <span className="text-gray-500">Price Range:</span>
            <span className="ml-2 font-medium">
              £{Math.round(minPrice / 1000)}k - £{Math.round(maxPrice / 1000)}k
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FiveYearTrendChart;
