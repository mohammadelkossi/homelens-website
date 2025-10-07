import * as cheerio from 'cheerio';

// Simple in-memory cache for scraped data
const scrapedDataCache = new Map<string, { data: ScrapedPropertyData; timestamp: number }>();
const SCRAPE_CACHE_TTL = 60 * 60 * 1000; // 1 hour cache

// Helper function to generate cache key from URL
function getCacheKey(url: string): string {
  return `scraped_${url.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

// Helper function to check if cache entry is valid
function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < SCRAPE_CACHE_TTL;
}

// Function to clear the scraped data cache
export function clearScrapedDataCache(): void {
  scrapedDataCache.clear();
  console.log('🧹 Scraped data cache cleared');
}

// Validation function to check if scraped data is meaningful
export function isScrapedDataValid(data: ScrapedPropertyData): { isValid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];
  
  // Critical fields that must be present
  if (!data.price || data.price === 0) {
    missingFields.push('price');
  }
  
  if (!data.address || data.address.trim() === '') {
    missingFields.push('address');
  }
  
  if (!data.bedrooms || data.bedrooms === 0) {
    missingFields.push('bedrooms');
  }
  
  if (!data.propertyType || data.propertyType.trim() === '') {
    missingFields.push('propertyType');
  }
  
  // Optional but important fields
  if (!data.bathrooms || data.bathrooms === 0) {
    missingFields.push('bathrooms');
  }
  
  if (!data.description || data.description.trim() === '') {
    missingFields.push('description');
  }
  
  // Consider data valid if we have the critical fields
  const criticalFieldsMissing = missingFields.filter(field => 
    ['price', 'address', 'bedrooms', 'propertyType'].includes(field)
  );
  
  return {
    isValid: criticalFieldsMissing.length === 0,
    missingFields
  };
}

export interface ScrapedPropertyData {
  price: number;
  address: string;
  postcode: string;
  bedrooms: number;
  bathrooms: number;
  propertyType: string;
  size?: number;
  description: string;
  images: string[];
  rawText?: string;
  dateListedIso?: string; // best-effort parse
  features?: string[]; // parsed bullet points
}

export async function scrapeRightmoveProperty(url: string): Promise<ScrapedPropertyData> {
  // Check cache first
  const cacheKey = getCacheKey(url);
  const cached = scrapedDataCache.get(cacheKey);
  
  if (cached && isCacheValid(cached.timestamp)) {
    console.log('📦 Using cached scraped data for:', url);
    return cached.data;
  }

  try {
    console.log('🌐 Scraping fresh data for:', url);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch property data: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract price - look for "Guide Price" first, then fallback to selectors
    let price = 0;
    
    // First try to find "Guide Price" in the page text
    const pageText = $('body').text();
    const guidePriceMatch = pageText.match(/Guide Price[:\s]*£([\d,]+)/i);
    if (guidePriceMatch) {
      price = parseFloat(guidePriceMatch[1].replace(/,/g, ''));
    } else {
      // Look for price ranges and take the lower value (main price)
      const priceRangeMatch = pageText.match(/£([\d,]+)[-\s]*£([\d,]+)/);
      if (priceRangeMatch) {
        price = parseFloat(priceRangeMatch[1].replace(/,/g, '')); // Take the first (lower) price
      } else {
        // Fallback to CSS selectors
        const priceSelectors = [
          '.property-header-price', // Most common current selector
          '[data-testid="price"]',   // Second most common
          '.price',                  // Generic fallback
          '.property-price',         // Alternative
          '.price-display',          // Display variant
          'h1 .price',              // Header price
          '.price-value',           // Value variant
          '.property-header-price-value', // Full header
          '.price-text',            // Text variant
          '[data-testid="property-price"]', // Alternative test id
          '.property-summary-price', // Summary variant
          '.price-display-value',   // Display value
          '.property-details-price', // Details variant
          '.property-overview-price', // Overview variant
          '.main-price',            // Main variant
          '.listing-price'          // Listing variant
        ];
        
        // Optimized price extraction with early returns
        for (const selector of priceSelectors) {
          const priceElement = $(selector).first(); // Use .first() for better performance
          if (priceElement.length) {
            const priceText = priceElement.text().trim();
            if (priceText) {
              const priceMatch = priceText.match(/£?([\d,]+)/);
              if (priceMatch) {
                price = parseFloat(priceMatch[1].replace(/,/g, ''));
                if (price > 0) break; // Early exit on valid price
              }
            }
          }
        }
      }
    }
    
    // If no price found in specific selectors, try looking in JSON-LD structured data
    if (price === 0) {
      const jsonLdScripts = $('script[type="application/ld+json"]');
      jsonLdScripts.each((_, script) => {
        try {
          const jsonData = JSON.parse($(script).html());
          if (jsonData.offers && jsonData.offers.price) {
            price = parseFloat(jsonData.offers.price);
            return false; // Break out of loop
          }
        } catch (e) {
          // Ignore JSON parsing errors
        }
      });
    }
    
    // Try extracting from window.adInfo JSON data (Rightmove specific)
    if (price === 0) {
      const pageText = $('body').text();
      const adInfoMatch = pageText.match(/window\.adInfo\s*=\s*({.*?});/s);
      if (adInfoMatch) {
        try {
          const adInfo = JSON.parse(adInfoMatch[1]);
          if (adInfo.propertyData && adInfo.propertyData.prices && adInfo.propertyData.prices.primaryPrice) {
            const priceText = adInfo.propertyData.prices.primaryPrice.replace(/[£,]/g, '');
            price = parseFloat(priceText);
          }
        } catch (e) {
          // Ignore JSON parsing errors
        }
      }
    }

    // If price not found, try searching in all text content
    if (price === 0) {
      const allText = $('body').text();
      const priceMatches = allText.match(/£([\d,]+)/g);
      if (priceMatches) {
        // Look for the largest price (likely to be the property price)
        let maxPrice = 0;
        for (const match of priceMatches) {
          const value = parseFloat(match.replace(/£|,/g, ''));
          if (value > maxPrice && value < 10000000) { // Reasonable property price range
            maxPrice = value;
          }
        }
        if (maxPrice > 0) {
          price = maxPrice;
        }
      }
    }

    // Extract address - try multiple methods based on current Rightmove structure
    let address = $('.property-header-address').text() || $('.address').text() || '';
    
    // Try additional selectors for current structure
    if (!address) {
      const addressSelectors = [
        '.property-details-address',
        '.property-overview-address',
        '.listing-address',
        '.property-location',
        'h1 .address',
        '.property-title-address'
      ];
      
      for (const selector of addressSelectors) {
        const addrText = $(selector).text();
        if (addrText && addrText.trim()) {
          address = addrText.trim();
          break;
        }
      }
    }
    
    // If no address found, try extracting from title
    if (!address) {
      const title = $('title').text();
      const titleMatch = title.match(/(\d+\s+bedroom\s+\w+.*?for sale in\s+(.+?)(?:,|$))/i);
      if (titleMatch) {
        address = titleMatch[2].trim();
      }
    }
    
    // Try extracting from meta description
    if (!address) {
      const metaDesc = $('meta[name="description"]').attr('content') || '';
      const descMatch = metaDesc.match(/for sale in\s+(.+?)(?:\s*-\s*Rightmove|$)/i);
      if (descMatch) {
        address = descMatch[1].trim();
      }
    }
    
    // Try extracting from h1 heading (common in current structure)
    if (!address) {
      const h1Text = $('h1').text();
      if (h1Text && h1Text.includes(',')) {
        // Extract address from h1 if it contains comma-separated location
        const addressMatch = h1Text.match(/([^,]+(?:,\s*[^,]+)*)/);
        if (addressMatch) {
          address = addressMatch[1].trim();
        }
      }
    }

    // Extract postcode (usually at the end of address)
    const postcodeMatch = address.match(/([A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})/i);
    const postcode = postcodeMatch ? postcodeMatch[1] : '';

    // Extract bedrooms - try multiple methods based on current structure
    let bedrooms = 0;
    const bedroomsText = $('.property-header-bedrooms').text() || $('.bedrooms').text();
    if (bedroomsText) {
      bedrooms = parseInt(bedroomsText.match(/\d+/)?.[0] || '0');
    }
    
    // Try additional selectors for current structure
    if (bedrooms === 0) {
      const bedroomSelectors = [
        '.property-details-bedrooms',
        '.property-overview-bedrooms',
        '.listing-bedrooms',
        '.property-info-bedrooms',
        '[data-testid="bedrooms"]',
        '.bedroom-count'
      ];
      
      for (const selector of bedroomSelectors) {
        const bedText = $(selector).text();
        if (bedText) {
          const bedMatch = bedText.match(/(\d+)/);
          if (bedMatch) {
            bedrooms = parseInt(bedMatch[1]);
            break;
          }
        }
      }
    }
    
    // If no bedrooms found, try extracting from title
    if (bedrooms === 0) {
      const title = $('title').text();
      const bedroomMatch = title.match(/(\d+)\s+bedroom/i);
      if (bedroomMatch) {
        bedrooms = parseInt(bedroomMatch[1]);
      }
    }
    
    // Try extracting from page content using regex
    if (bedrooms === 0) {
      const pageText = $('body').text();
      const bedroomMatch = pageText.match(/(\d+)\s*bedroom/i);
      if (bedroomMatch) {
        bedrooms = parseInt(bedroomMatch[1]);
      }
    }

    // Extract bathrooms - enhanced extraction with specific Rightmove patterns
    let bathrooms = 0;
    
    // Method 1: Try specific Rightmove selectors for current structure
    const bathroomSelectors = [
      '.property-header-bathrooms',
      '.bathrooms',
      '.property-details-bathrooms',
      '.property-overview-bathrooms',
      '.listing-bathrooms',
      '.property-info-bathrooms',
      '[data-testid="bathrooms"]',
      '.bathroom-count',
      '.property-summary-bathrooms',
      '.property-header-bathroom-count'
    ];
    
    for (const selector of bathroomSelectors) {
      const bathText = $(selector).text();
      if (bathText) {
        const bathMatch = bathText.match(/(\d+)/);
        if (bathMatch) {
          bathrooms = parseInt(bathMatch[1]);
          break;
        }
      }
    }
    
    // Method 2: Look for specific Rightmove patterns in the page
    if (bathrooms === 0) {
      const pageText = $('body').text();
      
      // Look for "BATHROOMS" followed by a number (common in Rightmove)
      const bathroomMatch = pageText.match(/BATHROOMS\s*(\d+)/i);
      if (bathroomMatch) {
        bathrooms = parseInt(bathroomMatch[1]);
      }
    }
    
    // Method 3: Look for property summary patterns
    if (bathrooms === 0) {
      const pageText = $('body').text();
      
      // Look for patterns like "3 bedroom, 1 bathroom" or "3 bed, 1 bath"
      const summaryMatch = pageText.match(/(\d+)\s*bed(?:room)?[,\s]*(\d+)\s*bath(?:room)?/i);
      if (summaryMatch) {
        bathrooms = parseInt(summaryMatch[2]);
      }
    }
    
    // Method 4: Look for structured data in property details
    if (bathrooms === 0) {
      // Look for property details section that might contain bathroom info
      const propertyDetails = $('.property-details, .property-summary, .property-overview');
      propertyDetails.each((_, element) => {
        const text = $(element).text();
        const bathMatch = text.match(/bath(?:room)?[:\s]*(\d+)/i);
        if (bathMatch) {
          bathrooms = parseInt(bathMatch[1]);
          return false; // Break out of loop
        }
      });
    }
    
    // Method 5: Try extracting from window.adInfo JSON data (Rightmove specific)
    if (bathrooms === 0) {
      const pageText = $('body').text();
      const adInfoMatch = pageText.match(/window\.adInfo\s*=\s*({.*?});/s);
      if (adInfoMatch) {
        try {
          const adInfo = JSON.parse(adInfoMatch[1]);
          if (adInfo.propertyData && adInfo.propertyData.bathrooms) {
            bathrooms = parseInt(adInfo.propertyData.bathrooms);
          }
        } catch (e) {
          // Ignore JSON parsing errors
        }
      }
    }
    
    // Method 6: Look for bathroom info in key features
    if (bathrooms === 0) {
      const keyFeatures = $('.key-features, .property-features, .features');
      keyFeatures.each((_, element) => {
        const text = $(element).text();
        const bathMatch = text.match(/bath(?:room)?[:\s]*(\d+)/i);
        if (bathMatch) {
          bathrooms = parseInt(bathMatch[1]);
          return false; // Break out of loop
        }
      });
    }

    // Extract property type - try multiple methods based on current structure
    let propertyType = $('.property-header-type').text() || $('.property-type').text() || '';
    
    // Try additional selectors for current structure
    if (!propertyType) {
      const typeSelectors = [
        '.property-details-type',
        '.property-overview-type',
        '.listing-type',
        '.property-info-type',
        '[data-testid="property-type"]',
        '.property-category'
      ];
      
      for (const selector of typeSelectors) {
        const typeText = $(selector).text();
        if (typeText && typeText.trim()) {
          propertyType = typeText.trim();
          break;
        }
      }
    }
    
    // If no property type found, try extracting from title
    if (!propertyType) {
      const title = $('title').text();
      const typeMatch = title.match(/(\d+\s+bedroom\s+(\w+))/i);
      if (typeMatch) {
        propertyType = typeMatch[2];
      }
    }
    
    // Try extracting from page content
    if (!propertyType) {
      const pageText = $('body').text();
      const typeMatch = pageText.match(/(\w+\s+house|\w+\s+flat|\w+\s+apartment|\w+\s+bungalow|\w+\s+cottage)/i);
      if (typeMatch) {
        propertyType = typeMatch[1];
      }
    }

    // Extract size from multiple sources including floor plan - enhanced extraction
    let size: number | undefined;
    
    // Method 1: Try specific Rightmove selectors for size/floor area
    const sizeSelectors = [
      '.property-header-size',
      '.size',
      '[data-testid="floor-area"]',
      '.floor-area',
      '.property-size',
      '.property-details-size',
      '.property-overview-size',
      '.listing-size',
      '.property-info-size',
      '.property-summary-size',
      '.property-header-floor-area'
    ];
    
    for (const selector of sizeSelectors) {
      const sizeText = $(selector).text();
      if (sizeText) {
        const sizeMatch = sizeText.match(/(\d+(?:,\d+)?)\s*(sq\s*ft|sq\s*m|m²|sqft)/i);
        if (sizeMatch) {
          const value = parseFloat(sizeMatch[1].replace(/,/g, ''));
          const unit = sizeMatch[2].toLowerCase();
          if (unit.includes('sq ft') || unit.includes('sqft')) {
            size = Math.round(value * 0.092903); // Convert sq ft to sq m
          } else {
            size = value;
          }
          break;
        }
      }
    }
    
    // Method 2: Look for specific Rightmove patterns in the page
    if (!size) {
      const pageText = $('body').text();
      
      // Look for "SIZE" followed by a number and unit (common in Rightmove)
      const sizeMatch = pageText.match(/SIZE\s*(\d+(?:,\d+)?)\s*(sq\s*ft|sq\s*m|m²|sqft)/i);
      if (sizeMatch) {
        const value = parseFloat(sizeMatch[1].replace(/,/g, ''));
        const unit = sizeMatch[2].toLowerCase();
        if (unit.includes('sq ft') || unit.includes('sqft')) {
          size = Math.round(value * 0.092903); // Convert sq ft to sq m
        } else {
          size = value;
        }
      }
    }
    
    // Method 3: Look for property summary patterns
    if (!size) {
      const pageText = $('body').text();
      
      // Look for patterns like "1,293 sq ft / 120 sq m" (common in Rightmove)
      const summaryMatch = pageText.match(/(\d+(?:,\d+)?)\s*sq\s*ft\s*\/\s*(\d+)\s*sq\s*m/i);
      if (summaryMatch) {
        size = parseInt(summaryMatch[2]); // Use the sq m value
      }
    }
    
    // Try extracting from page content using regex patterns
    if (!size) {
      const pageText = $('body').text();
      // Look for size patterns in the page content
      const sizeMatch = pageText.match(/(\d+(?:,\d+)?)\s*(sq\s*ft|sq\s*m|m²|sqft)/i);
      if (sizeMatch) {
        const value = parseFloat(sizeMatch[1].replace(/,/g, ''));
        const unit = sizeMatch[2].toLowerCase();
        if (unit.includes('sq ft') || unit.includes('sqft')) {
          size = Math.round(value * 0.092903); // Convert sq ft to sq m
        } else {
          size = value;
        }
      }
    }
    
    // Try extracting from description text (will be available later in the function)
    // This will be handled after description is extracted


    // Try to find size in property key features or floor plan data
    if (!size) {
      // Look for size in key features section
      const keyFeatures = $('.key-features, .property-features, .features');
      keyFeatures.each((_, element) => {
        const text = $(element).text();
        const sizeMatch = text.match(/(\d+(?:,\d+)?)\s*(sq\s*ft|sq\s*m|m²|sqft)/i);
        if (sizeMatch) {
          const value = parseFloat(sizeMatch[1].replace(/,/g, ''));
          const unit = sizeMatch[2].toLowerCase();
          if (unit.includes('sq ft') || unit.includes('sqft')) {
            size = Math.round(value * 0.092903); // Convert sq ft to sq m
          } else {
            size = value;
          }
          return false; // Break out of loop
        }
      });
    }

    // Try to find size in property summary or overview
    if (!size) {
      const summarySelectors = [
        '.property-summary',
        '.property-overview', 
        '.summary',
        '.overview',
        '.property-details-summary'
      ];
      
      for (const selector of summarySelectors) {
        const text = $(selector).text();
        const sizeMatch = text.match(/(\d+(?:,\d+)?)\s*(sq\s*ft|sq\s*m|m²|sqft)/i);
        if (sizeMatch) {
          const value = parseFloat(sizeMatch[1].replace(/,/g, ''));
          const unit = sizeMatch[2].toLowerCase();
          if (unit.includes('sq ft') || unit.includes('sqft')) {
            size = Math.round(value * 0.092903); // Convert sq ft to sq m
          } else {
            size = value;
          }
          break;
        }
      }
    }

    // Try to find size in any text content on the page
    if (!size) {
      const allText = $('body').text();
      const sizeMatches = allText.match(/(\d+(?:,\d+)?)\s*(sq\s*ft|sq\s*m|m²|sqft)/gi);
      if (sizeMatches && sizeMatches.length > 0) {
        // Take the first reasonable size match (likely to be the total floor area)
        for (const match of sizeMatches) {
          const sizeMatch = match.match(/(\d+(?:,\d+)?)\s*(sq\s*ft|sq\s*m|m²|sqft)/i);
          if (sizeMatch) {
            const value = parseFloat(sizeMatch[1].replace(/,/g, ''));
            // Only consider reasonable property sizes (between 20 and 2000 sqm)
            if (value >= 20 && value <= 2000) {
              const unit = sizeMatch[2].toLowerCase();
              if (unit.includes('sq ft') || unit.includes('sqft')) {
                size = Math.round(value * 0.092903); // Convert sq ft to sq m
              } else {
                size = value;
              }
              break;
            }
          }
        }
      }
    }

    // Extract description - try multiple methods based on current structure
    let description = $('.property-description').text() || $('.description').text() || '';
    
    // If no description found, try other selectors
    if (!description) {
      const descSelectors = [
        '.property-details-description',
        '.property-summary-description',
        '.property-overview-description',
        '[data-testid="property-description"]',
        '.property-text',
        '.description-text',
        '.property-content',
        '.listing-description',
        '.property-info-description'
      ];
      
      for (const selector of descSelectors) {
        const descText = $(selector).text();
        if (descText && descText.trim()) {
          description = descText.trim();
          break;
        }
      }
    }
    
    // Try extracting from main content area
    if (!description) {
      const mainContent = $('main .description, .main-content .description, .property-main .description').text();
      if (mainContent && mainContent.trim()) {
        description = mainContent.trim();
      }
    }
    
    // If still no description, try extracting from meta description
    if (!description) {
      const metaDesc = $('meta[name="description"]').attr('content') || '';
      if (metaDesc && !metaDesc.includes('Rightmove')) {
        description = metaDesc;
      }
    }
    
    // Try extracting from page content using regex patterns
    if (!description) {
      const pageText = $('body').text();
      // Look for description patterns in the page content
      const descMatch = pageText.match(/A rare opportunity to acquire.*?(?=Please Note|Council Tax|Energy performance|Disclaimer|$)/s);
      if (descMatch) {
        description = descMatch[0].trim();
      }
    }
    
    // Try extracting size from description if not found earlier
    if (!size && description) {
      const descSizeMatch = description.match(/(\d+(?:,\d+)?)\s*(sq\s*ft|sq\s*m|m²|sqft)/i);
      if (descSizeMatch) {
        const value = parseFloat(descSizeMatch[1].replace(/,/g, ''));
        const unit = descSizeMatch[2].toLowerCase();
        if (unit.includes('sq ft') || unit.includes('sqft')) {
          size = Math.round(value * 0.092903); // Convert sq ft to sq m
        } else {
          size = value;
        }
      }
    }

    // Extract key features bullets if available
    const features: string[] = [];
    
    // Try multiple selectors for features
    const featureSelectors = [
      '.key-features li',
      '.property-features li',
      'ul.features li',
      '.property-details-features li',
      '.property-overview-features li',
      '.listing-features li',
      '.property-info-features li',
      '.features-list li',
      '.property-highlights li'
    ];
    
    featureSelectors.forEach(selector => {
      $(selector).each((_, li) => {
        const t = $(li).text().trim();
        if (t && !features.includes(t)) {
          features.push(t);
        }
      });
    });
    
    // If no features found in lists, try extracting from text content
    if (features.length === 0) {
      const pageText = $('body').text();
      const featureMatch = pageText.match(/Key features.*?(?=Description|Please Note|Council Tax|$)/s);
      if (featureMatch) {
        const featureText = featureMatch[0];
        const featureItems = featureText.split(/[•\-\*]/).map(item => item.trim()).filter(item => item.length > 0);
        features.push(...featureItems);
      }
    }

    // Try to parse listing date
    let dateListedIso: string | undefined;
    const dateTextCandidates = [
      $('[data-testid="date-listed"]').text(),
      $('time[datetime]')?.attr('datetime') || '',
      $('time')?.text() || '',
      $('body').text()
    ];
    for (const txt of dateTextCandidates) {
      const match = txt.match(/listed\s*(on\s*)?(\d{1,2}\s*[A-Za-z]{3,9}\s*\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i);
      if (match) {
        const raw = match[2];
        const d = Date.parse(raw);
        if (!Number.isNaN(d)) {
          dateListedIso = new Date(d).toISOString();
          break;
        }
      }
    }

    // Extract images - try multiple selectors
    const images: string[] = [];
    const imageSelectors = [
      '.property-images img',
      '.gallery img',
      '.property-gallery img',
      '.property-photos img',
      '.listing-images img',
      '.property-slider img',
      '.carousel img',
      '.image-gallery img',
      '.photos img',
      '.property-pictures img'
    ];
    
    imageSelectors.forEach(selector => {
      $(selector).each((_, element) => {
        const src = $(element).attr('src') || $(element).attr('data-src') || $(element).attr('data-lazy-src');
        if (src && !src.includes('placeholder') && !src.includes('logo') && !src.includes('icon')) {
          const fullSrc = src.startsWith('http') ? src : `https://www.rightmove.co.uk${src}`;
          if (!images.includes(fullSrc)) {
            images.push(fullSrc);
          }
        }
      });
    });
    
    // Try extracting from background images
    $('[style*="background-image"]').each((_, element) => {
      const style = $(element).attr('style') || '';
      const bgMatch = style.match(/background-image:\s*url\(['"]?([^'"]+)['"]?\)/);
      if (bgMatch) {
        const src = bgMatch[1];
        if (!src.includes('placeholder') && !src.includes('logo')) {
          const fullSrc = src.startsWith('http') ? src : `https://www.rightmove.co.uk${src}`;
          if (!images.includes(fullSrc)) {
            images.push(fullSrc);
          }
        }
      }
    });

    // Debug logging with more detailed information
    console.log('Scraped data:', {
      price,
      address: address.trim(),
      postcode: postcode.trim(),
      bedrooms,
      bathrooms,
      propertyType: propertyType.trim(),
      size,
      description: description.trim().substring(0, 100) + '...',
      imagesCount: images.length,
      dateListedIso,
      featuresCount: features.length,
      url: url,
      title: $('title').text(),
      metaDescription: $('meta[name="description"]').attr('content')
    });
    
    // Log warnings for missing critical data
    if (!address || address.trim() === '') {
      console.warn('⚠️ No address found for property');
    }
    if (price === 0) {
      console.warn('⚠️ No price found for property');
    }
    if (bedrooms === 0) {
      console.warn('⚠️ No bedrooms found for property');
    }
    if (!propertyType || propertyType.trim() === '') {
      console.warn('⚠️ No property type found for property');
    }

    const scrapedData = {
      price,
      address: address.trim(),
      postcode: postcode.trim(),
      bedrooms,
      bathrooms,
      propertyType: propertyType.trim(),
      size,
      description: description.trim(),
      images,
      rawText: $('body').text(),
      dateListedIso,
      features
    };

    // Cache the scraped data
    scrapedDataCache.set(cacheKey, { data: scrapedData, timestamp: Date.now() });
    console.log('💾 Cached scraped data for:', url);
    
    return scrapedData;
  } catch (error) {
    console.error('Error scraping property:', error);
    throw new Error('Failed to scrape property data');
  }
}
