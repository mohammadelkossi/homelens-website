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

// Simple lollipop chart for sold price change by period (1m/3m/6m/1y)
function SoldChangeChart({ data }) {
  const order = ["1m", "3m", "6m", "1y"]; // left to right
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
            <circle cx={x} cy={up ? y : y + 12} r="8" fill={up ? '#16a34a' : '#ef4444'} />
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
function HomeLensReport({ data = mockData, onPrint }) {
  const { overallScore, overview, market, customCriteria, summary } = data;

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
          <ToneStat metric="yoy" label="YoY price growth (postcode)" value={fmtPct(market.avgPctPriceGrowthPerYear)} data={{market, overview}} />
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
        <div className="mt-6 rounded-2xl border border-gray-200 p-4">
          <SoldChangeChart data={market.avgPriceChangeSoldByPeriod} />
        </div>
      </section>

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
                  {c.valueText && <div className="text-sm text-gray-500">{c.valueText}</div>}
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Importance</div>
                  <div className="text-sm font-semibold">{Math.round(c.importance * 100)}%</div>
                </div>
              </div>
              <div className="mt-3">
                <Progress value={c.matchScore} />
                <div className="mt-1 text-sm text-gray-600">Match: {Math.round(c.matchScore)}%</div>
                {c.note && <div className="mt-2 text-sm text-gray-500">{c.note}</div>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== 4) SUMMARY / RECOMMENDATIONS ===== */}
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
    avgPriceChangeSoldByPeriod: { "1m": -0.8, "3m": 0.6, "6m": 1.9, "1y": 2.1 },
    timeOnMarketDays: 21,
    timeOnMarketPercentile: 35,
    roadSalesLastYear: 3,
    avgSoldPriceForConfig: 420000,
    onMarketCountForConfig: 2,
  },
  customCriteria: [
    { label: "Distance to preferred postcode", importance: 0.25, matchScore: 86, valueText: "2.3 km from SK8" },
    { label: "Off-street parking", importance: 0.2, matchScore: 100, valueText: "Driveway + garage" },
    { label: "Garden size", importance: 0.2, matchScore: 72, valueText: "Medium garden", note: "South-west facing" },
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
  return <HomeLensReport data={mockData} />;
}