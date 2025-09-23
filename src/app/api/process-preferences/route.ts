import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { scrapeRightmoveProperty } from '@/lib/scraper';
import { analyzeProperty } from '@/lib/analysis';

const ProcessPreferencesSchema = z.object({
  rightmoveUrl: z.string().url('Invalid Rightmove URL'),
  preferences: z.string().min(1, 'Preferences cannot be empty').optional(),
  criteria: z.object({
    garden: z.number().min(0).max(10),
    garage: z.number().min(0).max(10),
    parkingSpaces: z.number().min(0).max(10),
    location: z.number().min(0).max(10),
    toilets: z.number().min(0).max(10),
    timeOnMarket: z.number().min(0).max(10)
  }).optional(),
  locationPostcode: z.string().optional(),
  toiletsCount: z.number().min(1).max(5).optional(),
  timeOnMarketWeeks: z.number().min(1).max(52).optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = ProcessPreferencesSchema.parse(body);
    
    const { rightmoveUrl, preferences, criteria, locationPostcode, toiletsCount, timeOnMarketWeeks } = validatedData;
    
    // Scrape the property data
    const scrapedData = await scrapeRightmoveProperty(rightmoveUrl);
    
    // Analyze the property with custom preferences and criteria
    const analysisResults = await analyzeProperty(scrapedData, {
      customPreferences: preferences,
      criteriaWeights: criteria,
      locationPostcode,
      toiletsCount,
      timeOnMarketWeeks,
      nonNegotiables: {
        minBathrooms: toiletsCount || 2,
        minSize: 100,
        requiresGarden: true,
        requiresParking: false,
      }
    });
    
    return NextResponse.json(analysisResults);
  } catch (error) {
    console.error('Process preferences error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process preferences' },
      { status: 500 }
    );
  }
}
