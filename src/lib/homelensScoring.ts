// lib/homelensScoring.ts
// Self-contained HomeLens 0–999 scoring engine + default config + helpers.

////////////////////
// Types
////////////////////
export type Normalizer =
  | { type: "ratio_delta"; params: { cap_abs_delta: number } }
  | { type: "bounded_ratio"; params: { target: number | "area_avg_yield"; cap?: number; cap_abs?: number } }
  | { type: "inverse_ratio"; params: { baseline: string; cap_ratio: number } }
  | { type: "sweet_spot_count"; params: { ideal_min: number; ideal_max: number; hard_cap: number } }
  | { type: "banded_ratio"; params: { ideal_low: number; ideal_high: number; min_score: number } }
  | { type: "decay_minutes"; params: { ideal_mins: number; ok_mins: number; max_mins: number } }
  | { type: "categorical_match"; params: { exact: number; same_family: number; mismatch: number } }
  | { type: "set_coverage"; params: { bonus_for_must_haves: number; penalty_for_missing_must: number } }
  | { type: "llm_scalar_0_100"; params: { default_importance: number; cap_importance: number } };

export interface MetricConfig {
  id: string;
  label: string;
  weight: number; // weights within pillar; financial sum to 0.50, preferences sum to 0.50
  normalize: Normalizer;
  inputs: string[];
}

export interface ScoreConfig {
  version: string;
  overall: {
    financial_weight: number;
    preference_weight: number;
    calibration: {
      min_raw: number; max_raw: number;
      target_min: number; target_max: number;
      gamma: number; // curve shaping (1 = linear)
    };
  };
  financial: MetricConfig[];
  preferences: MetricConfig[];
}

export interface ScoreBreakdownItem {
  id: string;
  label: string;
  raw_0_100: number;
  weight_within_pillar: number;
  weighted_contribution_0_100: number;
  pillar: "financial" | "preferences";
}

export interface HomeLensScore {
  financial_raw_0_100: number;
  preferences_raw_0_100: number;
  blended_raw_0_100: number;
  score_0_999: number;
  breakdown: ScoreBreakdownItem[];
}

////////////////////
// Default Config
////////////////////
export const HOME_LENS_CONFIG: ScoreConfig = {
  version: "1.0.0",
  overall: {
    financial_weight: 0.5,
    preference_weight: 0.5,
    calibration: {
      min_raw: 0,
      max_raw: 100,
      target_min: 0,
      target_max: 999,
      gamma: 1.0
    }
  },
  financial: [
    {
      id: "price_per_sqm_delta",
      label: "£/sqm vs local avg",
      weight: 0.20,
      normalize: {
        type: "ratio_delta",
        params: { cap_abs_delta: 0.30 }
      },
      inputs: ["subject_ppsqm", "local_avg_ppsqm"]
    },
    {
      id: "local_growth_trend",
      label: "Area price growth",
      weight: 0.10,
      normalize: {
        type: "bounded_ratio",
        params: { target: 0.03, cap: 0.10 }
      },
      inputs: ["area_yoy_growth"]
    },
    {
      id: "days_on_market",
      label: "Days on market",
      weight: 0.07,
      normalize: {
        type: "inverse_ratio",
        params: { baseline: "postcode_median_dom", cap_ratio: 2.0 }
      },
      inputs: ["subject_dom", "postcode_median_dom"]
    },
    {
      id: "market_supply",
      label: "Local supply pressure",
      weight: 0.03,
      normalize: {
        type: "inverse_ratio",
        params: { baseline: "postcode_listings_per_month", cap_ratio: 2.0 }
      },
      inputs: ["subject_type_listings_per_month", "postcode_listings_per_month"]
    },
    {
      id: "street_sales_liquidity",
      label: "Street sales (12–24m)",
      weight: 0.05,
      normalize: {
        type: "sweet_spot_count",
        params: { ideal_min: 2, ideal_max: 8, hard_cap: 20 }
      },
      inputs: ["street_sales_past_24m"]
    },
    {
      id: "gross_rental_yield",
      label: "Gross rental yield",
      weight: 0.05,
      normalize: {
        type: "bounded_ratio",
        params: { target: "area_avg_yield", cap_abs: 0.05 }
      },
      inputs: ["subject_yield", "area_avg_yield"]
    }
  ],
  preferences: [
    {
      id: "beds_baths_match",
      label: "Bedrooms/Bathrooms match",
      weight: 0.15,
      normalize: {
        type: "distance_band",
        // implemented via categorical logic below
        // (we'll reuse banded approach inside scorer)
        params: { ideal_low: 0, ideal_high: 0, min_score: 10 } as any
      },
      inputs: ["subject_beds", "pref_beds", "subject_baths", "pref_baths"]
    } as any,
    {
      id: "size_vs_pref",
      label: "Size (sqm) vs preference",
      weight: 0.10,
      normalize: {
        type: "banded_ratio",
        params: { ideal_low: 0.95, ideal_high: 1.05, min_score: 20 }
      },
      inputs: ["subject_sqm", "pref_sqm"]
    },
    {
      id: "distance_to_anchor",
      label: "Distance/time to anchor",
      weight: 0.10,
      normalize: {
        type: "decay_minutes",
        params: { ideal_mins: 10, ok_mins: 25, max_mins: 45 }
      },
      inputs: ["travel_minutes"]
    },
    {
      id: "property_type_match",
      label: "Property type match",
      weight: 0.05,
      normalize: {
        type: "categorical_match",
        params: { exact: 100, same_family: 70, mismatch: 25 }
      },
      inputs: ["subject_type", "pref_type"]
    },
    {
      id: "feature_flags",
      label: "Features (garden/parking etc.)",
      weight: 0.05,
      normalize: {
        type: "set_coverage",
        params: { bonus_for_must_haves: 1.25, penalty_for_missing_must: 0.5 }
      },
      inputs: ["subject_features[]", "pref_features_required[]", "pref_features_nice[]"]
    },
    {
      id: "custom_free_text",
      label: "Custom preferences (LLM parsed)",
      weight: 0.05,
      normalize: {
        type: "llm_scalar_0_100",
        params: { default_importance: 0.5, cap_importance: 1.0 }
      },
      inputs: ["llm_items[]"]
    }
  ]
};

