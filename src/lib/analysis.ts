import { ScrapedPropertyData, AnalysisResults, CategoryScore, MarketMetrics, LocalityData } from '../types/property';
import { derivePostcodeArea, fetchAvgAnnualGrowthPct, fetchAvgListedPricePerSqm, fetchAvgSoldPricePerSqm, fetchBandedAvgSoldPriceLast90d, fetchSoldPriceChangePct } from './market';
import { fetchLocalityData, calculateLocalityScores, geocodeAddress } from './places';

export interface AnalysisConfig {
  nonNegotiables: {
    minBathrooms: number;
    minSize: number; // in square meters
    requiresGarden: boolean;
    requiresParking: boolean;
  };
  customCriteria?: {
    garageWeight?: { yes: number; no: number };
    locationWeight?: { s10: number; other: number };
    toiletsWeight?: { two: number; one: number };
    parkingSpacesWeight?: { two: number; one: number; none: number };
    gardenWeight?: { yes: number; no: number };
    minSpaceWeight?: { above: number; below: number };
    timeOnMarketWeight?: { underMonth: number; overMonth: number };
    detachedWeight?: { detached: number; semi: number; terraced: number };
  };
  customPreferences?: string; // User's natural language preferences
  criteriaWeights?: {
    garden: number;
    garage: number;
    parkingSpaces: number;
    location: number;
    toilets: number;
    timeOnMarket: number;
  };
  locationPostcode?: string;
  toiletsCount?: number;
  timeOnMarketWeeks?: number;
}

export async function analyzeProperty(
  propertyData: ScrapedPropertyData,
  config: AnalysisConfig
): Promise<AnalysisResults> {
  const financials = analyzeFinancials(propertyData);
  const nonNegotiables = analyzeNonNegotiables(propertyData, config.nonNegotiables);
  const customCriteria = analyzeCustomCriteria(
    propertyData, 
    config.customCriteria, 
    config.criteriaWeights,
    config.locationPostcode,
    config.toiletsCount,
    config.timeOnMarketWeeks
  );

  // Get coordinates for locality analysis
  let coordinates = propertyData.coordinates;
  if (!coordinates) {
    coordinates = await geocodeAddress(propertyData.address);
  }

  // Fetch locality data and calculate scores
  let locality: CategoryScore | undefined;
  let localityData: LocalityData | undefined;
  
  if (coordinates) {
    localityData = await fetchLocalityData(coordinates.lat, coordinates.lng);
    const localityScores = calculateLocalityScores(localityData);
    
    locality = {
      score: localityScores.overall,
      maxScore: 100,
      breakdown: {
        parks: {
          score: localityScores.parks,
          maxScore: 100,
          description: localityData.parks.length > 0 
            ? `Nearest park: ${localityData.parks[0].name} (${Math.round(localityData.parks[0].distance || 0)}m)`
            : 'No parks found nearby'
        },
        airports: {
          score: localityScores.airports,
          maxScore: 100,
          description: localityData.airports.length > 0 
            ? `Nearest airport: ${localityData.airports[0].name} (${Math.round((localityData.airports[0].distance || 0) / 1000)}km)`
            : 'No airports found nearby'
        },
        schools: {
          score: localityScores.schools,
          maxScore: 100,
          description: localityData.schools.length > 0 
            ? `Nearest school: ${localityData.schools[0].name} (${Math.round(localityData.schools[0].distance || 0)}m)`
            : 'No schools found nearby'
        },
        hospitals: {
          score: localityScores.hospitals,
          maxScore: 100,
          description: localityData.hospitals.length > 0 
            ? `Nearest hospital: ${localityData.hospitals[0].name} (${Math.round((localityData.hospitals[0].distance || 0) / 1000)}km)`
            : 'No hospitals found nearby'
        },
        trainStations: {
          score: localityScores.trainStations,
          maxScore: 100,
          description: localityData.trainStations.length > 0 
            ? `Nearest station: ${localityData.trainStations[0].name} (${Math.round(localityData.trainStations[0].distance || 0)}m)`
            : 'No train stations found nearby'
        },
        petrolStations: {
          score: localityScores.petrolStations,
          maxScore: 100,
          description: localityData.petrolStations.length > 0 
            ? `Nearest petrol station: ${localityData.petrolStations[0].name} (${Math.round(localityData.petrolStations[0].distance || 0)}m)`
            : 'No petrol stations found nearby'
        },
        supermarkets: {
          score: localityScores.supermarkets,
          maxScore: 100,
          description: localityData.supermarkets.length > 0 
            ? `Nearest supermarket: ${localityData.supermarkets[0].name} (${Math.round(localityData.supermarkets[0].distance || 0)}m)`
            : 'No supermarkets found nearby'
        }
      }
    };
  }

  // Calculate overall score including locality
  const categoryScores = [financials, nonNegotiables, customCriteria];
  if (locality) categoryScores.push(locality);
  
  const overallScore = Math.round(
    categoryScores.reduce((sum, cat) => sum + cat.score, 0) / categoryScores.length
  );

  const recommendations = generateRecommendations({
    financials,
    nonNegotiables,
    customCriteria,
    locality
  }, config.customPreferences);

  return {
    overallScore,
    categories: {
      financials,
      nonNegotiables,
      customCriteria,
      locality
    },
    propertyData: {
      ...propertyData,
      url: '', // Will be set by the API
      coordinates
    },
    recommendations,
    marketMetrics: await computeMarketMetrics(propertyData),
    localityData
  };
}

