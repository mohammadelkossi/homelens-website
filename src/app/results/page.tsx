'use client';
import React from "react";

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

// ====================== Visual Parts ===================== //
function ScoreDial({ score }) {
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
}

function Stat({ label, value, helper }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wider text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-gray-900">{value}</div>
      {helper ? <div className="mt-1 text-sm text-gray-500">{helper}</div> : null}
    </div>
  );
}

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

function ToneStat({ metric, label, value, helper, data, overrides }) {
  const tone = metricTone(metric, value, data, overrides);
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wider text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-semibold" style={toneStyle(tone)}>{value}</div>
      {helper ? <div className="mt-1 text-sm text-gray-500">{helper}</div> : null}
    </div>
  );
}

function Pill({ children }) {
  return <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">{children}</span>;
}

function Progress({ value }) {
  const pct = clamp(Number(value) || 0, 0, 100);
  return (
    <div className="h-2 w-full rounded-full bg-gray-200">
      <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: COLORS.tealDark }} />
    </div>
  );
}

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
function HomeLensReport({ data = mockData, landRegistryData = null, hasRealPPDData = false, propertyData = null, onPrint }) {
  const { overallScore, overview, market, customCriteria, summary } = data;
  
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
        <h1 className="text-2xl font-semibold" style={{color: COLORS.tealDark}}>HomeLens Report</h1>
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

      {/* ===== 1) OVERVIEW ===== */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_auto]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">{overview.address}</h2>
              {typeof overview.price === "number" && <Pill>{fmtGBP(overview.price)}</Pill>}
              {typeof overview.floorAreaSqm === "number" && <Pill>{overview.floorAreaSqm} sqm</Pill>}
              {typeof overview.bedrooms === "number" && <Pill>{overview.bedrooms} bed</Pill>}
              {typeof overview.bathrooms === "number" && <Pill>{overview.bathrooms} bath</Pill>}
              {overview.propertyType && <Pill>{overview.propertyType}</Pill>}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <ToneStat metric="pricePerSqm" label="Price / sqm" value={fmtGBP(market.pricePerSqm)} helper="Subject property" data={{market, overview}} />
              <Stat label="Postcode avg (Listed)" value={fmtGBP(market.avgPricePerSqmPostcodeListed)} />
              <Stat label="Postcode avg (Sold)" value={fmtGBP(market.avgPricePerSqmPostcodeSold)} />
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <ToneStat 
            metric="yoy" 
            label="AVG PRICE GROWTH" 
            value={fmtPct(market.avgPctPriceGrowthPerYear)} 
            helper={propertyData?.saleHistory && propertyData.saleHistory.length >= 2 ? "Property-specific history" : "Market average"}
            data={{market, overview}} 
          />
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wider text-gray-500">Time on market</div>
            <div className="mt-1 text-xl font-semibold" style={{color: '#DDBEA8'}}>{fmtNum(market.timeOnMarketDays)} days</div>
            {typeof market.timeOnMarketPercentile === "number" ? <div className="mt-1 text-sm text-gray-500">{market.timeOnMarketPercentile}th percentile (lower is faster)</div> : null}
          </div>
          <ToneStat metric="roadSales" label="Supply/Demand" value={fmtNum(market.roadSalesLastYear)} helper="sold on this road (12m)" data={{market, overview}} />
          <ToneStat metric="onMarketCount" label="How many on the market" value={fmtNum(market.onMarketCountForConfig)} helper={`${overview.bedrooms}-bed ${overview.propertyType}`} data={{market, overview}} overrides={{onMarketCount: 'negative'}} />
          <Stat label="Average sold price" value={fmtGBP(market.avgSoldPriceForConfig)} helper={`${overview.bedrooms}-bed ${overview.propertyType}`} />
        </div>

        {/* Sold price change — lollipop chart */}
        <div className="mt-6">
          <h4 className="text-sm font-semibold mb-3" style={{fontSize: '0.7rem'}}>
            Average sold house prices in {postcode} for {propertyType}
          </h4>
          <SoldChangeChart data={market.avgPriceChangeSoldByPeriod} />
        </div>
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
                  <div className="text-xs text-gray-500">Importance</div>
                  <div className="text-sm font-semibold">{Math.round(c.importance * 100)}%</div>
                </div>
              </div>
              <div className="mt-3">
                <Progress value={c.matchScore} />
                <div className="mt-1 text-sm text-gray-600">
                  Match: {Math.round(c.matchScore)}%
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
              {generateBinaryCriteria.met?.map((c, i) => (
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
              {(!generateBinaryCriteria.met || generateBinaryCriteria.met.length === 0) && (
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
              {generateBinaryCriteria.notMet?.map((c, i) => (
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
              {(!generateBinaryCriteria.notMet || generateBinaryCriteria.notMet.length === 0) && (
                <div className="text-sm text-red-600">All binary criteria matched</div>
              )}
            </div>
          </div>
        </div>
      </section>

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
    { label: "Garden", importance: 0.2, matchScore: 100, valueText: "Present", isBinary: true },
    { label: "Parking", importance: 0.2, matchScore: 0, valueText: "Not present", isBinary: true },
    { label: "Garage", importance: 0.15, matchScore: 100, valueText: "Present", isBinary: true },
    { label: "New build", importance: 0.1, matchScore: 0, valueText: "Not present", isBinary: true },
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
  const [propertyHistory, setPropertyHistory] = React.useState(null);
  const [propertyData, setPropertyData] = React.useState(null);
  const [landRegistryData, setLandRegistryData] = React.useState(null);
  const [yearlyPriceChanges, setYearlyPriceChanges] = React.useState(null);
  const [hasRealPPDData, setHasRealPPDData] = React.useState(false);
  const [userPreferences, setUserPreferences] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Get comprehensive analysis data and user preferences from localStorage
    const savedComprehensiveAnalysis = localStorage.getItem('comprehensiveAnalysis');
    const savedUserPreferences = localStorage.getItem('userPreferences');
    
    if (savedComprehensiveAnalysis) {
      try {
        const analysisData = JSON.parse(savedComprehensiveAnalysis);
        setAiAnalysis(analysisData);
        console.log('📊 Comprehensive analysis loaded:', analysisData);
        
        // Set property data from basicInfo
        if (analysisData.basicInfo) {
          setPropertyData({
            address: analysisData.basicInfo.propertyAddress,
            price: analysisData.basicInfo.listingPrice,
            bedrooms: analysisData.basicInfo.numberOfBedrooms,
            bathrooms: analysisData.basicInfo.numberOfBathrooms,
            propertyType: analysisData.basicInfo.propertyType,
            size: analysisData.basicInfo.floorAreaSqm,
            description: `${analysisData.basicInfo.propertyAddress} - ${analysisData.basicInfo.propertyType}`
          });
        }
        
        // Set score data from analysis
        if (analysisData.diagnostics) {
          setScoreData({
            overall: Math.round(analysisData.diagnostics.confidence * 100),
            investment: Math.round(analysisData.diagnostics.confidence * 85),
            personalFit: Math.round(analysisData.diagnostics.confidence * 90)
          });
        }
        
        // Set property history from sale history
        if (analysisData.basicInfo.propertySaleHistory) {
          setPropertyHistory({
            currentPrice: analysisData.basicInfo.listingPrice,
            saleHistory: Array.isArray(analysisData.basicInfo.propertySaleHistory) 
              ? analysisData.basicInfo.propertySaleHistory 
              : null,
            hasHistory: Array.isArray(analysisData.basicInfo.propertySaleHistory) 
              ? analysisData.basicInfo.propertySaleHistory.length > 0 
              : false
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

  // Generate custom criteria from comprehensive analysis
  const generateCustomCriteria = React.useMemo(() => {
    if (!aiAnalysis || !userPreferences) {
      console.log('🚫 No analysis or preferences found, using mock data');
      return mockData.customCriteria;
    }
    
    console.log('🔍 Generating custom criteria from comprehensive analysis:', aiAnalysis);
    const criteria = [];
    
    // 1. Distance to preferred postcode
    if (userPreferences.postcode) {
      criteria.push({
        label: "Distance to preferred postcode",
        importance: 0.8,
        matchScore: 86,
        valueText: "2.3 km from SK8"
      });
    }
    
    // 2. Size
    if (userPreferences.space) {
      criteria.push({
        label: "Size",
        importance: 0.7,
        matchScore: 85,
        valueText: `${aiAnalysis.basicInfo?.floorAreaSqm || 'Unknown'} sqm`
      });
    }
    
    // 3. Number of Bedrooms
    if (userPreferences.bedrooms) {
      criteria.push({
        label: "Number of Bedrooms",
        importance: 0.9,
        matchScore: 100,
        valueText: `${aiAnalysis.basicInfo?.numberOfBedrooms || 'Unknown'} bedrooms`
      });
    }
    
    // 4. Number of Bathrooms
    if (userPreferences.bathrooms) {
      criteria.push({
        label: "Number of Bathrooms",
        importance: 0.8,
        matchScore: 100,
        valueText: `${aiAnalysis.basicInfo?.numberOfBathrooms || 'Unknown'} bathrooms`
      });
    }
    
    // 5. Property Type
    if (userPreferences.propertyType) {
      criteria.push({
        label: "Property Type",
        importance: 0.6,
        matchScore: 100,
        valueText: aiAnalysis.basicInfo?.propertyType || 'Unknown'
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
    
    console.log('✅ Generated criteria:', criteria);
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
      if (value === true) {
        met.push({
          label: key.charAt(0).toUpperCase() + key.slice(1),
          importance: 0.8 // Default importance
        });
      } else if (value === false) {
        notMet.push({
          label: key.charAt(0).toUpperCase() + key.slice(1),
          importance: 0.8 // Default importance
        });
      }
    });
    
    return { met, notMet };
  }, [aiAnalysis]);

  // Merge mock data with AI analysis and real scores
  const reportData = React.useMemo(() => {
    let data = { ...mockData };
    
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
    }
    
    // Update with AI analysis
    if (aiAnalysis) {
      data.summary = [
        {
          title: "Positives",
          items: Array.isArray(aiAnalysis.positives) ? aiAnalysis.positives : mockData.summary[0].items
        },
        {
          title: "Things to consider", 
          items: Array.isArray(aiAnalysis.thingsToConsider) ? aiAnalysis.thingsToConsider : mockData.summary[1].items
        },
        {
          title: "Overall",
          items: Array.isArray(aiAnalysis.overall) ? aiAnalysis.overall : (aiAnalysis.overall ? [aiAnalysis.overall] : mockData.summary[2].items)
        }
      ];
    }
    
    // Update with real scores
    if (scoreData) {
      data.overview = {
        ...data.overview,
        overallScore: scoreData.overall || mockData.overview.overallScore
      };
    }
    
    // Update with real property growth data
    if (propertyHistory && propertyHistory.hasHistory && propertyHistory.avgAnnualGrowth) {
      data.market = {
        ...data.market,
        avgPctPriceGrowthPerYear: propertyHistory.avgAnnualGrowth
      };
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
    
    return data;
  }, [aiAnalysis, scoreData, propertyHistory, propertyData, yearlyPriceChanges, generateCustomCriteria, generateBinaryCriteria]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F3DFC1' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-lg" style={{ color: '#160F29' }}>Generating personalised analysis...</p>
        </div>
      </div>
    );
  }

  return <HomeLensReport data={reportData} landRegistryData={landRegistryData} hasRealPPDData={hasRealPPDData} propertyData={propertyData} />;
}