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
        <p className="text-sm text-gray-600">No trend data available for {postcode} {propertyType.toLowerCase()}</p>
      </div>
    );
  }

  // Find the min and max values for scaling
  const validData = data.filter(d => d.averagePrice > 0);
  const maxPrice = Math.max(...validData.map(d => d.averagePrice));
  const minPrice = Math.min(...validData.map(d => d.averagePrice));
  const priceRange = maxPrice - minPrice;

  // Calculate points for both line and markers
  const pts = React.useMemo(() => {
    // 1) raw rows with all data
    const rows = (validData ?? []).map((d, i) => ({
      i,
      year: Number(d.year ?? i),
      y: Number(d.averagePrice),
      salesCount: d.salesCount || 0,
    }));

    // 2) Filter out invalid data
    const dropped = rows.filter(r => !Number.isFinite(r.y) || r.y <= 0);
    if (dropped.length) console.warn('Dropped points (non-finite or zero y):', dropped);

    const clean = rows.filter(r => Number.isFinite(r.y) && r.y > 0);
    if (clean.length < 2) return [];

    // 3) Calculate domains
    const yVals = clean.map(r => r.y);
    const yMin = Math.min(...yVals);
    const yMax = Math.max(...yVals);

    // Add small padding for visual spacing (5%)
    const pad = (yMax - yMin) * 0.05 || 1;
    const yMinPadded = yMin - pad;
    const yMaxPadded = yMax + pad;

    const yRange = Math.max(1, yMaxPadded - yMinPadded);

    // 4) Normalize to 0..100 coords for SVG (flip Y so higher prices are at top)
    // For proper alignment, we need to account for the fact that with N points,
    // they should be evenly distributed from 0 to 100
    const pointCount = clean.length;
    return clean.map((r, idx) => {
      // Distribute points evenly across 0-100 range
      const X = pointCount === 1 ? 50 : (idx / (pointCount - 1)) * 100;
      const Y = 100 - ((r.y - yMinPadded) / yRange) * 100;
      return {
        ...r,
        X,
        Y: Math.min(100, Math.max(0, Y))
      };
    });
  }, [validData]);

  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold mb-3 text-gray-700">
        Average sold sale price for {propertyType.toLowerCase()} in {postcode}
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

          {/* Chart area - this is the key fix! */}
          <div className="ml-20 mr-4 h-full relative">
            {/* Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between">
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
                <div key={index} className="border-t border-gray-100"></div>
              ))}
            </div>

            {/* SVG for line and dots - all in the same coordinate system */}
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full"
              style={{ height: '224px' }} // Match the h-56 (14rem = 224px)
            >
              {/* Line */}
              <polyline
                fill="none"
                stroke="#368F8B"
                strokeWidth={1.75}
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
                shapeRendering="geometricPrecision"
                points={pts.map(p => `${p.X},${p.Y}`).join(" ")}
              />
              
              {/* Data Points as SVG circles for perfect alignment */}
              {pts.map((point) => (
                <g key={point.year}>
                  <circle
                    cx={point.X}
                    cy={point.Y}
                    r="1.5"
                    fill="#3B82F6"
                    stroke="white"
                    strokeWidth="0.5"
                    vectorEffect="non-scaling-stroke"
                    className="cursor-pointer"
                    opacity="0"
                  />
                  <title>{point.year}: £{Math.round(point.y / 1000)}k ({point.salesCount || 0} sales)</title>
                </g>
              ))}
            </svg>
          </div>

          {/* X-axis labels */}
          <div className="ml-20 mr-4 mt-2 relative h-4">
            {pts.map((point, idx) => (
              <div 
                key={point.year} 
                className="absolute text-xs text-gray-500"
                style={{ 
                  left: `${point.X}%`,
                  transform: `translateX(${idx === 0 ? '0' : idx === pts.length - 1 ? '-100%' : '-50%'})`
                }}
              >
                {point.year}
              </div>
            ))}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
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