function analyzeFinancials(property: ScrapedPropertyData): CategoryScore {
  const breakdown: CategoryScore['breakdown'] = {};
  let totalScore = 0;
  let maxScore = 0;

  // Price per square meter analysis (primary focus)
  if (property.size && property.size > 0) {
    const pricePerSqm = property.price / property.size;
    
    // Score based on price per sqm ranges
    let pricePerSqmScore = 0;
    let pricePerSqmRating = '';
    
    if (pricePerSqm < 2000) {
      pricePerSqmScore = 95;
      pricePerSqmRating = 'Excellent value';
    } else if (pricePerSqm < 3000) {
      pricePerSqmScore = 85;
      pricePerSqmRating = 'Good value';
    } else if (pricePerSqm < 4000) {
      pricePerSqmScore = 70;
      pricePerSqmRating = 'Fair value';
    } else if (pricePerSqm < 5000) {
      pricePerSqmScore = 50;
      pricePerSqmRating = 'Premium pricing';
    } else {
      pricePerSqmScore = 25;
      pricePerSqmRating = 'High-end pricing';
    }
    
    breakdown.pricePerSqm = {
      score: pricePerSqmScore,
      maxScore: 100,
      description: `£${pricePerSqm.toFixed(0)}/sqm - ${pricePerSqmRating}`
    };
    totalScore += pricePerSqmScore;
    maxScore += 100;
  } else {
    // If no size data available, score based on price alone
    breakdown.pricePerSqm = {
      score: 50,
      maxScore: 100,
      description: 'Size not available - cannot calculate price per sqm'
    };
    totalScore += 50;
    maxScore += 100;
  }

  // Property size analysis
  if (property.size) {
    let sizeScore = 0;
    let sizeRating = '';
    
    if (property.size >= 150) {
      sizeScore = 90;
      sizeRating = 'Large property';
    } else if (property.size >= 100) {
      sizeScore = 75;
      sizeRating = 'Good size';
    } else if (property.size >= 75) {
      sizeScore = 60;
      sizeRating = 'Average size';
    } else {
      sizeScore = 40;
      sizeRating = 'Compact';
    }
    
    breakdown.size = {
      score: sizeScore,
      maxScore: 100,
      description: `${property.size} sqm - ${sizeRating}`
    };
    totalScore += sizeScore;
    maxScore += 100;
  }

  // Total price analysis
  let priceScore = 0;
  let priceRating = '';
  
  if (property.price < 200000) {
    priceScore = 90;
    priceRating = 'Affordable';
  } else if (property.price < 400000) {
    priceScore = 75;
    priceRating = 'Mid-range';
  } else if (property.price < 600000) {
    priceScore = 60;
    priceRating = 'Premium';
  } else {
    priceScore = 40;
    priceRating = 'Luxury';
  }
  
  breakdown.totalPrice = {
    score: priceScore,
    maxScore: 100,
    description: `£${property.price.toLocaleString()} - ${priceRating}`
  };
  totalScore += priceScore;
  maxScore += 100;

  return {
    score: Math.round(totalScore / (maxScore / 100)),
    maxScore: 100,
    breakdown
  };
}

