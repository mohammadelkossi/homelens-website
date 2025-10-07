import React from 'react';

interface PriceHistoryEntry {
  date: string;
  price: string;
  event: string;
}

interface PriceHistoryChartProps {
  priceHistory: PriceHistoryEntry[];
  currentPrice?: string;
}

const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({ priceHistory, currentPrice }) => {
  if (!priceHistory || priceHistory.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-lg font-semibold text-gray-900 mb-4">Property Price History</div>
        <div className="text-gray-500 text-center py-8">
          No price history data available
        </div>
      </div>
    );
  }

  const formatPrice = (price: string) => {
    const numPrice = parseInt(price.replace(/[^\d]/g, ''));
    if (isNaN(numPrice)) return price;
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numPrice);
  };

  const formatDate = (dateStr: string) => {
    try {
      // Handle various date formats
      let date: Date;
      
      // Try parsing as "1st Oct 2025" format
      if (dateStr.includes('st') || dateStr.includes('nd') || dateStr.includes('rd') || dateStr.includes('th')) {
        const cleanDate = dateStr.replace(/(\d+)(st|nd|rd|th)/, '$1');
        date = new Date(cleanDate);
      } else {
        date = new Date(dateStr);
      }
      
      if (isNaN(date.getTime())) return dateStr;
      
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const getPriceChange = (index: number) => {
    if (index === priceHistory.length - 1) return null;
    
    const currentPriceNum = parseInt(priceHistory[index].price.replace(/[^\d]/g, ''));
    const previousPriceNum = parseInt(priceHistory[index + 1].price.replace(/[^\d]/g, ''));
    
    if (isNaN(currentPriceNum) || isNaN(previousPriceNum)) return null;
    
    const change = currentPriceNum - previousPriceNum;
    const percentChange = ((change / previousPriceNum) * 100).toFixed(1);
    
    return { change, percentChange };
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return '↗️';
    if (change < 0) return '↘️';
    return '→';
  };

  const calculateAverageAnnualGrowth = () => {
    if (!priceHistory || priceHistory.length === 0 || !currentPrice) {
      return null;
    }

    // Get the first (oldest) sale
    const firstSale = priceHistory[priceHistory.length - 1];
    const firstSalePrice = parseInt(firstSale.price.replace(/[^\d]/g, ''));
    const currentPriceNum = parseInt(currentPrice.replace(/[^\d]/g, ''));
    
    if (isNaN(firstSalePrice) || isNaN(currentPriceNum) || firstSalePrice === 0) {
      return null;
    }

    // Calculate years between first sale and current listing
    const firstSaleYear = parseInt(firstSale.date);
    const currentYear = new Date().getFullYear();
    const years = currentYear - firstSaleYear;
    
    if (years <= 0) {
      return null;
    }

    // Calculate CAGR: (Ending Value / Beginning Value)^(1/Years) - 1
    const cagr = Math.pow(currentPriceNum / firstSalePrice, 1 / years) - 1;
    
    return {
      percentage: (cagr * 100).toFixed(1),
      years: years,
      firstSaleYear: firstSaleYear,
      firstSalePrice: firstSalePrice,
      currentPrice: currentPriceNum
    };
  };

  const growthData = calculateAverageAnnualGrowth();

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="text-lg font-semibold text-gray-900 mb-4">Property Price History</div>
      
      {/* Average Annual Growth Summary */}
      {growthData && (
        <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-green-700">Average Annual Growth</div>
              <div className="text-xs text-green-600">
                From {growthData.firstSaleYear} to {new Date().getFullYear()} ({growthData.years} years)
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-700">+{growthData.percentage}%</div>
              <div className="text-xs text-green-600">
                {formatPrice(growthData.firstSalePrice.toString())} → {formatPrice(growthData.currentPrice.toString())}
              </div>
            </div>
          </div>
        </div>
      )}

      {currentPrice && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-600 font-medium">Current Price</div>
          <div className="text-xl font-bold text-blue-900">{formatPrice(currentPrice)}</div>
        </div>
      )}

      <div className="space-y-3">
        {priceHistory.map((entry, index) => {
          const priceChange = getPriceChange(index);
          
          return (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-gray-900">
                    {formatPrice(entry.price)}
                  </span>
                  {priceChange && (
                    <span className={`text-sm font-medium ${getChangeColor(priceChange.change)}`}>
                      {getChangeIcon(priceChange.change)} {formatPrice(Math.abs(priceChange.change).toString())}
                      ({priceChange.percentChange}%)
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  {formatDate(entry.date)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {entry.event}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {priceHistory.length > 0 && (
        <div className="mt-4 text-xs text-gray-500 text-center">
          Showing last {priceHistory.length} price changes
        </div>
      )}
    </div>
  );
};

export default PriceHistoryChart;
