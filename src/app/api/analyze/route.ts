import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { scrapeRightmoveProperty } from '@/lib/scraper';
import { analyzeProperty } from '@/lib/analysis';

const AnalyzeRequestSchema = z.object({
  rightmoveUrl: z.string().url('Invalid Rightmove URL'),
  nonNegotiables: z.object({
    minBathrooms: z.number().min(1).max(10).default(2),
    minSize: z.number().min(50).max(1000).default(100),
    requiresGarden: z.boolean().default(true),
    requiresParking: z.boolean().default(false),
  }).optional(),
  customCriteria: z.object({
    garageWeight: z.object({ yes: z.number(), no: z.number() }).optional(),
    locationWeight: z.object({ s10: z.number(), other: z.number() }).optional(),
    toiletsWeight: z.object({ two: z.number(), one: z.number() }).optional(),
    parkingSpacesWeight: z.object({ two: z.number(), one: z.number(), none: z.number() }).optional(),
    gardenWeight: z.object({ yes: z.number(), no: z.number() }).optional(),
    minSpaceWeight: z.object({ above: z.number(), below: z.number() }).optional(),
    timeOnMarketWeight: z.object({ underMonth: z.number(), overMonth: z.number() }).optional(),
    detachedWeight: z.object({ detached: z.number(), semi: z.number(), terraced: z.number() }).optional(),
  }).optional(),
});

export async function GET() {
  return NextResponse.json({ message: 'API is working', timestamp: new Date().toISOString() });
}

export async function POST(request: NextRequest) {
  try {
    console.log('API route called');
    const body = await request.json();
    console.log('Request body received:', body);
    
    const validatedData = AnalyzeRequestSchema.parse(body);
    
    const { rightmoveUrl, nonNegotiables, customCriteria } = validatedData;
    
    console.log('Validated data:', { rightmoveUrl, nonNegotiables, customCriteria });
    
    // Validate Rightmove URL
    if (!rightmoveUrl.includes('rightmove.co.uk')) {
      return NextResponse.json(
        { error: 'Please provide a valid Rightmove URL' },
        { status: 400 }
      );
    }

    console.log('Starting property scraping...');
    // Scrape property data
    const propertyData = await scrapeRightmoveProperty(rightmoveUrl);
    console.log('Property data scraped:', propertyData);
    
    // Set default non-negotiables if not provided
    const config = {
      nonNegotiables: nonNegotiables || {
        minBathrooms: 2,
        minSize: 100,
        requiresGarden: true,
        requiresParking: false,
      },
      customCriteria
    };

    console.log('Starting property analysis...');
    // Analyze the property
    const results = await analyzeProperty(propertyData, config);
    console.log('Analysis completed');
    
    // Add the original URL to the results
    results.propertyData.url = rightmoveUrl;

    return NextResponse.json(results);
  } catch (error) {
    console.error('Analysis error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to analyze property. Please check the URL and try again.', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}