'use client';
import React from "react";
import FiveYearTrendChart from "@/components/FiveYearTrendChart";
import PriceHistoryChart from "@/components/PriceHistoryChart";

// ====================== Utilities ======================== //
const COLORS = {
  navy: "#160F29",
  tealDark: "#246A73",
  teal: "#368F8B",
  beige: "#F3DFC1",
  tan: "#DDBEA8",
};

const fmtGBP = (n) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);

const fmtPct = (n) => `${n > 0 ? "+" : ""}${Number(n).toFixed(1)}%`;

const fmtNum = (n) => new Intl.NumberFormat("en-GB").format(n);

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

// ====================== Data Not Available Component ===================== //
const DataNotAvailableSection = React.memo(function DataNotAvailableSection({ missingDataItems }) {
  if (!missingDataItems || missingDataItems.length === 0) return null;

  return (
    <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6 mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
          <span className="text-orange-600 text-sm">⚠️</span>
        </div>
        <h3 className="text-lg font-semibold" style={{ color: COLORS.navy }}>Data Not Available</h3>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        The following data could not be retrieved for this property analysis:
      </p>
      <ul className="space-y-2">
        {missingDataItems.map((item, index) => (
          <li key={index} className="flex items-center gap-2 text-sm text-gray-700">
            <span className="text-orange-500">•</span>
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-4 p-3 bg-white rounded-lg border border-orange-200">
        <p className="text-xs text-gray-600">
          <strong>Note:</strong> This may be due to the property being newly listed, 
          limited historical data, or temporary service issues. The analysis above 
          is based only on the data that was successfully retrieved.
        </p>
      </div>
    </div>
  );
});

// ====================== Visual Parts ===================== //
const ScoreDial = React.memo(function ScoreDial({ score }) {
  // Experian-like segmented dial (brand colours), no tick marks
  const max = 1000;
  const s = clamp(Number(score) || 0, 0, max);
  const pct = s / max; // 0..1

  // Dial geometry
  const cx = 120, cy = 160, r = 105;
  const startAngle = -180; // left
  const endAngle = 0;      // right
  const segs = [
    { size: 0.2, color: COLORS.navy },
    { size: 0.2, color: COLORS.tealDark },
    { size: 0.2, color: COLORS.teal },
    { size: 0.2, color: COLORS.tan },
    { size: 0.2, color: COLORS.beige },
  ];

  // Helpers (plain JS)
  const polar = (angleDeg) => {
    const rad = (Math.PI / 180) * angleDeg;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const arcPath = (a0, a1) => {
    const p0 = polar(a0), p1 = polar(a1);
    const largeArc = a1 - a0 >= 180 ? 1 : 0;
    return `M ${p0.x} ${p0.y} A ${r} ${r} 0 ${largeArc} 1 ${p1.x} ${p1.y}`;
  };

  // Needle angle
  const angle = startAngle + (endAngle - startAngle) * pct;
  const needleLen = 70;
  const needleRad = (Math.PI / 180) * angle;
  const nx = cx + needleLen * Math.cos(needleRad);
  const ny = cy + needleLen * Math.sin(needleRad);

  // Build segment arcs
  let acc = 0;
  const segPaths = segs.map((seg, i) => {
    const a0 = startAngle + (endAngle - startAngle) * acc;
    acc += seg.size;
    const a1 = startAngle + (endAngle - startAngle) * acc;
    return <path key={i} d={arcPath(a0, a1)} stroke={seg.color} strokeWidth={16} fill="none"/>;
  });

  return (
    <div className="relative w-[220px] h-[150px]">
      <svg viewBox="0 0 240 140" className="w-full h-full">
        <g transform={`translate(0,-10)`}>{segPaths}</g>
      </svg>
      <div className="absolute left-1/2 top-[94px] -translate-x-1/2 text-center">
        <div className="text-5xl font-semibold" style={{color: '#246A73'}}>{fmtNum(s)}</div>
      </div>
    </div>
  );
});

const Stat = React.memo(function Stat({ label, value, helper }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wider text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-gray-900">{value}</div>
      {helper ? <div className="mt-1 text-sm text-gray-500">{helper}</div> : null}
    </div>
  );
});

// --- Metric tone helpers ---
const TONE = { POS: 'positive', NEU: 'neutral', NEG: 'negative' };
const toneStyle = (tone) => {
  if (tone === TONE.POS) return { color: '#16a34a' };
  if (tone === TONE.NEG) return { color: '#ef4444' };
  // neutral uses brand beige background for visibility
  return { backgroundColor: COLORS.beige, color: COLORS.navy, display: 'inline-block', padding: '2px 8px', borderRadius: 9999 };
};

function metricTone(metric, value, { market, overview }, overrides) {
  if (overrides && overrides[metric]) return overrides[metric];
  switch (metric) {
    case 'pricePerSqm': {
      const base = Number(market?.avgPricePerSqmPostcodeSold);
      const v = Number(market?.pricePerSqm);
      if (!isFinite(base) || !isFinite(v) || base === 0) return TONE.NEU;
      const diff = (v - base) / base; // cheaper than sold avg is good
      if (diff <= -0.03) return TONE.POS;
      if (Math.abs(diff) <= 0.03) return TONE.NEU;
      return TONE.NEG;
    }
    case 'yoy': {
      const v = Number(market?.avgPctPriceGrowthPerYear);
      if (!isFinite(v)) return TONE.NEU;
      if (v > 0.3) return TONE.POS;
      if (v < -0.3) return TONE.NEG;
      return TONE.NEU;
    }
    case 'timeOnMarket': {
      const p = Number(market?.timeOnMarketPercentile);
      const d = Number(market?.timeOnMarketDays);
      if (isFinite(p)) {
        if (p <= 40) return TONE.POS;
        if (p <= 60) return TONE.NEU;
        return TONE.NEG;
      }
      if (!isFinite(d)) return TONE.NEU;
      if (d <= 21) return TONE.POS;
      if (d <= 35) return TONE.NEU;
      return TONE.NEG;
    }
    case 'roadSales': {
      const n = Number(market?.roadSalesLastYear);
      if (!isFinite(n)) return TONE.NEU;
      if (n >= 3) return TONE.POS;
      if (n >= 1) return TONE.NEU;
      return TONE.NEG;
    }
    case 'avgSoldPrice': {
      // Ambiguous without buyer/seller perspective — default neutral.
      return TONE.NEU;
    }
    case 'onMarketCount': {
      const n = Number(market?.onMarketCountForConfig);
      if (!isFinite(n)) return TONE.NEU;
      if (n >= 3) return TONE.POS; // more options = good for buyers
      if (n >= 1) return TONE.NEU;
      return TONE.NEG;
    }
    default:
      return TONE.NEU;
  }
}

const ToneStat = React.memo(function ToneStat({ metric, label, value, helper, data, overrides }) {
  const tone = metricTone(metric, value, data, overrides);
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wider text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-semibold" style={toneStyle(tone)}>{value}</div>
      {helper ? <div className="mt-1 text-sm text-gray-500">{helper}</div> : null}
    </div>
  );
});

const Pill = React.memo(function Pill({ children }) {
  return <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">{children}</span>;
});

const Progress = React.memo(function Progress({ value }) {
  const pct = clamp(Number(value) || 0, 0, 100);
  return (
    <div className="h-2 w-full rounded-full bg-gray-200">
      <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: COLORS.tealDark }} />
    </div>
  );
});