function analyzeCustomCriteria(
  property: ScrapedPropertyData,
  weights?: AnalysisConfig['customCriteria'],
  criteriaWeights?: AnalysisConfig['criteriaWeights'],
  locationPostcode?: string,
  toiletsCount?: number,
  timeOnMarketWeeks?: number
): CategoryScore {
  const w = {
    garageWeight: { yes: 0.8, no: 0.2 },
    locationWeight: { s10: 1.0, other: 0.2 },
    toiletsWeight: { two: 0.8, one: 0.2 },
    parkingSpacesWeight: { two: 0.8, one: 0.5, none: 0.2 },
    gardenWeight: { yes: 0.8, no: 0.2 },
    minSpaceWeight: { above: 0.8, below: 0.2 },
    timeOnMarketWeight: { underMonth: 0.8, overMonth: 0.2 },
    detachedWeight: { detached: 0.8, semi: 0.5, terraced: 0.2 },
    ...weights
  };

  const breakdown: CategoryScore['breakdown'] = {};
  let total = 0;
  let count = 0;

  const haystack = `${property.description} ${(property as any).features?.join(' ') || ''}`.toLowerCase();

  // 1. Garage
  const hasGarage = /\bgarage\b/.test(haystack);
  const garageScore = hasGarage ? w.garageWeight.yes : w.garageWeight.no;
  breakdown.garage = { score: Math.round(garageScore * 100), maxScore: 100, description: hasGarage ? 'Garage: yes' : 'Garage: no' };
  total += breakdown.garage.score; count++;

  // 2. Location (custom postcode or S10)
  let locationScore = 0;
  let locationDescription = '';
  
  if (locationPostcode) {
    const isPreferredPostcode = property.postcode.toUpperCase().startsWith(locationPostcode.toUpperCase());
    locationScore = isPreferredPostcode ? 100 : 20;
    locationDescription = isPreferredPostcode ? `Preferred postcode ${locationPostcode}` : `Not in preferred postcode ${locationPostcode}`;
  } else {
    const isS10 = property.postcode.toUpperCase().startsWith('S10');
    locationScore = isS10 ? 100 : 20;
    locationDescription = isS10 ? 'Postcode S10' : `Postcode ${property.postcode}`;
  }
  
  breakdown.location = { score: locationScore, maxScore: 100, description: locationDescription };
  total += breakdown.location.score; count++;

  // 3. Number of toilets (custom count or default logic)
  let toiletsScore = 0;
  let toiletsDescription = '';
  
  if (toiletsCount) {
    const hasEnoughToilets = property.bathrooms >= toiletsCount;
    toiletsScore = hasEnoughToilets ? 100 : 20;
    toiletsDescription = hasEnoughToilets ? `Toilets: ${property.bathrooms} (meets requirement of ${toiletsCount})` : `Toilets: ${property.bathrooms} (needs ${toiletsCount})`;
  } else {
    const toiletsTwo = /\b2\s*(toilets?|wc\b)/.test(haystack) || property.bathrooms >= 2;
    const toiletsOne = /\b1\s*(toilet|wc\b)/.test(haystack) || property.bathrooms === 1;
    toiletsScore = toiletsTwo ? 80 : toiletsOne ? 20 : 20;
    toiletsDescription = toiletsTwo ? 'Toilets: 2+' : 'Toilets: 1';
  }
  
  breakdown.toilets = { score: toiletsScore, maxScore: 100, description: toiletsDescription };
  total += breakdown.toilets.score; count++;

  // 4. Parking spaces
  const twoParking = /\b(2|two)\s*(parking|spaces|cars)\b/.test(haystack) || /\bdouble\s+drive/.test(haystack);
  const oneParking = /\b(1|one)\s*(parking|space|car)\b/.test(haystack) || /\bdriveway\b/.test(haystack);
  const parkingScore = twoParking ? w.parkingSpacesWeight.two : oneParking ? w.parkingSpacesWeight.one : w.parkingSpacesWeight.none;
  breakdown.parking = { score: Math.round(parkingScore * 100), maxScore: 100, description: twoParking ? 'Parking: 2' : oneParking ? 'Parking: 1' : 'Parking: none' };
  total += breakdown.parking.score; count++;

  // 5. Garden
  const hasGarden = /\bgarden\b/.test(haystack) && !/no\s+garden/.test(haystack);
  const gardenScore = hasGarden ? w.gardenWeight.yes : w.gardenWeight.no;
  breakdown.garden = { score: Math.round(gardenScore * 100), maxScore: 100, description: hasGarden ? 'Garden: yes' : 'Garden: no' };
  total += breakdown.garden.score; count++;

  // 6. Minimum space > 100 sqm
  const spaceAbove = (property.size || 0) > 100;
  const spaceScore = spaceAbove ? w.minSpaceWeight.above : w.minSpaceWeight.below;
  breakdown.space = { score: Math.round(spaceScore * 100), maxScore: 100, description: property.size ? `${property.size} sqm` : 'Size unknown' };
  total += breakdown.space.score; count++;

  // 7. Time on market (custom weeks or default logic)
  let timeScore = 0;
  let timeDescription = '';
  
  if (timeOnMarketWeeks) {
    let underThreshold = false;
    if ((property as any).dateListedIso) {
      const listed = new Date((property as any).dateListedIso as string);
      const days = (Date.now() - listed.getTime()) / (1000 * 60 * 60 * 24);
      const weeks = days / 7;
      underThreshold = weeks < timeOnMarketWeeks;
    }
    timeScore = underThreshold ? 100 : 20;
    timeDescription = underThreshold ? `Under ${timeOnMarketWeeks} weeks` : `Over ${timeOnMarketWeeks} weeks (or unknown)`;
  } else {
    let underMonth = false;
    if ((property as any).dateListedIso) {
      const listed = new Date((property as any).dateListedIso as string);
      const days = (Date.now() - listed.getTime()) / (1000 * 60 * 60 * 24);
      underMonth = days < 30;
    }
    timeScore = underMonth ? 80 : 20;
    timeDescription = underMonth ? 'Under 1 month' : 'Over 1 month (or unknown)';
  }
  
  breakdown.timeOnMarket = { score: timeScore, maxScore: 100, description: timeDescription };
  total += breakdown.timeOnMarket.score; count++;

  // 8. Detached vs semi vs terraced (from propertyType/description)
  const typeText = `${property.propertyType} ${haystack}`.toLowerCase();
  const isDetached = /\bdetached\b/.test(typeText);
  const isSemi = /\bsemi-?detached\b/.test(typeText);
  const isTerraced = /\bterraced\b/.test(typeText);
  const detScore = isDetached ? w.detachedWeight.detached : isSemi ? w.detachedWeight.semi : isTerraced ? w.detachedWeight.terraced : w.detachedWeight.semi;
  const detLabel = isDetached ? 'Detached' : isSemi ? 'Semi-detached' : isTerraced ? 'Terraced' : 'Unknown (assumed semi)';
  breakdown.propertyType = { score: Math.round(detScore * 100), maxScore: 100, description: detLabel };
  total += breakdown.propertyType.score; count++;

  const avgScore = count > 0 ? Math.round(total / count) : 0;
  return { score: avgScore, maxScore: 100, breakdown };
}


