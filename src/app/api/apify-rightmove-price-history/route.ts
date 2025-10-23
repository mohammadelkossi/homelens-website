import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ 
        ok: false, 
        error: 'URL is required' 
      }, { status: 400 });
    }

    // Check if API token is configured
    const apiToken = process.env.APIFY_API_TOKEN;
    if (!apiToken) {
      console.error('❌ APIFY_API_TOKEN not configured');
      return NextResponse.json({
        ok: false,
        error: 'Apify API token not configured. Please set APIFY_API_TOKEN environment variable.'
      }, { status: 500 });
    }

    console.log('🔍 Apify Rightmove scraper called for:', url);
    console.log('🔍 API token configured:', apiToken ? 'Yes' : 'No');

    // Try both cleaned and original URL formats
    const cleanUrl = url.split('#')[0].split('?')[0];
    console.log('🔍 Original URL:', url);
    console.log('🔍 Cleaned URL:', cleanUrl);
    
    // Use the original URL first, as Apify might need the full URL
    const urlToUse = url;

    // Comprehensive Apify configuration - everything except estate agent
    const apifyConfig = {
      actorId: 'dhrumil/rightmove-scraper',
      input: {
        addEmptyTrackerRecord: false,
        deduplicateAtTaskLevel: false,
        enableDelistingTracker: false,
        fullPropertyDetails: true, // Get all property details
        includeNearestSchools: false,
        includePriceHistory: true, // We need this
        monitoringMode: false,
        propertyUrls: [
          {
            url: urlToUse
          }
        ],
        proxy: {
          useApifyProxy: true
        },
        maxProperties: 1
      }
    };

    console.log('🔍 Using dhrumil/rightmove-scraper with config:', JSON.stringify(apifyConfig, null, 2));

    // Make request to Apify API
    const apifyResponse = await fetch('https://api.apify.com/v2/acts/dhrumil~rightmove-scraper/runs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(apifyConfig)
    });

    if (!apifyResponse.ok) {
      const errorText = await apifyResponse.text();
      console.error('❌ Apify API error:', apifyResponse.status, errorText);
      
      if (apifyResponse.status === 401) {
        return NextResponse.json({
          ok: false,
          error: 'Apify authentication failed. Please check your API token.'
        }, { status: 401 });
      }
      
      throw new Error(`Apify API error: ${apifyResponse.status} - ${errorText}`);
    }

    const runData = await apifyResponse.json();
    const runId = runData.data.id;

    console.log('🔍 Apify run started with ID:', runId);
    console.log('🔍 Apify run data:', runData);

    // Wait for the run to complete (with timeout) - increase wait time
    const maxWaitTime = 120000; // 2 minutes - Apify can be slow
    const checkInterval = 3000; // 3 seconds - check less frequently
    let elapsedTime = 0;

    while (elapsedTime < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      elapsedTime += checkInterval;

      const statusResponse = await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.APIFY_API_TOKEN}`
        }
      });

      if (!statusResponse.ok) {
        throw new Error(`Apify status check failed: ${statusResponse.status}`);
      }

      const statusData = await statusResponse.json();
      const status = statusData.data.status;

      console.log('🔍 Apify run status:', status);
      console.log('🔍 Status data:', statusData);

      if (status === 'SUCCEEDED') {
        // Get the results
        const resultsResponse = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items`, {
          headers: {
            'Authorization': `Bearer ${process.env.APIFY_API_TOKEN}`
          }
        });

        if (!resultsResponse.ok) {
          throw new Error(`Apify results fetch failed: ${resultsResponse.status}`);
        }

        const results = await resultsResponse.json();
        console.log('🔍 Apify results:', results);
        console.log('🔍 Apify results length:', results.length);
        console.log('🔍 Apify results type:', typeof results);
        
        if (results.length === 0) {
          console.log('🔍 Apify returned empty results - returning debug info instead of fallback');
          
          return NextResponse.json({
            ok: false,
            error: 'Apify returned empty results',
            debug: {
              resultsType: typeof results,
              resultsLength: results.length,
              results: results,
              runId: runId,
              config: apifyConfig,
              urlUsed: urlToUse
            }
          });
        }

        console.log('🔍 Apify returned results! Analyzing data structure...');
        console.log('🔍 Results count:', results.length);
        console.log('🔍 First result keys:', results[0] ? Object.keys(results[0]) : 'No first result');
        console.log('🔍 Full results object:', JSON.stringify(results, null, 2));

        const propertyData = results[0];
        
        // Extract price history from the dhrumil/rightmove-scraper data
        const priceHistory = [];
        
        // Check multiple possible field names for price history
        const possibleFields = [
          'priceHistory',
          'historicalPrices', 
          'saleHistory',
          'priceChanges',
          'listingHistory',
          'propertyHistory',
          'priceHistoryData',
          'soldPrices',
          'historicalSales',
          'previousSales',
          'marketHistory'
        ];
        
        console.log('🔍 Available fields in propertyData:', Object.keys(propertyData));
        
        for (const field of possibleFields) {
          if (propertyData[field] && Array.isArray(propertyData[field])) {
            priceHistory.push(...propertyData[field]);
            console.log(`🔍 Found price history in field: ${field}`, propertyData[field]);
          }
        }
        
        // Check nested structures
        const nestedPaths = [
          'details.priceHistory',
          'data.priceHistory',
          'property.priceHistory',
          'listing.priceHistory',
          'details.historicalSales',
          'data.saleHistory'
        ];
        
        for (const path of nestedPaths) {
          const parts = path.split('.');
          let current = propertyData;
          for (const part of parts) {
            if (current && current[part]) {
              current = current[part];
            } else {
              current = null;
              break;
            }
          }
          
          if (current && Array.isArray(current)) {
            priceHistory.push(...current);
            console.log(`🔍 Found price history in nested path: ${path}`, current);
          }
        }

        // If no price history found, return the full property data for debugging
        if (priceHistory.length === 0) {
          return NextResponse.json({
            ok: false,
            error: 'No price history found in Apify data',
            debug: {
              availableFields: Object.keys(propertyData),
              propertyData: propertyData
            }
          });
        }

        // Clean and format the price history
        const formattedHistory = priceHistory.map((item, index) => ({
          date: item.date || item.year || `Unknown ${index}`,
          price: item.price || item.value || item.amount || 'Unknown',
          event: item.event || item.type || 'Sale'
        }));

        return NextResponse.json({
          ok: true,
          priceHistory: formattedHistory,
          source: 'apify',
          propertyData: {
            address: propertyData.address,
            price: propertyData.price,
            bedrooms: propertyData.bedrooms,
            bathrooms: propertyData.bathrooms,
            propertyType: propertyData.propertyType
          }
        });

      } else if (status === 'FAILED' || status === 'ABORTED') {
        throw new Error(`Apify run failed with status: ${status}`);
      }
      
      // Continue waiting if status is RUNNING or READY
    }

    throw new Error('Apify run timed out');

  } catch (error) {
    console.error('Apify Rightmove scraper error:', error);
    
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      fallback: 'Could not scrape property data'
    }, { status: 500 });
  }
}
