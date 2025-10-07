import { NextRequest, NextResponse } from 'next/server';
import { clearScrapedDataCache } from '@/lib/scraper';
import { clearPlacesCache } from '@/lib/places';

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Clearing all application caches...');
    
    // Clear all in-memory caches
    clearScrapedDataCache();
    clearPlacesCache();
    
    // Clear any other caches here if needed
    
    console.log('✅ All caches cleared successfully');
    
    return NextResponse.json({
      success: true,
      message: 'All caches cleared successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error clearing caches:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to clear caches',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