function analyzeNonNegotiables(property: ScrapedPropertyData, config: AnalysisConfig['nonNegotiables']): CategoryScore {
  const breakdown: CategoryScore['breakdown'] = {};
  let totalScore = 0;
  let maxScore = 0;

  // Bathroom requirement
  const bathroomScore = property.bathrooms >= config.minBathrooms ? 100 : 0;
  breakdown.bathrooms = {
    score: bathroomScore,
    maxScore: 100,
    description: `${property.bathrooms} bathrooms (min required: ${config.minBathrooms})`
  };
  totalScore += bathroomScore;
  maxScore += 100;

  // Size requirement
  const sizeScore = property.size && property.size >= config.minSize ? 100 : 0;
  breakdown.size = {
    score: sizeScore,
    maxScore: 100,
    description: property.size ? `${property.size} sqm (min required: ${config.minSize})` : 'Size not specified'
  };
  totalScore += sizeScore;
  maxScore += 100;

  // Garden requirement (simplified - would need property description analysis)
  const gardenScore = config.requiresGarden ? 
    (property.description.toLowerCase().includes('garden') ? 100 : 0) : 100;
  breakdown.garden = {
    score: gardenScore,
    maxScore: 100,
    description: config.requiresGarden ? 'Garden requirement' : 'Garden not required'
  };
  totalScore += gardenScore;
  maxScore += 100;

  // Parking requirement (simplified)
  const parkingScore = config.requiresParking ? 
    (property.description.toLowerCase().includes('parking') ? 100 : 0) : 100;
  breakdown.parking = {
    score: parkingScore,
    maxScore: 100,
    description: config.requiresParking ? 'Parking requirement' : 'Parking not required'
  };
  totalScore += parkingScore;
  maxScore += 100;

  return {
    score: Math.round(totalScore / (maxScore / 100)),
    maxScore: 100,
    breakdown
  };
}

