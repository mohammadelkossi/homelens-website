import { NextRequest, NextResponse } from 'next/server';

// Helper functions for the scoring formula
function wins(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lin_good(value: number, min: number, max: number): number {
  if (value <= min) return 0;
  if (value >= max) return 1;
  return (value - min) / (max - min);
}

function logistic(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

function shrink(theta: number, prior: number, n: number, lam: number): number {
  const weight = n / (n + lam);
  return weight * theta + (1 - weight) * prior;
}

function weighted_avg(values: number[], weights: number[], available_mask?: boolean[]): number {
  if (available_mask) {
    const filtered_values = values.filter((_, i) => available_mask[i]);
    const filtered_weights = weights.filter((_, i) => available_mask[i]);
    const sum_weights = filtered_weights.reduce((a, b) => a + b, 0);
    return filtered_values.reduce((sum, val, i) => sum + val * filtered_weights[i], 0) / sum_weights;
  }
  return values.reduce((sum, val, i) => sum + val * weights[i], 0);
}

function compute_preferences_index(user_prefs: any, property: any): number {
  // This is a simplified version - you can expand this based on your actual preference logic
  let score = 0.5; // Base score
  
  // Example preference matching (you can customize this)
  if (user_prefs.featuresImportance) {
    const features = user_prefs.featuresImportance;
    let featureScore = 0;
    let featureCount = 0;
    
    // Match property features with user preferences
    Object.entries(features).forEach(([feature, importance]) => {
      if (typeof importance === 'number') {
        // Simple scoring based on importance (you can make this more sophisticated)
        featureScore += importance / 10;
        featureCount++;
      }
    });
    
    if (featureCount > 0) {
      score = featureScore / featureCount;
    }
  }
  
  return Math.max(0, Math.min(1, score));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      propertyData, 
      marketMetrics, 
      userPrefs, 
      compsData,
      propertyHistory 
    } = body;

    console.log('🏠 SCORING API CALLED - Property scoring with formula:', { propertyData, marketMetrics, userPrefs });

    // Extract data for the formula
    const ask_price = propertyData.price || 350000;
    const living_area_sqm = propertyData.size || 108;
    const days_on_market = propertyData.daysOnMarket ?? marketMetrics?.timeOnMarketDays ?? 21;
    
    // Calculate price per square metre
    const pricePerSqm = ask_price / Math.max(living_area_sqm, 1);
    console.log(`💰 Price per sqm calculation: £${ask_price.toLocaleString()} ÷ ${living_area_sqm} sq m = £${Math.round(pricePerSqm).toLocaleString()}/sq m`);
    console.log(`📅 Days on market for scoring: ${days_on_market} days (source: ${propertyData.daysOnMarket ? 'propertyData.daysOnMarket' : marketMetrics?.timeOnMarketDays ? 'marketMetrics fallback' : 'default fallback'})`);
    
    // Mock data for demonstration - replace with real data
    const listed_comps = [3800, 3900, 4000, 3850, 3950]; // Price per sqm
    const sold_30d_comps = [3700, 3750, 3800, 3850];
    const sold_90d_band = [3600, 3700, 3800, 3900, 4000];
    const sold_12m_on_road = marketMetrics.roadSalesLastYear || 3;
    const total_props_on_road = 50; // Mock data
    const active_comp_count = marketMetrics.onMarketCountForConfig || 2;
    const rolling_median_active_count = 3; // Mock data
    const postcode_turnover = 0.08; // Mock data

    // Calculate P (preferences index)
    const P = compute_preferences_index(userPrefs, propertyData);

    // Metric 1: Price per sqm analysis
    const ppsqm = ask_price / Math.max(living_area_sqm, 1);
    const L = listed_comps.reduce((a, b) => a + b, 0) / listed_comps.length;
    const S = sold_30d_comps.reduce((a, b) => a + b, 0) / sold_30d_comps.length;
    const rL = wins(ppsqm / L, 0.6, 1.6);
    const sL = lin_good(rL, 0.85, 1.15);
    const rS = wins(ppsqm / S, 0.6, 1.6);
    const sS = lin_good(rS, 0.85, 1.15);
    const s1 = 0.6 * sS + 0.4 * sL;

    // Metric 2: Growth analysis using real property history
    let cagr_prop = 0.02; // Default fallback
    if (propertyHistory && propertyHistory.hasHistory && propertyHistory.avgAnnualGrowth) {
      cagr_prop = propertyHistory.avgAnnualGrowth / 100; // Convert percentage to decimal
      console.log('📈 Using real property growth:', propertyHistory.avgAnnualGrowth + '%');
    } else {
      console.log('📈 Using fallback property growth: 2%');
    }
    
    const cagr_area = 0.021; // Mock area growth (you can update this with real area data later)
    const delta = wins(cagr_prop - cagr_area, -0.05, 0.05);
    const s2 = logistic(delta / 0.01);

    // Metric 3: Time on market
    const s3 = Math.exp(-Math.max(days_on_market - 7, 0) / 45);

    // Metric 4: Road turnover
    const theta = sold_12m_on_road / Math.max(total_props_on_road, 1);
    const theta_hat = shrink(theta, postcode_turnover, sold_12m_on_road, 10);
    const s4 = lin_good(wins(theta_hat, 0, 0.3), 0.04, 0.12);

    // Metric 5: Active competition
    const rc = Math.log(1 + active_comp_count) / Math.log(1 + rolling_median_active_count + 5);
    const s5 = lin_good(rc, 0.6, 1.4);

    // Metric 6: 90-day price comparison
    const median_90d = sold_90d_band.reduce((a, b) => a + b, 0) / sold_90d_band.length;
    const r90 = wins(ask_price / median_90d, 0.6, 1.6);
    const s6 = lin_good(r90, 0.9, 1.1);

    // Aggregate metrics
    const metrics = [s1, s2, s3, s4, s5, s6];
    const weights = [0.30, 0.10, 0.10, 0.15, 0.10, 0.25];
    const M = weighted_avg(metrics, weights);

    // Coverage score (simplified)
    const C = 0.8; // Mock coverage score
    const M_adjusted = M * (0.9 + 0.1 * C);

    // Final HomeLens score
    const HomeLens = Math.round(999 * (0.5 * P + 0.5 * M_adjusted));

    // Calculate individual scores for display
    const investmentScore = Math.round(999 * M_adjusted);
    const personalFitScore = Math.round(999 * P);

    return NextResponse.json({
      success: true,
      scores: {
        overall: HomeLens,
        investment: investmentScore,
        personalFit: personalFitScore
      },
      metrics: {
        s1, s2, s3, s4, s5, s6,
        P, M: M_adjusted
      },
      breakdown: {
        pricePerSqm: ppsqm,
        listedMedian: L,
        sold30dMedian: S,
        daysOnMarket: days_on_market,
        roadTurnover: theta_hat,
        activeComps: active_comp_count
      }
    });

  } catch (error) {
    console.error('Scoring error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      scores: {
        overall: 750,
        investment: 700,
        personalFit: 800
      }
    });
  }
}