////////////////////
// Helpers
////////////////////
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function symmetricDeltaToScore(delta: number, cap: number): number {
  const d = clamp(delta, -cap, cap);
  return ((d + cap) / (2 * cap)) * 100; // -cap -> 0, 0 -> 50, +cap -> 100
}

function inverseRatioScore(ratio: number, capRatio: number): number {
  const r = clamp(ratio, 0, capRatio);
  if (r <= 1) return lerp(100, 50, r); // better if < baseline
  const t = (r - 1) / (capRatio - 1 || 1);
  return lerp(50, 20, clamp(t, 0, 1));
}

function decayMinsScore(mins: number, ideal: number, ok: number, max: number): number {
  if (mins <= ideal) return 100;
  if (mins <= ok)   return lerp(100, 75, (mins - ideal) / (ok - ideal));
  if (mins <= max)  return lerp(75, 40,  (mins - ok) / (max - ok));
  return 20;
}

function bandedRatioScore(ratio: number, idealLow: number, idealHigh: number, minScore: number): number {
  if (ratio >= idealLow && ratio <= idealHigh) return 100;
  const dist = ratio < idealLow ? (idealLow - ratio) : (ratio - idealHigh);
  const t = clamp(dist / 0.30, 0, 1); // 30% away -> minScore
  return lerp(100, minScore, t);
}

