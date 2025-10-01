import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { scrapeTimeOnMarket } from '@/scrapeTimeOnMarket';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rightmoveUrl } = body;

    console.log('🔍 SCRAPING RIGHTMOVE - URL:', rightmoveUrl);

    if (!rightmoveUrl) {
      return NextResponse.json({
        success: false,
        error: 'Rightmove URL is required'
      });
    }

    // Fetch the Rightmove page
    const response = await axios.get(rightmoveUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    // Extract basic property information using multiple selectors for robustness
    const rawData = {
      // Price - try multiple selectors
      price: $('.property-header-price').text().trim() || 
             $('[data-testid="price"]').text().trim() ||
             $('.price').first().text().trim() ||
             $('.property-price').text().trim() ||
             $('[class*="price"]').first().text().trim() ||
             $('span:contains("£")').first().text().trim(),
      
      // Address - try multiple selectors
      address: $('.property-header-address').text().trim() ||
               $('[data-testid="address"]').text().trim() ||
               $('h1').first().text().trim() ||
               $('.property-title').text().trim() ||
               $('[class*="address"]').first().text().trim(),
      
      // Property details from key features
      bedrooms: $('.key-features .bed').text().trim() ||
                $('[data-testid="bedrooms"]').text().trim() ||
                $('.bedrooms').text().trim() ||
                $('[class*="bed"]').first().text().trim() ||
                $('span:contains("bed")').first().text().trim(),
      
      bathrooms: $('.key-features .bathroom').text().trim() ||
                 $('[data-testid="bathrooms"]').text().trim() ||
                 $('.bathrooms').text().trim() ||
                 $('[class*="bath"]').first().text().trim() ||
                 $('span:contains("bath")').first().text().trim(),
      
      // Property type
      propertyType: $('.key-features .property-type').text().trim() ||
                    $('[data-testid="property-type"]').text().trim() ||
                    $('[class*="type"]').first().text().trim(),
      
      // Size (from floor plan or description) - try multiple selectors
      size: $('.floorplan .size').text().trim() ||
            $('[data-testid="floor-area"]').text().trim() ||
            $('[class*="area"]').text().trim() ||
            $('span:contains("sq")').first().text().trim() ||
            $('.key-features').find('span:contains("sq")').text().trim() ||
            $('.property-features').find('span:contains("sq")').text().trim() ||
            $('*:contains("sq ft")').first().text().trim() ||
            $('*:contains("sq m")').first().text().trim() ||
            $('*:contains("square feet")').first().text().trim() ||
            $('*:contains("square metres")').first().text().trim(),
      
      // Description
      description: $('.property-description').text().trim() ||
                   $('[data-testid="description"]').text().trim() ||
                   $('.description').text().trim() ||
                   $('[class*="description"]').text().trim(),
      
      // Sale history
      saleHistoryText: $('.property-history').text().trim() ||
                       $('[data-testid="sale-history"]').text().trim() ||
                       $('.history').text().trim() ||
                       $('[class*="history"]').text().trim(),
      
      // Date listed - try multiple selectors
      dateListed: $('[data-testid="date-listed"]').text().trim() ||
                  $('.date-listed').text().trim() ||
                  $('*:contains("Added on")').text().trim() ||
                  $('*:contains("Listed on")').text().trim() ||
                  $('[class*="date"]').first().text().trim() ||
                  $('time').text().trim() ||
                  $('[datetime]').text().trim(),
      
      // Get all text content for AI to analyze
      allText: $('body').text().replace(/\s+/g, ' ').trim()
    };

    // Parse price
    let currentPrice = null;
    if (rawData.price) {
      const priceMatch = rawData.price.match(/£([\d,]+)/);
      if (priceMatch) {
        currentPrice = parseInt(priceMatch[1].replace(/,/g, ''));
      }
    }

    // Parse bedrooms
    let bedrooms = null;
    if (rawData.bedrooms) {
      const bedroomMatch = rawData.bedrooms.match(/(\d+)/);
      if (bedroomMatch) {
        bedrooms = parseInt(bedroomMatch[1]);
      }
    }

    // Parse bathrooms
    let bathrooms = null;
    if (rawData.bathrooms) {
      const bathroomMatch = rawData.bathrooms.match(/(\d+)/);
      if (bathroomMatch) {
        bathrooms = parseInt(bathroomMatch[1]);
      }
    }

    // Parse size
    let size = null;
    if (rawData.size) {
      const sizeMatch = rawData.size.match(/([\d,]+)/);
      if (sizeMatch) {
        size = parseInt(sizeMatch[1].replace(/,/g, ''));
      }
    }

    // Extract sale history (this is more complex and would need more sophisticated parsing)
    const saleHistory = [];
    if (rawData.saleHistoryText) {
      // Basic parsing - in reality this would need more sophisticated regex
      const historyLines = rawData.saleHistoryText.split('\n');
      historyLines.forEach(line => {
        const priceMatch = line.match(/£([\d,]+)/);
        const dateMatch = line.match(/(\d{4})/);
        if (priceMatch && dateMatch) {
          saleHistory.push({
            date: dateMatch[1],
            price: parseInt(priceMatch[1].replace(/,/g, '')),
            type: 'sale'
          });
        }
      });
    }

    // Calculate average annual growth
    let avgAnnualGrowth = null;
    let yearsOfData = 0;
    
    if (saleHistory.length > 0 && currentPrice) {
      const oldestSale = saleHistory[saleHistory.length - 1];
      const years = new Date().getFullYear() - parseInt(oldestSale.date);
      if (years > 0) {
        const totalGrowth = (currentPrice - oldestSale.price) / oldestSale.price;
        avgAnnualGrowth = (Math.pow(1 + totalGrowth, 1/years) - 1) * 100;
        yearsOfData = years;
      }
    }

    // Use the new scrapeTimeOnMarket utility for accurate date extraction
    let dateListedIso = null;
    let daysOnMarket = null;
    
    try {
      console.log('🕐 Using scrapeTimeOnMarket utility...');
      const timeOnMarketData = await scrapeTimeOnMarket(rightmoveUrl);
      
      if (timeOnMarketData.portal_added_on) {
        dateListedIso = timeOnMarketData.portal_added_on + 'T00:00:00.000Z';
        daysOnMarket = timeOnMarketData.time_on_market_days;
        
        console.log('✅ Time on market extracted:', {
          source: timeOnMarketData.source,
          dateListed: timeOnMarketData.portal_added_on,
          daysOnMarket: daysOnMarket,
          snippet: timeOnMarketData.raw_snippet
        });
      } else {
        console.log('⚠️ No date found by scrapeTimeOnMarket utility');
      }
    } catch (error) {
      console.error('❌ scrapeTimeOnMarket utility failed:', error);
      // Continue without date - don't fail the entire scrape
    }

    const result = {
      // Basic property info
      address: rawData.address,
      currentPrice: currentPrice,
      bedrooms: bedrooms,
      bathrooms: bathrooms,
      propertyType: rawData.propertyType,
      size: size,
      description: rawData.description,
      
      // Date information (from scrapeTimeOnMarket utility)
      dateListedIso: dateListedIso,
      daysOnMarket: daysOnMarket,
      
      // Sale history
      saleHistory: saleHistory,
      avgAnnualGrowth: avgAnnualGrowth,
      yearsOfData: yearsOfData,
      hasHistory: saleHistory.length > 0,
      analysis: avgAnnualGrowth ? 
        `Property has grown from £${saleHistory[saleHistory.length - 1].price.toLocaleString()} to £${currentPrice.toLocaleString()} over ${yearsOfData} years, averaging ${avgAnnualGrowth.toFixed(1)}% annual growth` :
        "No sale history data available on this listing",
      
      // Raw data for OpenAI to process
      rawScrapedData: rawData
    };

    console.log('📊 SCRAPED DATA:', {
      ...result,
      rawScrapedData: {
        ...result.rawScrapedData,
        allText: result.rawScrapedData.allText.substring(0, 200) + '...'
      }
    });

    return NextResponse.json({
      success: true,
      propertyData: result
    });

  } catch (error) {
    console.error('Scraping error:', error);
    
    // Return fallback data if scraping fails
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      propertyData: {
        address: null,
        currentPrice: null,
        bedrooms: null,
        bathrooms: null,
        propertyType: null,
        size: null,
        description: null,
        saleHistory: [],
        avgAnnualGrowth: null,
        yearsOfData: 0,
        hasHistory: false,
        analysis: "Failed to scrape property data"
      }
    });
  }
}
