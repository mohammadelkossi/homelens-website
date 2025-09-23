export interface PropertyData {
  url: string;
  price: number;
  address: string;
  postcode: string;
  bedrooms: number;
  bathrooms: number;
  propertyType: string;
  size: number; // in square meters
  description: string;
  images: string[];
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface AnalysisResults {
  overallScore: number;
  categories: {
    financials: CategoryScore;
    convenience: CategoryScore;
    fundamentals: CategoryScore;
    nonNegotiables: CategoryScore;
    customCriteria?: CategoryScore;
    locality?: CategoryScore;
  };
  propertyData: PropertyData;
  recommendations: string[];
  marketMetrics?: MarketMetrics;
  localityData?: LocalityData;
}

export interface LocalityData {
  parks: PlaceResult[];
  airports: PlaceResult[];
  schools: PlaceResult[];
  hospitals: PlaceResult[];
  trainStations: PlaceResult[];
  petrolStations: PlaceResult[];
  supermarkets: PlaceResult[];
}

export interface PlaceResult {
  place_id: string;
  name: string;
  vicinity: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  types: string[];
  distance?: number;
}

export interface MarketMetrics {
  listingPricePerSqm?: number | null;
  avgListedPricePerSqmPostcode?: number | null;
  avgSoldPricePerSqmPostcode?: number | null;
  avgAnnualPriceGrowthPct?: number | null;
  soldPriceChangePct?: {
    last1m?: number | null;
    last3m?: number | null;
    last6m?: number | null;
    last12m?: number | null;
  };
  bandedAvgSoldPriceLast90d?: {
    sqmBand: string;
    avgSoldPrice?: number | null;
    sampleSize?: number | null;
  };
}

export interface CategoryScore {
  score: number;
  maxScore: number;
  breakdown: {
    [key: string]: {
      score: number;
      maxScore: number;
      description: string;
    };
  };
}

export interface NonNegotiable {
  id: string;
  name: string;
  required: boolean;
  met: boolean;
  description: string;
}