////////////////////
// Metric scoring
////////////////////
function scoreMetric(cfg: MetricConfig, ctx: Record<string, any>): number {
  const n = cfg.normalize;

  switch (n.type) {
    case "ratio_delta": {
      const subj = ctx["subject_ppsqm"];
      const avg  = ctx["local_avg_ppsqm"];
      if (!avg || !subj) return 50;
      const delta = (avg - subj) / avg; // positive if cheaper per sqm
      return symmetricDeltaToScore(delta, n.params.cap_abs_delta);
    }

    case "bounded_ratio": {
      const target = typeof n.params.target === "string" ? ctx[n.params.target] : n.params.target;
      const val = (ctx["area_yoy_growth"] ?? ctx["subject_yield"]) as number;
      if (target == null || val == null) return 50;
      const cap = (n.params.cap_abs ?? n.params.cap ?? 0.10);
      const delta = clamp((val - target), -cap, cap) / cap; // -1..+1
      return ((delta + 1) / 2) * 100; // 0..100, 50 at parity
    }

    case "inverse_ratio": {
      const num = (cfg.id === "days_on_market")
        ? ctx["subject_dom"]
        : ctx["subject_type_listings_per_month"];
      const denom = ctx[n.params.baseline];
      if (!num || !denom) return 50;
      const ratio = num / denom;
      return inverseRatioScore(ratio, n.params.cap_ratio);
    }

    case "sweet_spot_count": {
      const c = ctx["street_sales_past_24m"] ?? 0;
      const { ideal_min, ideal_max, hard_cap } = n.params;
      if (c >= ideal_min && c <= ideal_max) return 100;
      if (c < ideal_min) {
        const t = clamp((ideal_min - c) / Math.max(1, ideal_min), 0, 1);
        return lerp(100, 20, t);
      }
      // c > ideal_max
      const t = clamp((c - ideal_max) / Math.max(1, hard_cap - ideal_max), 0, 1);
      return lerp(100, 20, t);
    }

    case "banded_ratio": {
      const subj = ctx["subject_sqm"];
      const pref = ctx["pref_sqm"];
      if (!subj || !pref) return 50;
      const ratio = subj / pref;
      return bandedRatioScore(ratio, n.params.ideal_low, n.params.ideal_high, n.params.min_score);
    }

    case "decay_minutes": {
      const m = ctx["travel_minutes"];
      if (m == null) return 50;
      const { ideal_mins, ok_mins, max_mins } = n.params;
      return decayMinsScore(m, ideal_mins, ok_mins, max_mins);
    }

    case "categorical_match": {
      const s = (ctx["subject_type"] ?? "").toLowerCase();
      const p = (ctx["pref_type"] ?? "").toLowerCase();
      if (!s || !p) return 50;
      if (s === p) return n.params.exact;
      const families: Record<string, string> = {
        "semi detached": "house", "semi-detached": "house", "detached": "house", "terraced": "house",
        "townhouse": "house", "mews house": "house", "bungalow": "house",
        "flat / apartment": "flat", "apartment": "flat", "flat": "flat"
      };
      const sf = families[s] ?? s;
      const pf = families[p] ?? p;
      return sf === pf ? n.params.same_family : n.params.mismatch;
    }

    case "set_coverage": {
      const subj: string[] = (ctx["subject_features[]"] ?? []).map((x: string) => x.toLowerCase());
      const req: string[]  = (ctx["pref_features_required[]"] ?? []).map((x: string) => x.toLowerCase());
      const nice: string[] = (ctx["pref_features_nice[]"] ?? []).map((x: string) => x.toLowerCase());

      if (!subj.length && (!req.length && !nice.length)) return 50;

      const reqHit = req.filter(f => subj.includes(f)).length;
      const reqMiss = Math.max(0, req.length - reqHit);
      const niceHit = nice.filter(f => subj.includes(f)).length;

      const reqScore = req.length ? (reqHit / req.length) : 1;
      const niceScore = nice.length ? (niceHit / nice.length) : 0.5;

      let score = (0.7 * reqScore + 0.3 * niceScore) * 100;
      if (reqHit === req.length && req.length > 0) score *= n.params.bonus_for_must_haves;
      if (reqMiss > 0 && req.length > 0) score *= n.params.penalty_for_missing_must;
      return clamp(score, 0, 100);
    }

    case "llm_scalar_0_100": {
      const items: { score: number; importance?: number }[] = ctx["llm_items[]"] ?? [];
      if (!items.length) return 50;
      const cap = n.params.cap_importance;
      const defImp = n.params.default_importance;
      const wsum = items.reduce((acc, it) => acc + clamp(it.importance ?? defImp, 0, cap), 0);
      const ssum = items.reduce((acc, it) => acc + it.score * clamp(it.importance ?? defImp, 0, cap), 0);
      return clamp(ssum / (wsum || 1), 0, 100);
    }
  }
}

////////////////////
// Pillar + overall
////////////////////
function scorePillar(metrics: MetricConfig[], ctx: Record<string, any>): { raw: number; items: ScoreBreakdownItem[] } {
  const totalWeight = metrics.reduce((a, m) => a + m.weight, 0) || 1;
  let acc = 0;
  const items: ScoreBreakdownItem[] = [];

  for (const m of metrics) {
    const s = scoreMetric(m, ctx); // 0..100
    const w = m.weight / totalWeight;
    acc += s * w;

    items.push({
      id: m.id,
      label: m.label,
      raw_0_100: Math.round(s),
      weight_within_pillar: Number(w.toFixed(4)),
      weighted_contribution_0_100: Number((s * w).toFixed(2)),
      pillar: "financial" // placeholder, fix after loop
    });
  }

  return { raw: acc, items };
}

function calibrate(raw0to100: number, minRaw: number, maxRaw: number, tgtMin: number, tgtMax: number, gamma = 1): number {
  const t = clamp((raw0to100 - minRaw) / (maxRaw - minRaw || 1), 0, 1);
  const curved = Math.pow(t, gamma);
  return Math.round(tgtMin + (tgtMax - tgtMin) * curved);
}