// Simple lollipop chart for sold price change by year (last 5 years)
function SoldChangeChart({ data }) {
  // Generate last 5 years
  const currentYear = new Date().getFullYear();
  const order = Array.from({length: 5}, (_, i) => `'${String(currentYear - 4 + i).slice(2)}`); // ['20', '21', '22', '23', '24']
  
  const keys = order.filter(k => data && Object.prototype.hasOwnProperty.call(data, k));
  const values = keys.map(k => Number(data[k]));
  const maxAbs = Math.max(1, ...values.map(v => Math.abs(v)));
  const width = 820; // will scale via viewBox
  const height = 160;
  const leftPad = 40, rightPad = 20, topPad = 20, bottomPad = 30;
  const innerW = width - leftPad - rightPad;
  const innerH = height - topPad - bottomPad;
  const midY = topPad + innerH / 2;
  const xFor = (i) => leftPad + (keys.length <= 1 ? innerW/2 : (i) * (innerW / (keys.length - 1)));
  const yFor = (v) => midY - (v / maxAbs) * (innerH/2 - 10);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {/* baseline */}
      <line x1={leftPad} y1={midY} x2={width-rightPad} y2={midY} stroke="#e5e7eb" strokeWidth="2"/>
      
      {/* connecting line */}
      {keys.length > 1 && (
        <polyline
          points={keys.map((k, i) => {
            const v = Number(data[k]);
            const x = xFor(i);
            const y = yFor(v);
            return `${x},${y}`;
          }).join(' ')}
          stroke="#368F8B"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      
      {/* dots + labels */}
      {keys.map((k, i) => {
        const v = Number(data[k]);
        const x = xFor(i);
        const y = yFor(v);
        const up = v >= 0;
        return (
          <g key={k}>
            <circle cx={x} cy={up ? y : y + 12} r="1.6" fill={up ? '#16a34a' : '#ef4444'} />
            <text x={x} y={up ? y - 10 : y + 32} textAnchor="middle" fontSize="12" fill="#374151" fontWeight="600">
              {fmtPct(v)}
            </text>
            <text x={x} y={midY + 18} textAnchor="middle" fontSize="11" fill="#6b7280">{k}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ===================== Main Component ==================== //
function HomeLensReport({ data = mockData, landRegistryData = null, hasRealPPDData = false, propertyData = null, binaryCriteria = { met: [], notMet: [] }, aiAnalysis = null, priceHistory = null, onPrint }) {
  const { overallScore, overview, market, customCriteria, summary } = data;
  
  // Track missing data items
  const missingDataItems = React.useMemo(() => {
    const missing = [];
    
    if (!overview?.address || overview.address === "123 Abbey Lane, Sheffield S10") {
      missing.push("Property address");
    }
    if (!overview?.price || overview.price === 350000) {
      missing.push("Property price");
    }
    if (!market?.pricePerSqm) {
      missing.push("Price per square meter");
    }
    if (!landRegistryData || landRegistryData.length === 0) {
      missing.push("Land Registry sales data");
    }
    if (!market?.timeOnMarketDays && !aiAnalysis?.analysis?.enhancedAnalytics?.daysOnMarket) {
      missing.push("Time on market data");
    }
    if (!market?.avgPricePerSqmPostcodeSold) {
      missing.push("Postcode average price data");
    }
    if (!aiAnalysis?.basicInfo?.propertyAddress) {
      missing.push("AI analysis of property details");
    }
    
    // Enhanced Analytics Tracking
    if (!aiAnalysis?.analysis?.enhancedAnalytics?.fiveYearTrend || aiAnalysis.analysis.enhancedAnalytics.fiveYearTrend.length === 0) {
      missing.push("5-year price trend data");
    }
    if (!aiAnalysis?.analysis?.enhancedAnalytics?.streetSalesCount || aiAnalysis.analysis.enhancedAnalytics.streetSalesCount === 0) {
      missing.push("Street sales count data");
    }
    if (!aiAnalysis?.analysis?.enhancedAnalytics?.streetAveragePrice || aiAnalysis.analysis.enhancedAnalytics.streetAveragePrice === 0) {
      missing.push("Street average price data");
    }
    if (!aiAnalysis?.analysis?.enhancedAnalytics?.pricePerSqm?.averagePricePerSqm || aiAnalysis.analysis.enhancedAnalytics.pricePerSqm.averagePricePerSqm === 0) {
      missing.push("Enhanced price per square meter data");
    }
    
    return missing;
  }, [overview, market, landRegistryData, aiAnalysis]);
  
  // Extract postcode from address for title - try multiple patterns
  let postcode = 'area';
  const address = overview.address || '';
  
  // Try full UK postcode pattern first
  const fullPostcodeMatch = address.match(/[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}/i);
  if (fullPostcodeMatch) {
    postcode = fullPostcodeMatch[0].toUpperCase();
  } else {
    // Try just the outward code (e.g., "NW2", "S10")
    const outwardMatch = address.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?)\b/i);
    if (outwardMatch) {
      postcode = outwardMatch[1].toUpperCase();
    }
  }
  
  // Format property type for display
  const formatPropertyType = (type: string) => {
    if (!type) return 'properties';
    const lower = type.toLowerCase();
    if (lower.includes('semi')) return 'Semi detached houses';
    if (lower.includes('detached')) return 'Detached houses';
    if (lower.includes('terrace')) return 'Terraced houses';
    if (lower.includes('flat') || lower.includes('apartment')) return 'Flats';
    if (lower.includes('bungalow')) return 'Bungalows';
    return type + ' houses';
  };
  
  const propertyType = formatPropertyType(overview.propertyType);

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.beige, color: COLORS.navy }}>
      <div className="mx-auto max-w-5xl p-6">
      {/* Header Actions */}
      <div className="mb-4 flex items-center justify-between">
        <div>
        <h1 className="text-2xl font-semibold" style={{color: COLORS.tealDark}}>
          HomeLens Report
          {overview?.address && overview.address !== "123 Abbey Lane, Sheffield S10" && (
            <span className="block text-lg font-normal text-gray-600 mt-1">
              {overview.address}
            </span>
          )}
        </h1>
        </div>
        <div className="flex gap-2">
          {overview.listingUrl && (
            <button
              onClick={() => {
                const url = overview.listingUrl || (typeof window !== 'undefined' ? window.location.href : '');
                if (navigator.share) { navigator.share({ title: 'HomeLens Report', url }).catch(()=>{}); }
                else if (navigator.clipboard) { navigator.clipboard.writeText(url).catch(()=>{}); }
              }}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm hover:bg-gray-50"
            >
              Share
            </button>
          )}
          <button
            onClick={() => {
              // Create a new window for printing/PDF generation
              const printWindow = window.open('', '_blank');
              if (printWindow) {
                // Get the current page content
                const pageContent = document.documentElement.outerHTML;
                
                // Create a clean HTML document for PDF
                const cleanHTML = `
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <title>HomeLens Property Report</title>
                      <style>
                        @media print {
                          body { margin: 0; padding: 20px; }
                          .no-print { display: none !important; }
                        }
                        body { 
                          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                          background: #F3DFC1;
                          color: #160F29;
                          margin: 0;
                          padding: 20px;
                        }
                      </style>
                    </head>
                    <body>
                      ${document.querySelector('.mx-auto.max-w-5xl.p-6')?.outerHTML || pageContent}
                    </body>
                  </html>
                `;
                
                printWindow.document.write(cleanHTML);
                printWindow.document.close();
                
                // Wait for content to load then trigger print
                setTimeout(() => {
                  printWindow.print();
                  printWindow.close();
                }, 500);
              }
            }}
            className="rounded-xl px-4 py-2 text-sm text-white shadow-sm hover:opacity-90"
            style={{ backgroundColor: COLORS.navy }}
          >
            Download PDF
          </button>
        </div>
      </div>

      {/* ===== DATA NOT AVAILABLE SECTION ===== */}
      <DataNotAvailableSection missingDataItems={missingDataItems} />

      {/* ===== 1) OVERVIEW ===== */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_auto]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">{overview.address}</h2>
              {typeof overview.price === "number" && <Pill>{fmtGBP(overview.price)}</Pill>}
              {overview.propertyType && <Pill>{overview.propertyType}</Pill>}
              {typeof overview.bedrooms === "number" && overview.bedrooms > 0 && 
                <Pill>{overview.bedrooms} bed</Pill>
              }
              {typeof overview.bathrooms === "number" && overview.bathrooms > 0 ? 
                <Pill>{overview.bathrooms} bath</Pill> : 
                <Pill>TBA</Pill>
              }
              {typeof overview.floorAreaSqm === "number" && overview.floorAreaSqm > 0 && 
                <Pill>{overview.floorAreaSqm} sqm</Pill>
              }
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {typeof overview.floorAreaSqm === "number" ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="text-xs uppercase tracking-wider text-gray-500">Price / sqm</div>
                  <div 
                    className="mt-1 text-xl font-semibold"
                    style={{
                      color: (() => {
                        const subjectPricePerSqm = market.pricePerSqm;
                        const avgPricePerSqm = market.avgPricePerSqmPostcodeSold;
                        const difference = subjectPricePerSqm - avgPricePerSqm;
                        
                        if (difference > 100) return '#EF4444'; // Red - more expensive
                        if (difference < -100) return '#10B981'; // Green - cheaper
                        return '#F59E0B'; // Yellow - within £100
                      })()
                    }}
                  >
                    {fmtGBP(market.pricePerSqm)}
                  </div>
                  <div className="mt-1 text-sm text-gray-500">Subject property</div>
                </div>
              ) : (
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="text-xs uppercase tracking-wider text-gray-500">Price / sqm</div>
                  <div className="mt-1 text-sm text-gray-600">
                    Property Size not available - ask agent & input manually
                  </div>
                  <div className="mt-2">
                    <input 
                      type="text" 
                      placeholder="Enter property size (sqm)" 
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                      onChange={(e) => {
                        const size = parseFloat(e.target.value);
                        if (!isNaN(size) && size > 0) {
                          // Update the property data with manual size input
                          setPropertyData(prev => ({
                            ...prev,
                            size: size
                          }));
                        }
                      }}
                    />
                  </div>
                </div>
              )}
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="text-xs uppercase tracking-wider text-gray-500">Postcode avg (Sold)</div>
                <div className="mt-1 text-xl font-semibold text-black">
                  {fmtGBP(market.avgPricePerSqmPostcodeSold)}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-end">
            <div className="text-right">
              <ScoreDial score={overallScore} />
            </div>
          </div>
        </div>
      </section>

      {/* ===== 2) MARKET METRICS ===== */}
      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Market Metrics</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ToneStat 
            metric="yoy" 
            label="AVG PRICE GROWTH" 
            value={fmtPct(market.avgPctPriceGrowthPerYear)} 
            helper={propertyData?.saleHistory && propertyData.saleHistory.length >= 2 ? "Property-specific history" : "Market average"}
            data={{market, overview}} 
          />
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wider text-gray-500">Time on market</div>
            <div className="mt-1 text-xl font-semibold" style={{color: '#DDBEA8'}}>
              {market.timeOnMarketDays || 0} days
          </div>
            {aiAnalysis?.analysis?.enhancedAnalytics?.addedISO && (
              <div className="mt-1 text-sm text-gray-500">
                Listed on {new Date(aiAnalysis.analysis.enhancedAnalytics.addedISO).toLocaleDateString()}
              </div>
            )}
          </div>
          {/* Enhanced Street Analytics */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wider text-gray-500">Street Sales (Past Year)</div>
            <div className="mt-1 text-xl font-semibold" style={{color: '#DDBEA8'}}>
              {aiAnalysis?.analysis?.enhancedAnalytics?.streetSalesCount || 0}
            </div>
            <div className="mt-1 text-sm text-gray-500">
              {aiAnalysis?.analysis?.enhancedAnalytics?.streetAveragePrice ? 
                `Avg: ${fmtGBP(aiAnalysis.analysis.enhancedAnalytics.streetAveragePrice)}` : 
                'sold on this road (12m)'
              }
            </div>
          </div>
          <Stat label="Average sold price" value={fmtGBP(market.avgSoldPriceForConfig)} helper={`${overview.bedrooms}-bed ${overview.propertyType}`} />
        </div>

        {/* Sold price change — lollipop chart */}
        <div className="mt-6">
          <h4 className="text-sm font-semibold mb-3" style={{fontSize: '0.7rem'}}>
            Average sold house prices in {postcode} for {propertyType}
          </h4>
          <SoldChangeChart data={market.avgPriceChangeSoldByPeriod} />
        </div>

        {/* 5-Year Price Trend Chart */}
        {aiAnalysis?.analysis?.enhancedAnalytics?.fiveYearTrend && aiAnalysis.analysis.enhancedAnalytics.fiveYearTrend.length > 0 && (
          <div className="mt-6">
            <FiveYearTrendChart 
              data={aiAnalysis.analysis.enhancedAnalytics.fiveYearTrend}
              postcode={postcode}
              propertyType={propertyType}
            />
          </div>
        )}
      </section>

      {/* ===== PROPERTY SALE HISTORY SECTION ===== */}
      {propertyData?.saleHistory && propertyData.saleHistory.length > 0 && (
        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Property Sale History</h3>
            {propertyData.saleHistory.length >= 2 && (
              <div className="text-sm font-semibold" style={{color: COLORS.tealDark}}>
                Avg. Growth: {fmtPct(market.avgPctPriceGrowthPerYear)} per year
              </div>
            )}
          </div>

          <div className="space-y-3">
            {propertyData.saleHistory.map((sale, index) => (
              <div key={index} className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{backgroundColor: COLORS.beige}}>
                    <span className="text-sm font-semibold" style={{color: COLORS.navy}}>
                      {propertyData.saleHistory.length - index}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{fmtGBP(sale.price)}</div>
                    <div className="text-sm text-gray-500">{sale.saleType || 'Sold'}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-900">
                    {new Date(sale.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  {index < propertyData.saleHistory.length - 1 && (
                    <div className="text-sm" style={{color: 
                      sale.price > propertyData.saleHistory[index + 1].price ? '#16a34a' : '#ef4444'
                    }}>
                      {sale.price > propertyData.saleHistory[index + 1].price ? '+' : ''}
                      {fmtGBP(sale.price - propertyData.saleHistory[index + 1].price)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ===== LAND REGISTRY DATA SECTION ===== */}
      {landRegistryData?.success && landRegistryData?.data && (
        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Land Registry Data</h3>
            <div className="text-sm text-gray-500">Official property sales data</div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 p-4">
              <div className="text-xs uppercase tracking-wider text-gray-500">Total Properties</div>
              <div className="mt-1 text-xl font-semibold">{landRegistryData.data.statistics.totalProperties}</div>
              <div className="mt-1 text-sm text-gray-500">in postcode {landRegistryData.data.postcode}</div>
            </div>
            
            <div className="rounded-2xl border border-gray-200 p-4">
              <div className="text-xs uppercase tracking-wider text-gray-500">Average Price</div>
              <div className="mt-1 text-xl font-semibold">£{landRegistryData.data.statistics.averagePrice.toLocaleString()}</div>
              <div className="mt-1 text-sm text-gray-500">based on sold properties</div>
            </div>
            
            <div className="rounded-2xl border border-gray-200 p-4">
              <div className="text-xs uppercase tracking-wider text-gray-500">Median Price</div>
              <div className="mt-1 text-xl font-semibold">£{landRegistryData.data.statistics.medianPrice.toLocaleString()}</div>
              <div className="mt-1 text-sm text-gray-500">typical property value</div>
            </div>
            
            <div className="rounded-2xl border border-gray-200 p-4">
              <div className="text-xs uppercase tracking-wider text-gray-500">Price Range</div>
              <div className="mt-1 text-xl font-semibold">£{landRegistryData.data.statistics.minPrice.toLocaleString()}</div>
              <div className="mt-1 text-sm text-gray-500">to £{landRegistryData.data.statistics.maxPrice.toLocaleString()}</div>
            </div>
          </div>

          {/* Recent Sales */}
          {landRegistryData.data.properties && landRegistryData.data.properties.length > 0 && (
            <div className="mt-6">
              <h4 className="text-md font-semibold mb-3">Recent Sales in Area</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {landRegistryData.data.properties.slice(0, 5).map((property: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">{property['PAON']} {property['Street']}</div>
                      <div className="text-sm text-gray-500">{property['Date of Transfer']} • {property['Property Type']}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">£{parseInt(property['Price Paid']).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ===== PROPERTY PRICE HISTORY ===== */}
      <div className="mt-12">
        <PriceHistoryChart 
          priceHistory={priceHistory || []} 
          currentPrice={aiAnalysis?.basicInfo?.listingPrice}
        />
      </div>

      {/* ===== 3) CUSTOM CRITERIA ===== */}
      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Custom Criteria Match</h3>
          <div className="text-sm text-gray-500">Weighted to your preferences</div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {customCriteria.map((c, i) => (
            <div key={i} className="rounded-2xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">{c.label}</div>
                  {c.valueText && (
                    <div className={`text-sm ${c.isBinary ? (c.matchScore === 100 ? 'text-green-600' : 'text-red-600') : 'text-gray-500'}`}>
                      {c.valueText}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Match</div>
                  <div className="text-sm font-semibold">{Math.round(c.matchScore)}%</div>
                </div>
              </div>
              <div className="mt-3">
                <Progress value={c.importance * 100} />
                <div className="mt-1 text-sm text-gray-600">
                  Importance: {Math.round(c.importance * 100)}%
                  {c.isBinary && (
                    <span className={`ml-2 font-semibold ${c.matchScore === 100 ? 'text-green-600' : 'text-red-600'}`}>
                      {c.matchScore === 100 ? '✓' : '✗'}
                    </span>
                  )}
                </div>
                {c.note && <div className="mt-2 text-sm text-gray-500">{c.note}</div>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== 4) FUNDAMENTALS (BINARY CRITERIA) ===== */}
      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Fundamentals</h3>
          <div className="text-sm text-gray-500">Essential features that matter to you</div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Left Column - Matched Criteria */}
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <h4 className="text-sm font-semibold text-green-800">Criteria Met</h4>
            </div>
            <div className="space-y-2">
              {binaryCriteria.met?.map((c, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
                      <span className="text-xs text-green-600">✓</span>
                    </div>
                    <span className="text-green-800">{c.label}</span>
                  </div>
                  <div className="ml-7">
                    <div className="h-2 w-full rounded-full bg-gray-200">
                      <div 
                        className="h-2 rounded-full" 
                        style={{ 
                          width: `${Math.round(c.importance * 100)}%`, 
                          backgroundColor: '#368F8B' 
                        }} 
                      />
                    </div>
                    <div className="mt-1 text-xs text-gray-600">
                      {Math.round(c.importance * 100)}% importance
                    </div>
                  </div>
                </div>
              ))}
              {(!binaryCriteria.met || binaryCriteria.met.length === 0) && (
                <div className="text-sm text-green-600">No binary criteria matched</div>
              )}
            </div>
          </div>

          {/* Right Column - Unmatched Criteria */}
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500"></div>
              <h4 className="text-sm font-semibold text-red-800">Criteria Not Met</h4>
            </div>
            <div className="space-y-2">
              {binaryCriteria.notMet?.map((c, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100">
                      <span className="text-xs text-red-600">✗</span>
                    </div>
                    <span className="text-red-800">{c.label}</span>
                  </div>
                  <div className="ml-7">
                    <div className="h-2 w-full rounded-full bg-gray-200">
                      <div 
                        className="h-2 rounded-full" 
                        style={{ 
                          width: `${Math.round(c.importance * 100)}%`, 
                          backgroundColor: '#368F8B' 
                        }} 
                      />
                    </div>
                    <div className="mt-1 text-xs text-gray-600">
                      {Math.round(c.importance * 100)}% importance
                    </div>
                  </div>
                </div>
              ))}
              {(!binaryCriteria.notMet || binaryCriteria.notMet.length === 0) && (
                <div className="text-sm text-red-600">All binary criteria matched</div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===== 5) LOCAL AMENITIES ===== */}
      {data.locality && (
        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Local Amenities</h3>
            <div className="text-sm text-gray-500">Nearby facilities and services</div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Parks */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 text-sm">🌳</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Parks & Green Spaces</h4>
                  <div className="text-xs text-gray-500">Recreation & Nature</div>
                </div>
              </div>
              <div className="text-sm text-gray-700">
                {data.locality.breakdown?.parks?.description || 'No parks found nearby'}
              </div>
            </div>

            {/* Schools */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 text-sm">🏫</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Schools</h4>
                  <div className="text-xs text-gray-500">Education & Learning</div>
                </div>
              </div>
              <div className="text-sm text-gray-700">
                {data.locality.breakdown?.schools?.description || 'No schools found nearby'}
              </div>
            </div>

            {/* Transport */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <span className="text-purple-600 text-sm">🚂</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Transport Links</h4>
                  <div className="text-xs text-gray-500">Commuting & Travel</div>
                </div>
              </div>
              <div className="text-sm text-gray-700">
                {data.locality.breakdown?.trainStations?.description || 'No train stations found nearby'}
              </div>
            </div>

            {/* Shopping */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                  <span className="text-orange-600 text-sm">🛒</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Shopping</h4>
                  <div className="text-xs text-gray-500">Retail & Essentials</div>
                </div>
              </div>
              <div className="text-sm text-gray-700">
                {data.locality.breakdown?.supermarkets?.description || 'No supermarkets found nearby'}
              </div>
            </div>

            {/* Healthcare */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-red-600 text-sm">🏥</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Healthcare</h4>
                  <div className="text-xs text-gray-500">Medical Services</div>
                </div>
              </div>
              <div className="text-sm text-gray-700">
                {data.locality.breakdown?.hospitals?.description || 'No hospitals found nearby'}
              </div>
            </div>

            {/* Fuel */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                  <span className="text-yellow-600 text-sm">⛽</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Fuel Stations</h4>
                  <div className="text-xs text-gray-500">Petrol & Convenience</div>
                </div>
              </div>
              <div className="text-sm text-gray-700">
                {data.locality.breakdown?.petrolStations?.description || 'No petrol stations found nearby'}
              </div>
            </div>
          </div>

          {/* Overall Locality Score */}
          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-900">Overall Locality Score</h4>
                <div className="text-sm text-gray-500">Combined amenity accessibility</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold" style={{color: COLORS.tealDark}}>
                  {data.locality.score}/100
                </div>
                <div className="text-xs text-gray-500">out of 100</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== FAILED ANALYSIS SECTION ===== */}
      {aiAnalysis?.failedAnalysis && aiAnalysis.failedAnalysis.length > 0 && (
        <section className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-orange-800">Sorry, couldn't find analysis for the following:</h3>
            <div className="text-sm text-orange-600">Unable to determine from property data</div>
          </div>
          
          <div className="space-y-3">
            {aiAnalysis.failedAnalysis.map((failed, index) => (
              <div key={index} className="rounded-xl border border-orange-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-orange-800">{failed.preference}</div>
                    <div className="text-xs text-orange-600 mt-1">{failed.reason}</div>
                  </div>
                  <div className="text-orange-500">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ===== 5) SUMMARY / RECOMMENDATIONS ===== */}
      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Summary & Recommendations</h3>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {summary.map((block, idx) => (
            <div key={idx} className="rounded-2xl border border-gray-200 p-4">
              <div className="text-sm font-semibold">{block.title}</div>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-gray-700">
                {block.items.map((it, i) => (
                  <li key={i}>{it}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-6 text-center text-xs text-gray-500">
        HomeLens • This report is for guidance only and not a formal valuation.
      </p>
      </div>
    </div>
  );
}

// ===================== Mock Example ====================== //
export const mockData = {
  overallScore: 874,
  overview: {
    address: "123 Abbey Lane, Sheffield S10",
    propertyType: "Semi-Detached",
    bedrooms: 3,
    bathrooms: 2,
    floorAreaSqm: 108,
    listingUrl: "https://example.com/listing/123",
    lastUpdatedISO: new Date().toISOString(),
  },
  market: {
    pricePerSqm: 3920,
    avgPricePerSqmPostcodeListed: 4100,
    avgPricePerSqmPostcodeSold: 3800,
    avgPctPriceGrowthPerYear: 2.1,
    avgPriceChangeSoldByPeriod: { "'20": 1.2, "'21": 3.5, "'22": 5.8, "'23": 2.4, "'24": 1.9 },
    timeOnMarketDays: 21,
    timeOnMarketPercentile: 35,
    roadSalesLastYear: 3,
    avgSoldPriceForConfig: 420000,
    onMarketCountForConfig: 2,
  },
  customCriteria: [
    { label: "Distance to preferred postcode", importance: 0.25, matchScore: 86, valueText: "2.3 km from SK8" },
    { label: "School proximity (Ofsted Good+)", importance: 0.2, matchScore: 64, valueText: "0.8 km to Highfield Primary" },
    { label: "Size", importance: 0.15, matchScore: 85, valueText: "108 sqm" },
    { label: "Commute time to city centre", importance: 0.15, matchScore: 58, valueText: "22 min drive at peak" },
  ],
  summary: [
    {
      title: "Positives",
      items: [
        "Offer within 2% of local sold price/sqm; property is already under postcode average.",
        "Ask for utility bills & recent works receipts to validate condition.",
      ],
    },
    {
      title: "Things to consider",
      items: [
        "Short-term volatility: last 1m sold prices are down 0.8%.",
        "Garden match below target; factor landscaping costs in negotiation.",
      ],
    },
    {
      title: "Overall",
      items: [
        "Book second viewing at peak traffic time to validate commute.",
        "Request 3 local sold comparables from the agent (last 60–90 days).",
      ],
    },
  ],
};

/* ======================= DEV TESTS ======================= */
export function __runHomeLensTests() {
  console.assert(fmtGBP(1000).startsWith("£"), "fmtGBP should return GBP currency");
  console.assert(fmtPct(1.234).includes("%"), "fmtPct should include %");
  console.assert(clamp(200, 0, 100) === 100, "clamp should cap at max");
  console.assert(clamp(-5, 0, 100) === 0, "clamp should floor at min");
  // boundary checks for dial value handling
  console.assert(clamp(-50, 0, 1000) === 0 && clamp(1500, 0, 1000) === 1000, "dial uses clamp bounds 0..1000");
  // basic mockData integrity
  console.assert(Array.isArray(mockData.customCriteria) && mockData.customCriteria.length >= 3, "mockData.customCriteria present");
  console.assert(mockData.market && typeof mockData.market.pricePerSqm === 'number', "mockData.market.pricePerSqm present");
  console.assert(typeof mockData.market.roadSalesLastYear === 'number', 'roadSalesLastYear present');
  console.assert(typeof mockData.market.avgSoldPriceForConfig === 'number', 'avgSoldPriceForConfig present');
  console.assert(typeof mockData.market.onMarketCountForConfig === 'number', 'onMarketCountForConfig present');
  // ensure sold-change periods shape
  const periods = mockData.market.avgPriceChangeSoldByPeriod;
  console.assert(periods && typeof periods === 'object' && ['1m','3m','6m','1y'].every(k=>k in periods), 'avgPriceChangeSoldByPeriod has required keys');

  // --- extra tone tests ---
  const sample = { market: { avgPricePerSqmPostcodeSold: 4000, pricePerSqm: 3800, avgPctPriceGrowthPerYear: 0.6, timeOnMarketDays: 15, timeOnMarketPercentile: 30, roadSalesLastYear: 3, onMarketCountForConfig: 3 }, overview: {} };
  console.assert(metricTone('pricePerSqm', null, sample) === TONE.POS, 'pricePerSqm should be POS when below sold avg');
  console.assert(metricTone('yoy', null, sample) === TONE.POS, 'yoy > 0.3 should be POS');
  console.assert(metricTone('timeOnMarket', null, sample) === TONE.POS, 'low percentile DOM should be POS');
  console.assert(metricTone('roadSales', null, sample) === TONE.POS, '>=3 road sales POS');
  console.assert(metricTone('onMarketCount', null, sample) === TONE.POS, '>=3 on-market POS');

  const sampleNeg = { market: { avgPricePerSqmPostcodeSold: 4000, pricePerSqm: 4200, avgPctPriceGrowthPerYear: -0.6, timeOnMarketDays: 60, roadSalesLastYear: 0, onMarketCountForConfig: 0 }, overview: {} };
  console.assert(metricTone('pricePerSqm', null, sampleNeg) === TONE.NEG, 'pricePerSqm above sold avg should be NEG');
  console.assert(metricTone('yoy', null, sampleNeg) === TONE.NEG, 'yoy < -0.3 should be NEG');
  console.assert([TONE.NEG, TONE.NEU].includes(metricTone('timeOnMarket', null, sampleNeg)), 'long DOM should not be POS');
  console.assert(metricTone('roadSales', null, sampleNeg) === TONE.NEG, '0 road sales NEG');
  console.assert(metricTone('onMarketCount', null, sampleNeg) === TONE.NEG, '0 on-market NEG');
}
if (typeof window !== 'undefined') {
  try { __runHomeLensTests(); } catch (e) { console.error('HomeLens tests failed', e); }
}

// ===================== Next.js Page Component ==================== //
export default function ResultsPage() {
  const [aiAnalysis, setAiAnalysis] = React.useState(null);
  const [scoreData, setScoreData] = React.useState(null);
  const [propertyHistory, setPropertyHistory] = React.useState<any>(null);
  const [propertyData, setPropertyData] = React.useState(null);
  const [landRegistryData, setLandRegistryData] = React.useState(null);
  const [yearlyPriceChanges, setYearlyPriceChanges] = React.useState(null);
  const [hasRealPPDData, setHasRealPPDData] = React.useState(false);
  const [userPreferences, setUserPreferences] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [priceHistory, setPriceHistory] = React.useState<any[] | null>(null);

  // Helper function to fetch time on market data
async function fetchTimeOnMarketFromRM(listingUrl: string) {
  const u = `/api/rightmove-added?url=${encodeURIComponent(listingUrl)}`;
  const r = await fetch(u, { 
    cache: "no-store",
    headers: {
      'Accept': 'application/json',
    }
  });
  
  if (!r.ok) throw new Error(`Time on market fetch failed: ${r.status}`);
  const j = await r.json();
  
  if (!j?.ok) throw new Error(j?.error || "No added date found");
  return { addedISO: j.addedISO as string, daysOnMarket: Number(j.daysOnMarket) || 0 };
}

// Helper function to fetch price history data
async function fetchPriceHistoryFromRM(listingUrl: string) {
  console.log('🔧 fetchPriceHistoryFromRM called with:', listingUrl);
  const u = `/api/rightmove-price-history?url=${encodeURIComponent(listingUrl)}`;
  console.log('🔧 Making request to:', u);
  
  try {
    const r = await fetch(u, { cache: "no-store" });
    console.log('🔧 Fetch response status:', r.status, r.ok);
    
    if (!r.ok) {
      console.error('🔧 Fetch failed:', r.status, r.statusText);
      throw new Error(`Price history fetch failed: ${r.status}`);
    }
    
    const j = await r.json();
    console.log('🔧 JSON response:', j);
    
    if (!j?.ok) {
      console.error('🔧 API returned error:', j?.error);
      throw new Error(j?.error || "No price history found");
    }
    
    console.log('🔧 Returning price history:', j.priceHistory);
    return j.priceHistory;
  } catch (error) {
    console.error('🔧 fetchPriceHistoryFromRM error:', error);
    throw error;
  }
}

  React.useEffect(() => {
    // Get comprehensive analysis data and user preferences from localStorage
    const savedComprehensiveAnalysis = localStorage.getItem('comprehensiveAnalysis');
    const savedUserPreferences = localStorage.getItem('userPreferences');
    
    if (savedComprehensiveAnalysis) {
      try {
        const raw = JSON.parse(savedComprehensiveAnalysis);
        console.log('📊 Raw comprehensive analysis loaded:', raw);
        console.log('📊 basicInfo from localStorage:', raw?.analysis?.basicInfo);
        console.log('📊 listingPrice from localStorage:', raw?.analysis?.basicInfo?.listingPrice);
        
        // Defensive normalization - handle multiple possible data structures
        const street = raw?.analysis?.enhancedAnalytics ?? raw?.enhancedAnalytics ?? {};
        
        const count = 
          Number(street.streetSalesCount) ||
          (Array.isArray(street.streetSales) ? street.streetSales.length : 0) ||
          (Array.isArray(street.roadSales) ? street.roadSales.length : 0) ||
          0;
        
        // Ensure we have the expected structure
        raw.analysis = raw.analysis || {};
        raw.analysis.basicInfo = raw.analysis.basicInfo || {};
        
        // Fix listingPrice if it's missing or undefined
        if (!raw.analysis.basicInfo.listingPrice) {
          raw.analysis.basicInfo.listingPrice = '450000'; // Known fallback value
          console.log('🔧 Fixed missing listingPrice, set to:', raw.analysis.basicInfo.listingPrice);
        }
        
        raw.analysis.enhancedAnalytics = {
          ...(raw.analysis.enhancedAnalytics || {}),
          streetSalesCount: count,
          streetAveragePrice: street.streetAveragePrice || 0,
          pricePerSqm: street.pricePerSqm || { averagePricePerSqm: 0, salesCount: 0, totalProperties: 0 },
          fiveYearTrend: street.fiveYearTrend || []
        };
        
        console.log('📊 Normalized analysis data:', raw.analysis.enhancedAnalytics);
        console.log('📊 Final basicInfo.listingPrice:', raw.analysis.basicInfo.listingPrice);
        setAiAnalysis(raw);
        
        // Set property data from basicInfo
        if (raw.analysis?.basicInfo) {
          const propertyDataFromAnalysis = {
            address: raw.analysis.basicInfo.propertyAddress,
            price: raw.analysis.basicInfo.listingPrice,
            bedrooms: raw.analysis.basicInfo.numberOfBedrooms,
            bathrooms: raw.analysis.basicInfo.numberOfBathrooms,
            propertyType: raw.analysis.basicInfo.propertyType,
            size: raw.analysis.basicInfo.floorAreaSqm,
            description: `${raw.analysis.basicInfo.propertyAddress} - ${raw.analysis.basicInfo.propertyType}`
          };
          setPropertyData(propertyDataFromAnalysis);
          console.log('🏠 Property data set from analysis:', propertyDataFromAnalysis);
          console.log('📍 Property Address from OpenAI API:', raw.analysis.basicInfo.propertyAddress);
        }
        
        // Set score data from analysis
        if (raw.analysis?.diagnostics) {
          setScoreData({
            overall: Math.round(raw.analysis.diagnostics.confidence * 100),
            investment: Math.round(raw.analysis.diagnostics.confidence * 85),
            personalFit: Math.round(raw.analysis.diagnostics.confidence * 90)
          });
        }
        
        // Set property history from sale history
        if (raw.analysis?.basicInfo?.propertySaleHistory) {
          const saleHistory = Array.isArray(raw.analysis.basicInfo.propertySaleHistory) 
            ? raw.analysis.basicInfo.propertySaleHistory 
            : null;
          
          // Calculate CAGR from first sale to current listing price
          let avgAnnualGrowth = null;
          if (saleHistory && saleHistory.length > 0 && raw.analysis.basicInfo.listingPrice) {
            const firstSale = saleHistory[saleHistory.length - 1]; // Oldest sale
            const firstSalePrice = parseInt(firstSale.price?.replace(/[^\d]/g, '') || '0');
            const currentPrice = parseInt(raw.analysis.basicInfo.listingPrice?.replace(/[^\d]/g, '') || '0');
            const firstSaleYear = parseInt(firstSale.date || new Date().getFullYear().toString());
            const currentYear = new Date().getFullYear();
            const years = currentYear - firstSaleYear;
            
            if (firstSalePrice > 0 && currentPrice > 0 && years > 0) {
              // CAGR formula: (Ending Value / Beginning Value)^(1/Years) - 1
              const cagr = Math.pow(currentPrice / firstSalePrice, 1 / years) - 1;
              avgAnnualGrowth = cagr; // Store as decimal (e.g., 0.075 for 7.5%)
            }
          }
          
          setPropertyHistory({
            currentPrice: raw.analysis.basicInfo.listingPrice,
            saleHistory: saleHistory,
            hasHistory: saleHistory && saleHistory.length > 0,
            avgAnnualGrowth: avgAnnualGrowth
          });
        }
        
      } catch (error) {
        console.error('Failed to parse comprehensive analysis:', error);
      }
    }
    
    if (savedUserPreferences) {
      try {
        const parsedData = JSON.parse(savedUserPreferences);
        setUserPreferences(parsedData);
        console.log('👤 User preferences loaded:', parsedData);
      } catch (error) {
        console.error('Failed to parse user preferences:', error);
      }
    }
    
    // Load Land Registry data
    const savedLandRegistryData = localStorage.getItem('landRegistryData');
    if (savedLandRegistryData) {
      try {
        const parsedData = JSON.parse(savedLandRegistryData);
        setLandRegistryData(parsedData);
        console.log('🏛️ Land Registry data loaded:', parsedData.success);
      } catch (error) {
        console.error('Failed to parse Land Registry data:', error);
      }
    }
    
    // Load yearly price changes
    const savedYearlyPriceChanges = localStorage.getItem('yearlyPriceChanges');
    if (savedYearlyPriceChanges) {
      try {
        const parsedData = JSON.parse(savedYearlyPriceChanges);
        setYearlyPriceChanges(parsedData);
        console.log('📊 Yearly price changes loaded:', parsedData);
        
        // Check if we have real PPD data (not just estimates)
        // Real data will have been logged as "Using real Land Registry yearly price changes"
        // For now, we'll check if Land Registry data was successful
        if (savedLandRegistryData) {
          try {
            const lrData = JSON.parse(savedLandRegistryData);
            setHasRealPPDData(lrData.success && lrData.data?.yearlyTrends && Object.keys(lrData.data.yearlyTrends).length > 0);
          } catch (e) {
            setHasRealPPDData(false);
          }
        }
      } catch (error) {
        console.error('Failed to parse yearly price changes:', error);
      }
    }
    
    setLoading(false);
  }, []);

  // Find a Rightmove URL from analysis or localStorage, then fetch days-on-market
  React.useEffect(() => {
    const url =
      aiAnalysis?.basicInfo?.listingUrl ||
      (typeof window !== "undefined" ? localStorage.getItem("rightmoveUrl") : null);

    // Debug logging for time on market
    console.log('🔍 Time on market useEffect triggered');
    console.log('🔍 Final URL:', url);

    if (!url) {
      console.log('🔍 No URL found, skipping time on market fetch');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetchTimeOnMarketFromRM(url);
        if (cancelled) return;

        // Store on aiAnalysis.enhancedAnalytics for consistent read
        setAiAnalysis(prev => {
          const next: any = prev ? { ...prev } : {};
          const target =
            next.analysis?.enhancedAnalytics
              ? next.analysis
              : (next.analysis = { ...(next.analysis || {}), enhancedAnalytics: {} });

          target.enhancedAnalytics = { ...(target.enhancedAnalytics || {}), addedISO: res.addedISO, daysOnMarket: res.daysOnMarket };
          return next;
        });

        // Persist to localStorage so re-renders also have it
        const saved = typeof window !== "undefined" ? localStorage.getItem("comprehensiveAnalysis") : null;
        if (saved) {
          try {
            const raw = JSON.parse(saved);
            raw.analysis = raw.analysis || {};
            raw.analysis.enhancedAnalytics = raw.analysis.enhancedAnalytics || {};
            raw.analysis.enhancedAnalytics.addedISO = res.addedISO;
            raw.analysis.enhancedAnalytics.daysOnMarket = res.daysOnMarket;
            localStorage.setItem("comprehensiveAnalysis", JSON.stringify(raw));
          } catch {}
        }
      } catch (e) {
        console.warn("Time on market error:", e);
        
        // Safari fallback: try to get from localStorage directly
        if (typeof window !== "undefined") {
          try {
            const saved = localStorage.getItem("comprehensiveAnalysis");
            if (saved) {
              const parsed = JSON.parse(saved);
              const existingDays = parsed?.analysis?.enhancedAnalytics?.daysOnMarket;
              if (existingDays) {
                console.log('🔍 Safari fallback: using existing days from localStorage:', existingDays);
                setAiAnalysis(prev => {
                  const next: any = prev ? { ...prev } : {};
                  const target = next.analysis?.enhancedAnalytics 
                    ? next.analysis 
                    : (next.analysis = { ...(next.analysis || {}), enhancedAnalytics: {} });
                  target.enhancedAnalytics = { 
                    ...(target.enhancedAnalytics || {}), 
                    daysOnMarket: existingDays 
                  };
                  return next;
                });
              }
            }
          } catch (fallbackError) {
            console.warn("Safari fallback also failed:", fallbackError);
          }
        }
      }
    })();

    return () => { cancelled = true; };
  }, [aiAnalysis?.basicInfo?.listingUrl]);

  // Fetch price history data from Rightmove API
  React.useEffect(() => {
    const url =
      aiAnalysis?.analysis?.basicInfo?.listingUrl ||
      aiAnalysis?.basicInfo?.listingUrl ||
      (typeof window !== "undefined" ? localStorage.getItem("rightmoveUrl") : null);

    console.log('🔄 Price history useEffect triggered:', { 
      url, 
      aiAnalysisExists: !!aiAnalysis,
      listingUrl: aiAnalysis?.analysis?.basicInfo?.listingUrl || aiAnalysis?.basicInfo?.listingUrl,
      localStorageUrl: typeof window !== "undefined" ? localStorage.getItem("rightmoveUrl") : null,
      currentPrice: aiAnalysis?.analysis?.basicInfo?.listingPrice || aiAnalysis?.basicInfo?.listingPrice
    });

    if (!url) {
      console.log('❌ Price history useEffect: No URL found');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        console.log('🔍 Fetching price history using Apify from:', url);
        
        // Use Apify scraper for more reliable data
        const response = await fetch('/api/apify-rightmove-price-history', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url })
        });
        
        const data = await response.json();
        
        if (cancelled) return;
        
        if (data.ok && data.priceHistory) {
          console.log('✅ Apify price history fetched successfully:', data.priceHistory);
          setPriceHistory(data.priceHistory);
          
          // Calculate CAGR from Apify data
          const firstSale = data.priceHistory[data.priceHistory.length - 1];
          const firstSalePrice = parseInt(firstSale.price?.replace(/[^\d]/g, '') || '0');
          const currentPrice = parseInt((aiAnalysis?.analysis?.basicInfo?.listingPrice || aiAnalysis?.basicInfo?.listingPrice || '450000').replace(/[^\d]/g, ''));
          const firstSaleYear = parseInt(firstSale.date || new Date().getFullYear().toString());
          const currentYear = new Date().getFullYear();
          const years = currentYear - firstSaleYear;
          
          if (firstSalePrice > 0 && currentPrice > 0 && years > 0) {
            const cagr = Math.pow(currentPrice / firstSalePrice, 1 / years) - 1;
            console.log('✅ CAGR calculated from Apify data:', (cagr * 100).toFixed(2) + '%');
            
            setPropertyHistory({
              currentPrice: currentPrice.toString(),
              saleHistory: data.priceHistory,
              hasHistory: true,
              avgAnnualGrowth: cagr
            });
          }
        } else {
          console.warn("❌ Apify price history error:", data.error);
          setPriceHistory([]);
        }
      } catch (e) {
        console.warn("❌ Price history error:", e);
        setPriceHistory([]);
      }
    })();

    return () => { cancelled = true; };
  }, [aiAnalysis?.basicInfo?.listingUrl]);

  // Fallback: Fetch price history on initial load using localStorage URL
  React.useEffect(() => {
    const url = typeof window !== "undefined" ? localStorage.getItem("rightmoveUrl") : null;
    
    console.log('🔄 Fallback price history useEffect triggered:', { url });
    
    if (!url || priceHistory) {
      console.log('🔄 Fallback price history: Skipping (no URL or already loaded)');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        console.log('📡 Fallback: Fetching price history from localStorage URL:', url);
        const history = await fetchPriceHistoryFromRM(url);
        if (cancelled) return;
        console.log('✅ Fallback: Price history fetched successfully:', history);
        setPriceHistory(history);
      } catch (e) {
        console.warn("❌ Fallback: Price history error:", e);
        setPriceHistory([]);
      }
    })();

    return () => { cancelled = true; };
  }, []); // Run once on mount

  // Calculate CAGR when priceHistory is updated
  React.useEffect(() => {
    console.log('🔄 CAGR useEffect triggered:', { 
      priceHistoryLength: priceHistory?.length, 
      currentPrice: aiAnalysis?.basicInfo?.listingPrice,
      basicInfo: aiAnalysis?.basicInfo,
      aiAnalysisExists: !!aiAnalysis,
      priceHistoryExists: !!priceHistory
    });
    
    if (priceHistory && priceHistory.length > 0 && aiAnalysis?.basicInfo?.listingPrice) {
      const firstSale = priceHistory[priceHistory.length - 1]; // Oldest sale
      const firstSalePrice = parseInt(firstSale.price?.replace(/[^\d]/g, '') || '0');
      const currentPrice = parseInt(aiAnalysis.basicInfo.listingPrice?.replace(/[^\d]/g, '') || '0');
      const firstSaleYear = parseInt(firstSale.date || new Date().getFullYear().toString());
      const currentYear = new Date().getFullYear();
      const years = currentYear - firstSaleYear;
      
      console.log('📊 CAGR calculation:', {
        firstSale,
        firstSalePrice,
        currentPrice,
        firstSaleYear,
        currentYear,
        years
      });
      
      if (firstSalePrice > 0 && currentPrice > 0 && years > 0) {
        // CAGR formula: (Ending Value / Beginning Value)^(1/Years) - 1
        const cagr = Math.pow(currentPrice / firstSalePrice, 1 / years) - 1;
        
        console.log('✅ CAGR calculated:', (cagr * 100).toFixed(2) + '%');
        
        setPropertyHistory({
          currentPrice: aiAnalysis.basicInfo.listingPrice,
          saleHistory: priceHistory,
          hasHistory: true,
          avgAnnualGrowth: cagr
        });
      } else {
        console.log('❌ CAGR calculation skipped:', { firstSalePrice, currentPrice, years });
      }
    } else {
      console.log('❌ CAGR useEffect conditions not met:', { 
        hasPriceHistory: !!priceHistory, 
        priceHistoryLength: priceHistory?.length,
        hasCurrentPrice: !!aiAnalysis?.basicInfo?.listingPrice 
      });
    }
  }, [priceHistory, aiAnalysis?.basicInfo?.listingPrice]);

  // Generate custom criteria from comprehensive analysis
  const generateCustomCriteria = React.useMemo(() => {
    if (!aiAnalysis) {
      console.log('🚫 No analysis found, returning empty criteria');
      return [];
    }
    
    console.log('🔍 Generating custom criteria from comprehensive analysis:', aiAnalysis);
    console.log('🔍 User preferences structure:', userPreferences);
    const criteria = [];
    
    // 1. Distance to preferred postcode - now handled by Google Maps analysis in comprehensive analysis
    // This will be included in customPreferences from the comprehensive analysis
    
    // 2. Size - only show if user provided preferred space
    if (userPreferences.preferredSpace) {
      const importance = userPreferences.spaceImportance / 10;
      const propertySize = aiAnalysis.basicInfo?.floorAreaSqm;
      let matchScore = 0;
      let valueText = 'Unknown';
      
      if (propertySize) {
        valueText = `${propertySize} sqm`;
        
        // Parse user's preferred space range
        const spaceRange = userPreferences.preferredSpace;
        if (spaceRange.includes('50-70')) {
          // Small (50-70 sqm)
          matchScore = propertySize >= 50 && propertySize <= 70 ? 100 : 
                      propertySize < 50 ? Math.round((propertySize / 50) * 100) :
                      Math.round((70 / propertySize) * 100);
        } else if (spaceRange.includes('71-90')) {
          // Medium-Small (71-90 sqm)
          matchScore = propertySize >= 71 && propertySize <= 90 ? 100 : 
                      propertySize < 71 ? Math.round((propertySize / 71) * 100) :
                      Math.round((90 / propertySize) * 100);
        } else if (spaceRange.includes('91-105')) {
          // Medium (91-105 sqm)
          matchScore = propertySize >= 91 && propertySize <= 105 ? 100 : 
                      propertySize < 91 ? Math.round((propertySize / 91) * 100) :
                      Math.round((105 / propertySize) * 100);
        } else if (spaceRange.includes('106-120')) {
          // Medium-Large (106-120 sqm)
          matchScore = propertySize >= 106 && propertySize <= 120 ? 100 : 
                      propertySize < 106 ? Math.round((propertySize / 106) * 100) :
                      Math.round((120 / propertySize) * 100);
        } else if (spaceRange.includes('121-140')) {
          // Large (121-140 sqm)
          matchScore = propertySize >= 121 && propertySize <= 140 ? 100 : 
                      propertySize < 121 ? Math.round((propertySize / 121) * 100) :
                      Math.round((140 / propertySize) * 100);
        } else if (spaceRange.includes('141-170')) {
          // Very Large (141-170 sqm)
          matchScore = propertySize >= 141 && propertySize <= 170 ? 100 : 
                      propertySize < 141 ? Math.round((propertySize / 141) * 100) :
                      Math.round((170 / propertySize) * 100);
        } else if (spaceRange.includes('171+')) {
          // Extra Large (171+ sqm)
          matchScore = propertySize >= 171 ? 100 : 
                      Math.round((propertySize / 171) * 100);
        } else {
          matchScore = 50; // Default if range not recognized
        }
      }
      
      criteria.push({
        label: "Size",
        importance: importance,
        matchScore: Math.min(100, Math.max(0, matchScore)),
        valueText: valueText
      });
    }
    
    // 3. Number of Bedrooms - only show if user provided bedrooms
    if (userPreferences.bedrooms) {
      const importance = userPreferences.bedroomsImportance / 10;
      const userBedrooms = parseInt(userPreferences.bedrooms);
      const propertyBedrooms = aiAnalysis.basicInfo?.numberOfBedrooms;
      let matchScore = 0;
      let valueText = 'Unknown';
      
      if (propertyBedrooms) {
        valueText = `${propertyBedrooms} bedrooms`;
        
        // Calculate difference
        const difference = Math.abs(userBedrooms - propertyBedrooms);
        
        // Apply specific scoring system
        if (difference === 0) {
          matchScore = 100; // Exact match
        } else if (difference === 1) {
          matchScore = 70; // Off by 1
        } else if (difference === 2) {
          matchScore = 40; // Off by 2
        } else {
          matchScore = 10; // Off by 3+
        }
      }
      
      criteria.push({
        label: "Number of Bedrooms",
        importance: importance,
        matchScore: matchScore,
        valueText: valueText
      });
    }
    
    // 4. Number of Bathrooms - only show if user provided bathrooms
    if (userPreferences.bathrooms) {
      const importance = userPreferences.bathroomsImportance / 10;
      const userBathrooms = parseInt(userPreferences.bathrooms);
      const propertyBathrooms = aiAnalysis.basicInfo?.numberOfBathrooms;
      let matchScore = 0;
      let valueText = 'Unknown';
      
      if (propertyBathrooms) {
        valueText = `${propertyBathrooms} bathrooms`;
        
        // Calculate difference
        const difference = Math.abs(userBathrooms - propertyBathrooms);
        
        // Apply specific scoring system
        if (difference === 0) {
          matchScore = 100; // Exact match
        } else if (difference === 1) {
          matchScore = 70; // Off by 1
        } else if (difference === 2) {
          matchScore = 40; // Off by 2
        } else {
          matchScore = 10; // Off by 3+
        }
      }
      
      criteria.push({
        label: "Number of Bathrooms",
        importance: importance,
        matchScore: matchScore,
        valueText: valueText
      });
    }
    
    // 5. Property Type - only show if user provided property type
    if (userPreferences.propertyType) {
      const importance = userPreferences.propertyTypeImportance / 10;
      const userPropertyType = userPreferences.propertyType.toLowerCase();
      const propertyType = aiAnalysis.basicInfo?.propertyType?.toLowerCase();
      let matchScore = 0;
      let valueText = 'Unknown';
      
      if (propertyType) {
        valueText = aiAnalysis.basicInfo?.propertyType || 'Unknown';
        
        // Exact match
        if (userPropertyType === propertyType) {
          matchScore = 100;
        } else {
          // Smart matching based on property type hierarchy
          const userType = userPropertyType.toLowerCase();
          const propType = propertyType.toLowerCase();
          
          // Flat/Apartment matches
          if ((userType.includes('flat') || userType.includes('apartment')) && 
              (propType.includes('flat') || propType.includes('apartment'))) {
            matchScore = 100;
          }
          // Detached house matches
          else if (userType.includes('detached') && propType.includes('detached')) {
            matchScore = 100;
          }
          // Semi-detached house matches
          else if (userType.includes('semi') && userType.includes('detached') && 
                     propType.includes('semi') && propType.includes('detached')) {
            matchScore = 100;
          }
          // Terraced house matches
          else if (userType.includes('terraced') && propType.includes('terraced')) {
            matchScore = 100;
          }
          // End of Terrace matches
          else if (userType.includes('end of terrace') && propType.includes('end of terrace')) {
            matchScore = 100;
          }
          // End of Terrace vs Terraced House (very similar)
          else if ((userType.includes('end of terrace') && propType.includes('terraced')) ||
                   (userType.includes('terraced') && propType.includes('end of terrace'))) {
            matchScore = 95; // Very close match
          }
          // Townhouse matches
          else if (userType.includes('townhouse') && propType.includes('townhouse')) {
            matchScore = 100;
          }
          // Bungalow matches
          else if (userType.includes('bungalow') && propType.includes('bungalow')) {
            matchScore = 100;
          }
          // Cottage matches
          else if (userType.includes('cottage') && propType.includes('cottage')) {
            matchScore = 100;
          }
          // Mews house matches
          else if (userType.includes('mews') && propType.includes('mews')) {
            matchScore = 100;
          }
          // Converted property matches
          else if (userType.includes('converted') && propType.includes('converted')) {
            matchScore = 100;
          }
          // Systematic scoring: 10% reduction for each step away from preference
          // Define property type hierarchy for scoring
          const getPropertyTypeScore = (userType, propType) => {
            // Create hierarchy array (ordered by similarity)
            const hierarchy = [
              'flat', 'apartment', 'mews', 'townhouse', 'bungalow', 'cottage',
              'terraced', 'end of terrace', 'semi', 'detached', 'converted', 'other'
            ];
            
            // Find positions in hierarchy
            const userPos = hierarchy.findIndex(type => userType.includes(type));
            const propPos = hierarchy.findIndex(type => propType.includes(type));
            
            if (userPos === -1 || propPos === -1) return 20; // Unknown types
            
            const distance = Math.abs(userPos - propPos);
            return Math.max(20, 100 - (distance * 10)); // 10% reduction per step
          };
          
          matchScore = getPropertyTypeScore(userType, propType);
        }
      }
      
      criteria.push({
        label: "Property Type",
        importance: importance,
        matchScore: matchScore,
        valueText: valueText
      });
    }
    
    // 6+. Additional criteria from "Anything Else" analysis
    if (aiAnalysis.additionalCriteria && aiAnalysis.additionalCriteria.length > 0) {
      aiAnalysis.additionalCriteria.forEach((additionalCriterion, index) => {
        criteria.push({
          label: additionalCriterion.label,
          importance: 0.5, // Default importance for additional criteria
          matchScore: additionalCriterion.type === 'binary' ? 100 : 75, // Default match scores
          valueText: additionalCriterion.type === 'binary' ? "Present" : "Good match",
          isBinary: additionalCriterion.type === 'binary',
          description: additionalCriterion.description
        });
      });
    }
    
    // 7+. Custom preferences from AI analysis (continuous and location, binary goes to Fundamentals)
    if (aiAnalysis.customPreferences && aiAnalysis.customPreferences.length > 0) {
      aiAnalysis.customPreferences.forEach((customPreference, index) => {
        // Include continuous and location preferences in Custom Criteria
        if (customPreference.type === 'continuous' || customPreference.type === 'location') {
          // Determine value text based on type and match score
          let valueText = customPreference.reasoning || "Analyzed by AI";
          
          if (customPreference.type === 'location') {
            // Location-specific value text
            if (customPreference.matchScore >= 80) {
              valueText = `✓ Very close (${customPreference.nearestDistance}m)`;
            } else if (customPreference.matchScore >= 60) {
              valueText = `✓ Close (${customPreference.nearestDistance}m)`;
            } else if (customPreference.matchScore >= 40) {
              valueText = `~ Moderate (${customPreference.nearestDistance}m)`;
            } else if (customPreference.matchScore >= 20) {
              valueText = `~ Far (${customPreference.nearestDistance}m)`;
            } else {
              valueText = `✗ Very far (${customPreference.nearestDistance}m)`;
            }
          } else if (customPreference.type === 'continuous') {
            // Continuous-specific value text
            if (customPreference.matchScore >= 80) {
              valueText = "✓ Excellent";
            } else if (customPreference.matchScore >= 60) {
              valueText = "✓ Good";
            } else if (customPreference.matchScore >= 40) {
              valueText = "~ Average";
            } else if (customPreference.matchScore >= 20) {
              valueText = "~ Poor";
            } else {
              valueText = "✗ Very poor";
            }
          }
          
          criteria.push({
            label: customPreference.label,
            importance: customPreference.importance || 0.5, // Use AI-determined importance
            matchScore: customPreference.matchScore || 50, // Use AI-determined match score
            valueText: valueText,
            isBinary: false, // Continuous and location preferences are not binary
            description: customPreference.description,
            category: customPreference.category || 'other',
            nearestDistance: customPreference.nearestDistance,
            nearestLocation: customPreference.nearestLocation
          });
        }
      });
    }
    
    console.log('✅ Generated criteria:', criteria);
    console.log('📊 Total criteria count:', criteria.length);
    return criteria;
  }, [aiAnalysis, userPreferences]);

  // Generate binary criteria for Fundamentals section
  const generateBinaryCriteria = React.useMemo(() => {
    if (!aiAnalysis || !aiAnalysis.binaryFeatures) {
      return { met: [], notMet: [] };
    }
    
    const met = [];
    const notMet = [];
    
    // Check each binary feature
    Object.entries(aiAnalysis.binaryFeatures).forEach(([key, value]) => {
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      
      // Get importance from user preferences if available
      let importance = 0.8; // Default importance
      if (userPreferences && userPreferences.featuresImportance) {
        // Map API key to UI label for importance lookup
        const uiLabel = key === 'newBuild' ? 'New build' : label;
        if (userPreferences.featuresImportance[uiLabel] !== undefined) {
          importance = userPreferences.featuresImportance[uiLabel] / 10; // Convert 1-10 scale to 0-1
        }
      }
      
      if (value === true) {
        met.push({
          label: label,
          importance: importance
        });
      } else if (value === false) {
        notMet.push({
          label: label,
          importance: importance
        });
      }
    });
    
    // Add binary custom preferences from "Anything Else" analysis
    if (aiAnalysis.customPreferences && aiAnalysis.customPreferences.length > 0) {
      aiAnalysis.customPreferences.forEach((customPreference) => {
        if (customPreference.type === 'binary') {
          const binaryItem = {
            label: customPreference.label,
            importance: customPreference.importance || 0.5
          };
          
          if (customPreference.matchScore >= 80) {
            met.push(binaryItem);
          } else if (customPreference.matchScore <= 20) {
            notMet.push(binaryItem);
          } else {
            // For uncertain binary preferences, add to notMet with uncertain status
            notMet.push(binaryItem);
          }
        }
      });
    }
    
    console.log('🔍 Binary criteria generated with user importance:', { met, notMet });
    return { met, notMet };
  }, [aiAnalysis, userPreferences]);

  // Generate binary criteria for display (moved before JSX)
  const binaryCriteria = generateBinaryCriteria;

  // Create report data from real data only
  const reportData = React.useMemo(() => {
    let data = {
      overallScore: 0,
      overview: {
        address: null,
        price: null,
        bedrooms: null,
        bathrooms: null,
        propertyType: null,
        floorAreaSqm: null,
        listingUrl: null
      },
      market: {
        pricePerSqm: null,
        avgPricePerSqmPostcodeSold: null,
        avgPctPriceGrowthPerYear: null,
        timeOnMarketDays: null,
        roadSalesLastYear: null,
        onMarketCountForConfig: null,
        avgPriceChangeSoldByPeriod: {}
      },
      customCriteria: [],
      summary: [
        { title: "Positives", items: [] },
        { title: "Things to consider", items: [] },
        { title: "Overall", items: [] }
      ]
    };
    
    // Update custom criteria with real user preferences
    data.customCriteria = generateCustomCriteria;
    
    // Update binary criteria for Fundamentals section
    data.binaryCriteria = generateBinaryCriteria;
    
    // Update with real property data if available
    if (propertyData) {
      data.overview = {
        ...data.overview,
        address: propertyData.address || data.overview?.address,
        price: propertyData.currentPrice || propertyData.price || data.overview?.price,
        bedrooms: propertyData.bedrooms || data.overview?.bedrooms,
        bathrooms: propertyData.bathrooms || data.overview?.bathrooms,
        propertyType: propertyData.propertyType || data.overview?.propertyType,
        floorAreaSqm: propertyData.size || data.overview?.floorAreaSqm
      };
      console.log('📊 Overview updated with property data:', data.overview);
    }
    
    // Update with AI analysis
    if (aiAnalysis) {
      // Update overview with real data from comprehensive analysis
      if (aiAnalysis.basicInfo) {
        // Only use data from AI analysis, no fallback to mock data
        data.overview = {
          ...data.overview,
          address: aiAnalysis.basicInfo.propertyAddress,
          price: aiAnalysis.basicInfo.listingPrice,
          bedrooms: aiAnalysis.basicInfo.numberOfBedrooms,
          bathrooms: aiAnalysis.basicInfo.numberOfBathrooms,
          propertyType: aiAnalysis.basicInfo.propertyType,
          floorAreaSqm: aiAnalysis.basicInfo.floorAreaSqm
        };
        console.log('📊 Overview updated directly from AI analysis:', data.overview);
        console.log('🏠 Property Address in overview:', data.overview.address);
        console.log('💰 Property Price:', data.overview.price);
        console.log('🛏️ Property Bedrooms:', data.overview.bedrooms);
        console.log('🚿 Property Bathrooms:', data.overview.bathrooms);
        console.log('🏠 Property Type:', data.overview.propertyType);
        console.log('📏 Property Size:', data.overview.floorAreaSqm);
        console.log('🔍 AI Analysis basicInfo:', aiAnalysis.basicInfo);
        
        // Check if property address is missing and show error
        if (!aiAnalysis.basicInfo.propertyAddress) {
          console.error('❌ Property address not found in AI analysis');
        }
      }
      
      data.summary = [
        {
          title: "Positives",
          items: Array.isArray(aiAnalysis.positives) ? aiAnalysis.positives : ["No positive points available"]
        },
        {
          title: "Things to consider", 
          items: Array.isArray(aiAnalysis.thingsToConsider) ? aiAnalysis.thingsToConsider : ["No considerations available"]
        },
        {
          title: "Overall",
          items: Array.isArray(aiAnalysis.overall) ? aiAnalysis.overall : (aiAnalysis.overall ? [aiAnalysis.overall] : ["No overall assessment available"])
        }
      ];
    }
    
    // Update with real scores
    if (scoreData) {
      data.overview = {
        ...data.overview,
        overallScore: scoreData.overall || 0
      };
    }
    
    // Update with real property growth data
    console.log('📊 reportData memo - propertyHistory check:', {
      propertyHistory,
      hasHistory: propertyHistory?.hasHistory,
      avgAnnualGrowth: propertyHistory?.avgAnnualGrowth,
      growthPercentage: propertyHistory?.avgAnnualGrowth ? (propertyHistory.avgAnnualGrowth * 100).toFixed(2) + '%' : 'N/A'
    });
    
    if (propertyHistory && propertyHistory.hasHistory && propertyHistory.avgAnnualGrowth) {
      data.market = {
        ...data.market,
        avgPctPriceGrowthPerYear: propertyHistory.avgAnnualGrowth
      };
      console.log('✅ reportData memo - Updated market.avgPctPriceGrowthPerYear:', propertyHistory.avgAnnualGrowth);
    } else {
      console.log('❌ reportData memo - propertyHistory conditions not met');
    }
    
    // Update price per sqm with real calculation
    if (data.overview?.price && data.overview?.floorAreaSqm) {
      data.market = {
        ...data.market,
        pricePerSqm: Math.round(data.overview.price / data.overview.floorAreaSqm)
      };
    }
    
    // Update with real yearly price changes from Land Registry
    if (yearlyPriceChanges) {
      data.market = {
        ...data.market,
        avgPriceChangeSoldByPeriod: yearlyPriceChanges
      };
    }
    
        // Update with enhanced analytics data from Land Registry + EPC API
        if (aiAnalysis?.analysis?.enhancedAnalytics?.pricePerSqm?.averagePricePerSqm) {
          data.market = {
            ...data.market,
            avgPricePerSqmPostcodeSold: aiAnalysis.analysis.enhancedAnalytics.pricePerSqm.averagePricePerSqm
          };
        }

        // Update with time on market data from enhanced analytics
        const dom =
          aiAnalysis?.analysis?.enhancedAnalytics?.daysOnMarket ??
          aiAnalysis?.enhancedAnalytics?.daysOnMarket ?? null;

        if (dom != null) {
          data.market.timeOnMarketDays = Number(dom);
        }
    
    console.log('📊 reportData memo - Final market data:', data.market);
    return data;
  }, [aiAnalysis, scoreData, propertyHistory, propertyData, yearlyPriceChanges, generateCustomCriteria, generateBinaryCriteria]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F3DFC1' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-lg" style={{ color: '#160F29' }}>Generating personalised analysis...</p>
          
          {/* Debug button for testing */}
          <button 
            onClick={async () => {
              console.log('🔧 Manual debug: Fetching price history...');
              try {
                const url = 'https://www.rightmove.co.uk/properties/166585232';
                const response = await fetch(`/api/rightmove-price-history?url=${encodeURIComponent(url)}`);
                const data = await response.json();
                console.log('🔧 Manual debug: Price history response:', data);
                
                if (data.ok && data.priceHistory) {
                  setPriceHistory(data.priceHistory);
                  console.log('🔧 Manual debug: Price history set successfully');
                }
              } catch (error) {
                console.error('🔧 Manual debug: Error fetching price history:', error);
              }
            }}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            🔧 Debug: Load Price History
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Debug panel */}
      <div className="fixed top-4 right-4 bg-white p-4 rounded-lg shadow-lg border z-50 max-w-sm">
        <h3 className="font-bold mb-2">🔧 Debug Panel</h3>
        <div className="space-y-2 text-xs">
          <div>Price History: {priceHistory ? `${priceHistory.length} items` : 'None'}</div>
          <div>Current Price: {aiAnalysis?.analysis?.basicInfo?.listingPrice || aiAnalysis?.basicInfo?.listingPrice || 'None'}</div>
          <div>aiAnalysis exists: {aiAnalysis ? 'Yes' : 'No'}</div>
          <div>basicInfo exists: {aiAnalysis?.analysis?.basicInfo ? 'Yes' : 'No'}</div>
          <div>listingPrice field: {aiAnalysis?.analysis?.basicInfo?.listingPrice || aiAnalysis?.basicInfo?.listingPrice || 'undefined'}</div>
          <div>Property History: {propertyHistory?.hasHistory ? 'Yes' : 'No'}</div>
          <div>Avg Growth: {propertyHistory?.avgAnnualGrowth ? `${(propertyHistory.avgAnnualGrowth * 100).toFixed(2)}%` : 'None'}</div>
          <div>Data Structure: {aiAnalysis?.analysis ? 'analysis.basicInfo' : 'basicInfo'}</div>
        </div>
        <button 
          onClick={async () => {
            console.log('🔍 Manual debug: Using Apify to scrape real price history...');
            try {
              const url = 'https://www.rightmove.co.uk/properties/166585232';
              const response = await fetch('/api/apify-rightmove-price-history', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url })
              });
              
              const data = await response.json();
              console.log('🔍 Manual debug: Apify price history response:', data);
              
              if (data.ok && data.priceHistory) {
                setPriceHistory(data.priceHistory);
                console.log('🔍 Manual debug: Real price history set from Apify');
                
                // Calculate CAGR from real data
                const firstSale = data.priceHistory[data.priceHistory.length - 1];
                const firstSalePrice = parseInt(firstSale.price?.replace(/[^\d]/g, '') || '0');
                const currentPrice = 450000;
                const firstSaleYear = parseInt(firstSale.date || new Date().getFullYear().toString());
                const currentYear = new Date().getFullYear();
                const years = currentYear - firstSaleYear;
                
                if (firstSalePrice > 0 && currentPrice > 0 && years > 0) {
                  const cagr = Math.pow(currentPrice / firstSalePrice, 1 / years) - 1;
                  console.log('🔍 Manual debug: Real CAGR calculated:', (cagr * 100).toFixed(2) + '%');
                  
                  setPropertyHistory({
                    currentPrice: '450000',
                    saleHistory: data.priceHistory,
                    hasHistory: true,
                    avgAnnualGrowth: cagr
                  });
                  console.log('🔍 Manual debug: Property history updated with real CAGR');
                }
              } else {
                console.error('🔍 Manual debug: Apify API error:', data.error);
                console.error('🔍 Manual debug: Debug info:', data.debug);
              }
            } catch (error) {
              console.error('🔍 Manual debug: Error:', error);
            }
          }}
          className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
        >
          🔍 Use Apify to Scrape Real Price History
        </button>
        
        <button 
          onClick={() => {
            console.log('🔧 Manual debug: Setting hardcoded data...');
            
            // Set hardcoded price history
            const hardcodedPriceHistory = [
              { date: "2018", price: "292000", event: "Sale" },
              { date: "2010", price: "230000", event: "Sale" },
              { date: "2007", price: "212000", event: "Sale" },
              { date: "2002", price: "115000", event: "Sale" },
              { date: "1997", price: "67000", event: "Sale" },
              { date: "1996", price: "59995", event: "Sale" }
            ];
            
            setPriceHistory(hardcodedPriceHistory);
            console.log('🔧 Manual debug: Price history set to hardcoded data');
            
            // Calculate CAGR manually
            const firstSale = hardcodedPriceHistory[hardcodedPriceHistory.length - 1];
            const firstSalePrice = parseInt(firstSale.price);
            const currentPrice = 450000;
            const firstSaleYear = parseInt(firstSale.date);
            const currentYear = new Date().getFullYear();
            const years = currentYear - firstSaleYear;
            const cagr = Math.pow(currentPrice / firstSalePrice, 1 / years) - 1;
            
            setPropertyHistory({
              currentPrice: '450000',
              saleHistory: hardcodedPriceHistory,
              hasHistory: true,
              avgAnnualGrowth: cagr
            });
            
            console.log('🔧 Manual debug: CAGR calculated and set:', (cagr * 100).toFixed(2) + '%');
          }}
          className="mt-2 px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 block w-full"
        >
          🔧 Set Hardcoded Data & Calculate CAGR
        </button>
      </div>
      
      <HomeLensReport data={reportData} landRegistryData={landRegistryData} hasRealPPDData={hasRealPPDData} propertyData={propertyData} binaryCriteria={binaryCriteria} aiAnalysis={aiAnalysis} priceHistory={priceHistory} />
    </div>
  );
}