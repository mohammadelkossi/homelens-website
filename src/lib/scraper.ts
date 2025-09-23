import * as cheerio from 'cheerio';

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
  try {
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

    // Extract price - try multiple selectors
    let price = 0;
    const priceSelectors = [
      '.property-header-price',
      '.price',
      '[data-testid="price"]',
      '.property-price',
      '.price-display',
      '.price-value',
      '.property-header-price-value',
      '.price-text'
    ];
    
    for (const selector of priceSelectors) {
      const priceText = $(selector).text();
      if (priceText) {
        const priceMatch = priceText.match(/£?([\d,]+)/);
        if (priceMatch) {
          price = parseFloat(priceMatch[1].replace(/,/g, ''));
          break;
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

    // Extract address
    const address = $('.property-header-address').text() || $('.address').text() || '';

    // Extract postcode (usually at the end of address)
    const postcodeMatch = address.match(/([A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})/i);
    const postcode = postcodeMatch ? postcodeMatch[1] : '';

    // Extract bedrooms
    const bedroomsText = $('.property-header-bedrooms').text() || $('.bedrooms').text();
    const bedrooms = parseInt(bedroomsText.match(/\d+/)?.[0] || '0');

    // Extract bathrooms
    const bathroomsText = $('.property-header-bathrooms').text() || $('.bathrooms').text();
    const bathrooms = parseInt(bathroomsText.match(/\d+/)?.[0] || '0');

    // Extract property type
    const propertyType = $('.property-header-type').text() || $('.property-type').text() || '';

    // Extract size from multiple sources including floor plan
    let size: number | undefined;
    
    // Try to find size in property details
    const sizeSelectors = [
      '.property-header-size',
      '.size',
      '[data-testid="floor-area"]',
      '.floor-area',
      '.property-size'
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

    // If size not found in property details, try to extract from description
    if (!size) {
      const description = $('.property-description').text() || $('.description').text() || '';
      const sizeMatch = description.match(/(\d+(?:,\d+)?)\s*(sq\s*ft|sq\s*m|m²|sqft)/i);
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

    // Extract description
    const description = $('.property-description').text() || $('.description').text() || '';

    // Extract key features bullets if available
    const features: string[] = [];
    $('.key-features li, .property-features li, ul.features li').each((_, li) => {
      const t = $(li).text().trim();
      if (t) features.push(t);
    });

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

    // Extract images
    const images: string[] = [];
    $('.property-images img, .gallery img').each((_, element) => {
      const src = $(element).attr('src') || $(element).attr('data-src');
      if (src && !src.includes('placeholder')) {
        images.push(src.startsWith('http') ? src : `https://www.rightmove.co.uk${src}`);
      }
    });

    // Debug logging
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
      featuresCount: features.length
    });

    return {
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
  } catch (error) {
    console.error('Error scraping property:', error);
    throw new Error('Failed to scrape property data');
  }
}