// Helper functions
function calculateEstimatedYield(price: number, bedrooms: number): number {
  // Simplified calculation - in reality would need rental data
  const estimatedRent = bedrooms * 800; // £800 per bedroom per month
  return (estimatedRent * 12 / price) * 100;
}

function getPropertyTypeScore(type: string): number {
  const typeScores: { [key: string]: number } = {
    'house': 90,
    'flat': 70,
    'apartment': 70,
    'bungalow': 80,
    'cottage': 85,
    'mansion': 95
  };
  return typeScores[type.toLowerCase()] || 60;
}


function generateRecommendations(categories: {
  financials: CategoryScore;
  nonNegotiables: CategoryScore;
  customCriteria?: CategoryScore;
  locality?: CategoryScore;
}, customPreferences?: string): string[] {
  const recommendations: string[] = [];
  
  // Generate personalised recommendations based on custom preferences
  if (customPreferences) {
    recommendations.push(`Based on your preferences: "${customPreferences.substring(0, 100)}${customPreferences.length > 100 ? '...' : ''}"`);
    
    // Analyze specific preferences mentioned
    const preferences = customPreferences.toLowerCase();
    
    if (preferences.includes('family') || preferences.includes('children')) {
      if (categories.nonNegotiables.score < 80) {
        recommendations.push('This property may not be ideal for family living - consider the space and layout requirements');
      } else {
        recommendations.push('Good family home potential with adequate space and amenities');
      }
    }
    
    if (preferences.includes('investment') || preferences.includes('rental')) {
      if (categories.financials.score < 70) {
        recommendations.push('Consider the rental yield potential and market trends for investment purposes');
      } else {
        recommendations.push('Strong investment potential with good financial metrics');
      }
    }
    
    if (preferences.includes('transport') || preferences.includes('commute')) {
      if (categories.locality && categories.locality.score < 70) {
        recommendations.push('Transport links may not meet your commuting needs - check local connections');
      } else {
        recommendations.push('Good transport connectivity for daily commuting');
      }
    }
    
    if (preferences.includes('garden') || preferences.includes('outdoor')) {
      if (categories.nonNegotiables.score < 80) {
        recommendations.push('Limited outdoor space - may not meet your garden requirements');
      } else {
        recommendations.push('Excellent outdoor space for your needs');
      }
    }
  }
  
  // Standard recommendations
  if (categories.financials.score < 70) {
    recommendations.push('Consider negotiating the price or looking for properties with better yield potential');
  }
  
  if (categories.nonNegotiables.score < 100) {
    recommendations.push('Some of your non-negotiable requirements are not met - consider if you can compromise');
  }
  
  if (categories.customCriteria && categories.customCriteria.score < 60) {
    recommendations.push('The property doesn\'t fully match your specific criteria - weigh the trade-offs carefully');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('This property meets most of your criteria - it could be a good investment opportunity');
  }
  
  return recommendations;
}

async function computeMarketMetrics(property: ScrapedPropertyData): Promise<MarketMetrics> {
  const listingPricePerSqm = property.size && property.size > 0 ? Math.round(property.price / property.size) : null;

  const area = derivePostcodeArea(property.postcode);
  const [
    avgListedPricePerSqmPostcode,
    avgSoldPricePerSqmPostcode,
    avgAnnualPriceGrowthPct,
    soldPriceChangePct,
    banded
  ] = await Promise.all([
    fetchAvgListedPricePerSqm(area),
    fetchAvgSoldPricePerSqm(area),
    fetchAvgAnnualGrowthPct(area),
    fetchSoldPriceChangePct(area),
    property.size ? fetchBandedAvgSoldPriceLast90d(area, Math.floor(property.size / 15) * 15, Math.floor(property.size / 15) * 15 + 15) : Promise.resolve({ avgSoldPrice: null, sampleSize: null })
  ]);
  const sqm = property.size || null;
  const bandLabel = sqm ? `${Math.floor(sqm / 15) * 15}-${Math.floor(sqm / 15) * 15 + 15} sqm` : 'unknown';
  const bandedAvgSoldPriceLast90d = {
    sqmBand: bandLabel,
    avgSoldPrice: banded.avgSoldPrice,
    sampleSize: banded.sampleSize,
  };

  return {
    listingPricePerSqm,
    avgListedPricePerSqmPostcode,
    avgSoldPricePerSqmPostcode,
    avgAnnualPriceGrowthPct,
    soldPriceChangePct,
    bandedAvgSoldPriceLast90d,
  };
}
