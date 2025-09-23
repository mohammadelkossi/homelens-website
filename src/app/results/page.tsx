'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Calculator, MapPin, CheckCircle, AlertCircle, TrendingUp, Star, ArrowLeft, Share2, Check } from 'lucide-react';
import { AnalysisResults } from '@/types/property';

export default function ResultsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    console.log('Results page - useEffect triggered');
    console.log('Results page - window available:', typeof window !== 'undefined');

    if (typeof window === 'undefined') {
      console.log('Results page - server side, skipping');
      setLoading(false);
      return;
    }

    // Try multiple methods to get the data
    const sessionData = sessionStorage.getItem('analysisResults');
    const localData = localStorage.getItem('analysisResults');
    const globalData = (window as any).analysisResults;
    const urlData = searchParams.get('data');

    console.log('Results page - sessionData:', sessionData ? 'exists' : 'null');
    console.log('Results page - localData:', localData ? 'exists' : 'null');
    console.log('Results page - globalData:', globalData ? 'exists' : 'null');
    console.log('Results page - urlData:', urlData);

    let parsedResults = null;

    // Try global variable first (most reliable)
    if (globalData) {
      console.log('Results page - using global data');
      parsedResults = globalData;
      // Clear global data
      (window as any).analysisResults = null;
    }
    // Try sessionStorage
    else if (sessionData) {
      try {
        console.log('Results page - using sessionStorage data');
        parsedResults = JSON.parse(sessionData);
        sessionStorage.removeItem('analysisResults');
      } catch (err) {
        console.error('Results page - parse error from session:', err);
      }
    }
    // Try localStorage
    else if (localData) {
      try {
        console.log('Results page - using localStorage data');
        parsedResults = JSON.parse(localData);
        localStorage.removeItem('analysisResults');
      } catch (err) {
        console.error('Results page - parse error from local:', err);
      }
    }
    // Try URL params
    else if (urlData) {
      try {
        console.log('Results page - using URL data');
        parsedResults = JSON.parse(decodeURIComponent(urlData));
      } catch (err) {
        console.error('Results page - parse error from URL:', err);
      }
    }

    if (parsedResults) {
      console.log('Results page - successfully loaded results:', parsedResults);
      setResults(parsedResults);

      // Generate shareable URL
      if (typeof window !== 'undefined') {
        const encodedData = encodeURIComponent(JSON.stringify(parsedResults));
        const shareUrl = `${window.location.origin}/results?data=${encodedData}`;
        setShareUrl(shareUrl);
      }
    } else {
      console.log('Results page - no data found in any method');
      setError('No analysis data found');
    }

    setLoading(false);
  }, [searchParams]);

  const handleShare = async () => {
    if (shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
        // Fallback: show the URL in a prompt
        prompt('Copy this URL to share:', shareUrl);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="h-10 w-10 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-900 mb-2">Error</h2>
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => router.push('/preferences-redesign')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Preferences
          </button>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <AlertCircle className="h-10 w-10 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-yellow-900 mb-2">No Analysis Data</h2>
          <p className="text-yellow-700">Please go back and perform an analysis.</p>
          <button
            onClick={() => router.push('/preferences-redesign')}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Back to Preferences
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#F7F7F7'}}>
      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Results Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => router.push('/preferences-redesign')}
                    className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                    <Star className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Property Analysis</h3>
                    <p className="text-sm text-gray-600">Comprehensive investment evaluation</p>
                  </div>
                </div>

                {results && (
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4" />
                        Share
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="p-6">

              {/* Property Details */}
              <div className="mb-8">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-500" />
                  Property Details
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700 mb-1 font-medium">Address</p>
                    <p className="font-semibold text-gray-900">{results.propertyData.address}</p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
                    <p className="text-sm text-green-700 mb-1 font-medium">Price</p>
                    <p className="font-semibold text-gray-900 text-lg">£{results.propertyData.price.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                    <p className="text-sm text-purple-700 mb-1 font-medium">Size</p>
                    <p className="font-semibold text-gray-900">
                      {results.propertyData.size ? `${results.propertyData.size} sqm` : 'Not available'}
                    </p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                    <p className="text-sm text-orange-700 mb-1 font-medium">Bedrooms</p>
                    <p className="font-semibold text-gray-900">{results.propertyData.bedrooms}</p>
                  </div>
                </div>
              </div>

              {/* Price per Square Metre Analysis */}
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <h4 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Price per Square Metre Analysis
                </h4>

                {results.propertyData.size ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                        £{results.categories.financials.breakdown.pricePerSqm?.score?.toLocaleString() || 'N/A'} / sqm
                      </div>
                      <p className="text-blue-800 text-lg font-medium">
                        {results.categories.financials.breakdown.pricePerSqm?.description || 'Price per square metre analysis'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-yellow-700 text-sm">Unable to calculate price per square metre</p>
                  </div>
                )}
              </div>

              {/* Overall Score */}
              <div className="mb-8">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                  <h4 className="text-xl font-semibold text-green-900 mb-4 flex items-center gap-2">
                    <Star className="h-6 w-6" />
                    Overall Investment Score
                  </h4>
                  <div className="text-center">
                    <div className="text-5xl font-bold text-green-600 mb-3">
                      {results.overallScore}/100
                    </div>
                    <div className="w-full bg-green-200 rounded-full h-3 mb-4">
                      <div
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-1000"
                        style={{ width: `${results.overallScore}%` }}
                      ></div>
                    </div>
                    <p className="text-green-800 font-semibold text-lg">
                      {results.overallScore >= 80 ? '🌟 Excellent Investment' :
                       results.overallScore >= 60 ? '👍 Good Investment' :
                       results.overallScore >= 40 ? '⚠️ Fair Investment' : '❌ Poor Investment'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Category Scores */}
              <div className="mb-8">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  Category Breakdown
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  {Object.entries(results.categories).map(([category, data]) => (
                    <div key={category} className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-semibold text-gray-900 capitalize">{category}</h5>
                        <span className="text-xl font-bold text-blue-600">{data.score}/100</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-1000"
                          style={{ width: `${data.score}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Criteria */}
              {results.categories.customCriteria && (
                <div className="bg-purple-50 rounded-lg p-4 mb-6">
                  <h4 className="text-lg font-semibold text-purple-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Custom Criteria Analysis
                  </h4>
                  <ul className="space-y-2">
                    {Object.entries(results.categories.customCriteria.breakdown).map(([key, item]) => (
                      <li key={key} className="flex items-center justify-between text-purple-800">
                        <span>{(item as any).description}</span>
                        <span className="font-medium">{(item as any).score}/100</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Market Metrics */}
              {results.marketMetrics && (
                <div className="bg-yellow-50 rounded-lg p-4 mb-6">
                  <h4 className="text-lg font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Market Metrics
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                    <div className="flex items-center justify-between text-yellow-800">
                      <span>Avg Price/Sqm (Listed):</span>
                      <span className="font-medium">
                        {results.marketMetrics.avgListedPricePerSqmPostcode ? `£${results.marketMetrics.avgListedPricePerSqmPostcode.toLocaleString()}` : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-yellow-800">
                      <span>Avg Price/Sqm (Sold):</span>
                      <span className="font-medium">
                        {results.marketMetrics.avgSoldPricePerSqmPostcode ? `£${results.marketMetrics.avgSoldPricePerSqmPostcode.toLocaleString()}` : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-yellow-800">
                      <span>Avg Annual Growth (%):</span>
                      <span className="font-medium">
                        {results.marketMetrics.avgAnnualPriceGrowthPct ? `${results.marketMetrics.avgAnnualPriceGrowthPct.toFixed(2)}%` : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-yellow-800">
                      <span>Sold Price Change (1M):</span>
                      <span className="font-medium">
                        {results.marketMetrics.soldPriceChangePct?.last1m ? `${results.marketMetrics.soldPriceChangePct.last1m.toFixed(2)}%` : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-yellow-800">
                      <span>Sold Price Change (3M):</span>
                      <span className="font-medium">
                        {results.marketMetrics.soldPriceChangePct?.last3m ? `${results.marketMetrics.soldPriceChangePct.last3m.toFixed(2)}%` : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-yellow-800">
                      <span>Sold Price Change (6M):</span>
                      <span className="font-medium">
                        {results.marketMetrics.soldPriceChangePct?.last6m ? `${results.marketMetrics.soldPriceChangePct.last6m.toFixed(2)}%` : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-yellow-800">
                      <span>Sold Price Change (1Y):</span>
                      <span className="font-medium">
                        {results.marketMetrics.soldPriceChangePct?.last12m ? `${results.marketMetrics.soldPriceChangePct.last12m.toFixed(2)}%` : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-yellow-800">
                      <span>Avg Sold Price (90D, Banded):</span>
                      <span className="font-medium">
                        {results.marketMetrics.bandedAvgSoldPriceLast90d?.avgSoldPrice ? `£${results.marketMetrics.bandedAvgSoldPriceLast90d.avgSoldPrice.toLocaleString()}` : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {results.recommendations && results.recommendations.length > 0 && (
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Recommendations
                  </h4>
                  <ul className="space-y-2">
                    {results.recommendations.map((recommendation, index) => (
                      <li key={index} className="flex items-start gap-2 text-yellow-800">
                        <span className="text-yellow-600 mt-1">•</span>
                        <span>{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}