export function scoreHomeLens(cfg: ScoreConfig, ctx: Record<string, any>): HomeLensScore {
  const fin = scorePillar(cfg.financial, ctx);
  const pref = scorePillar(cfg.preferences, ctx);

  // Fix pillar labels on breakdown items:
  fin.items.forEach(i => (i.pillar = "financial"));
  pref.items.forEach(i => (i.pillar = "preferences"));

  const blended = fin.raw * cfg.overall.financial_weight + pref.raw * cfg.overall.preference_weight;
  const { min_raw, max_raw, target_min, target_max, gamma } = cfg.overall.calibration;
  const score999 = calibrate(blended, min_raw, max_raw, target_min, target_max, gamma);

  return {
    financial_raw_0_100: Math.round(fin.raw),
    preferences_raw_0_100: Math.round(pref.raw),
    blended_raw_0_100: Math.round(blended),
    score_0_999: score999,
    breakdown: [...fin.items, ...pref.items]
  };
}

////////////////////
// Context builder (optional convenience)
// Use this to convert your parsed Rightmove + prefs into the ctx shape.
////////////////////
export function buildScoreContext(input: {
  listingPrice?: number;            // £
  floorAreaSqm?: number;            // sqm
  localAvgPPSqm?: number;           // £/sqm (postcode + type)
  areaYoYGrowth?: number;           // e.g. 0.035
  areaAvgYield?: number;            // e.g. 0.045
  estimatedMonthlyRent?: number;    // £/mo (if subject_yield not provided)
  subjectYield?: number;            // 0.0..1.0 (annual)
  subjectDOM?: number;              // days on market
  postcodeMedianDOM?: number;
  subjectTypeListingsPerMonth?: number;
  postcodeListingsPerMonth?: number;
  streetSalesPast24m?: number;
  subjectType?: string;
  beds?: number; baths?: number;
  prefBeds?: number; prefBaths?: number;
  prefSqm?: number;
  travelMinutes?: number;
  subjectFeatures?: string[];
  prefFeaturesRequired?: string[];
  prefFeaturesNice?: string[];
  llmItems?: { score: number; importance?: number }[]; // parsed from free text
}): Record<string, any> {
  const annualRent = input.estimatedMonthlyRent ? input.estimatedMonthlyRent * 12 : undefined;
  const subjectYield = input.subjectYield ?? (
    input.listingPrice && annualRent ? annualRent / input.listingPrice : undefined
  );

  const subject_ppsqm =
    input.listingPrice && input.floorAreaSqm ? input.listingPrice / input.floorAreaSqm : undefined;

  return {
    // Financial
    subject_ppsqm,
    local_avg_ppsqm: input.localAvgPPSqm,
    area_yoy_growth: input.areaYoYGrowth,
    subject_yield: subjectYield,
    area_avg_yield: input.areaAvgYield,
    subject_dom: input.subjectDOM,
    postcode_median_dom: input.postcodeMedianDOM,
    subject_type_listings_per_month: input.subjectTypeListingsPerMonth,
    postcode_listings_per_month: input.postcodeListingsPerMonth,
    street_sales_past_24m: input.streetSalesPast24m,

    // Preferences
    subject_beds: input.beds,
    pref_beds: input.prefBeds,
    subject_baths: input.baths,
    pref_baths: input.prefBaths,
    subject_sqm: input.floorAreaSqm,
    pref_sqm: input.prefSqm,
    travel_minutes: input.travelMinutes,
    subject_type: input.subjectType,
    pref_type: input.subjectType, // set your actual user preference here if different
    "subject_features[]": input.subjectFeatures ?? [],
    "pref_features_required[]": input.prefFeaturesRequired ?? [],
    "pref_features_nice[]": input.prefFeaturesNice ?? [],
    "llm_items[]": input.llmItems ?? []
  };
}

////////////////////
// Tiny helper for beds/baths match (inside scorer via custom logic)
////////////////////
// We piggybacked on "distance_band" placeholder; implement here:
function bedsBathsScore(subjectBeds?: number, prefBeds?: number, subjectBaths?: number, prefBaths?: number): number {
  if (!subjectBeds || !prefBeds || !subjectBaths || !prefBaths) return 50;

  const bedDiff = Math.abs(subjectBeds - prefBeds);
  const bathDiff = Math.abs(subjectBaths - prefBaths);

  const oneDimScore = (d: number) => (d === 0 ? 100 : d === 1 ? 75 : d === 2 ? 40 : 10);
  const bedScore = oneDimScore(bedDiff);
  const bathScore = oneDimScore(bathDiff);

  return Math.round((bedScore * 0.6) + (bathScore * 0.4));
}

// Patch into scorer: override default for that metric id
const _origScoreMetric = scoreMetric;
(scoreMetric as any) = function patchedScoreMetric(cfg: MetricConfig, ctx: Record<string, any>) {
  if (cfg.id === "beds_baths_match") {
    return bedsBathsScore(ctx["subject_beds"], ctx["pref_beds"], ctx["subject_baths"], ctx["pref_baths"]);
  }
  return _origScoreMetric(cfg, ctx);
};
