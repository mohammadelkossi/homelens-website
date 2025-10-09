// components/ScoreBadge.tsx
import React from "react";

const COLORS = {
  navy: "#160F29",
  tealDark: "#246A73", 
  teal: "#368F8B",
  tan: "#F3DFC1",
  beige: "#DDBEA8"
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function ScoreBadge({ score }: { score: number }) {
  const max = 999;
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
  const polar = (angleDeg: number) => {
    const rad = (Math.PI / 180) * angleDeg;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  
  const arcPath = (a0: number, a1: number) => {
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

  // Get score category and color
  let scoreCategory = "Poor";
  let scoreColor = "#ef4444";
  if (score >= 850) { scoreCategory = "Excellent"; scoreColor = "#16a34a"; }
  else if (score >= 700) { scoreCategory = "Very Good"; scoreColor = "#059669"; }
  else if (score >= 550) { scoreCategory = "Good"; scoreColor = "#ca8a04"; }
  else if (score >= 400) { scoreCategory = "Fair"; scoreColor = "#ea580c"; }

  return (
    <div className="relative w-[220px] h-[150px]">
      <svg viewBox="0 0 240 140" className="w-full h-full">
        <g transform={`translate(0,-10)`}>{segPaths}</g>
      </svg>
      <div className="absolute left-1/2 top-[94px] -translate-x-1/2 text-center">
        <div className="text-5xl font-semibold" style={{color: '#246A73'}}>{s}</div>
      </div>
    </div>
  );
}

export function ScoreBreakdownList({
  items
}: {
  items: { id: string; label: string; pillar: string; raw_0_100: number; weight_within_pillar: number }[];
}) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {items.map((it) => (
        <div key={it.id} className="flex items-center justify-between rounded-xl border p-2">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide opacity-60">{it.pillar}</span>
            <span className="font-medium">{it.label}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-28 h-2 bg-gray-200 rounded">
              <div
                className="h-2 bg-black/70 rounded"
                style={{ width: `${Math.max(0, Math.min(100, it.raw_0_100))}%` }}
              />
            </div>
            <span className="text-sm tabular-nums">{it.raw_0_100}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
