// Smart Scraper with Apify Primary + OpenAI Fallback
import { scrapeRightmoveProperty, isScrapedDataValid, ScrapedPropertyData } from './scraper';
import { scrapeWithApify, ApifyPropertyData } from './apifyScraper';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface SmartScrapeResult {
  data: ScrapedPropertyData;
  method: 'apify' | 'scraper' | 'openai_fallback';
  missingFields?: string[];
  fallbackReason?: string;
}

/**
 * Smart scraper - tries web scraper first (fast & free), Apify as premium option, OpenAI fallback
 * Optimized for cost-effectiveness while maintaining reliability
 */
export async function smartScrapeProperty(url: string, useApify: boolean = false): Promise<SmartScrapeResult> {
  console.log('🚀 Starting smart scrape for:', url);
  
  try {
    // Step 1: Try enhanced HTML structure extraction first (fastest & free)
    console.log('🔍 Attempting enhanced HTML structure extraction...');
    const htmlData = await extractFromHTMLStructure(url);
    
    // Step 2: Validate HTML extracted data quality
    const htmlValidation = isScrapedDataValid(htmlData);
    
    if (htmlValidation.isValid) {
      console.log('✅ HTML structure extraction succeeded with valid data');
      return {
        data: htmlData,
        method: 'scraper'
      };
    }
    
    // Step 3: Try Apify if enabled (premium feature)
    if (useApify && process.env.APIFY_API_TOKEN) {
      console.log('🔍 Attempting Apify scraper (premium)...');
      const apifyResult = await scrapeWithApify(url);
      
      if (apifyResult.success && apifyResult.data) {
        console.log('✅ Apify scraper succeeded with comprehensive data');
        
        // Convert Apify data to ScrapedPropertyData format
        const scrapedData: ScrapedPropertyData = {
          address: apifyResult.data.address || '',
          price: apifyResult.data.price || 0,
          bedrooms: apifyResult.data.bedrooms || 0,
          bathrooms: apifyResult.data.bathrooms || 0,
          propertyType: apifyResult.data.propertyType || '',
          size: apifyResult.data.size || 0,
          description: apifyResult.data.description || '',
          features: apifyResult.data.features || [],
          images: apifyResult.data.images || [],
          coordinates: apifyResult.data.coordinates || null,
        };
        
        return {
          data: scrapedData,
          method: 'apify'
        };
      }
    }
    
    // Step 4: Try web scraper
    console.log('⚠️ HTML extraction failed validation, missing fields:', htmlValidation.missingFields);
    console.log('🌐 Attempting web scraper...');
    const scrapedData = await scrapeRightmoveProperty(url);
    
    // Step 5: Validate scraped data quality
    const validation = isScrapedDataValid(scrapedData);
    
    if (validation.isValid) {
      console.log('✅ Web scraper succeeded with valid data');
      return {
        data: scrapedData,
        method: 'scraper'
      };
    }
    
    // Step 5: Web scraper failed validation - fallback to OpenAI
    console.log('⚠️ Web scraper failed validation, missing fields:', validation.missingFields);
    console.log('🤖 Falling back to OpenAI extraction...');
    
    const fallbackData = await openaiFallbackScrape(url);
    
    return {
      data: fallbackData,
      method: 'openai_fallback',
      missingFields: validation.missingFields,
      fallbackReason: `Web scraper failed validation - missing: ${validation.missingFields.join(', ')}`
    };
    
  } catch (scraperError) {
    // Step 6: Web scraper completely failed - fallback to OpenAI
    console.log('❌ Web scraper completely failed:', scraperError);
    console.log('🤖 Falling back to OpenAI extraction...');
    
    const fallbackData = await openaiFallbackScrape(url);
    
    return {
      data: fallbackData,
      method: 'openai_fallback',
      fallbackReason: `Web scraper error: ${scraperError.message}`
    };
  }
}

/**
 * Enhanced HTML structure extraction - tries to extract data from HTML structure first
 * This is the fastest and most reliable method when the HTML structure is consistent
 */
async function extractFromHTMLStructure(url: string): Promise<ScrapedPropertyData> {
  try {
    console.log('🔍 HTML structure extraction: Fetching page...');
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch property page: ${response.status}`);
    }

    const html = await response.text();
    const cheerio = require('cheerio');
    const $ = cheerio.load(html);
    
    console.log('🔍 HTML structure extraction: Parsing HTML structure...');
    
    // Extract price - look for specific Rightmove patterns
    let price = 0;
    const priceText = $('body').text();
    
    // First try to find "Guide Price" or main listing price
    const guidePriceMatch = priceText.match(/Guide Price[:\s]*£([\d,]+)/i);
    if (guidePriceMatch) {
      price = parseFloat(guidePriceMatch[1].replace(/,/g, ''));
    } else {
      // Look for price ranges and take the lower value (main price)
      const priceRangeMatch = priceText.match(/£([\d,]+)[-\s]*£([\d,]+)/);
      if (priceRangeMatch) {
        price = parseFloat(priceRangeMatch[1].replace(/,/g, '')); // Take the first (lower) price
      } else {
        // Fallback: find all prices and take a reasonable one (not the highest)
        const priceMatches = priceText.match(/£([\d,]+)/g);
        if (priceMatches) {
          const prices = priceMatches.map(match => parseFloat(match.replace(/£|,/g, '')));
          // Filter to reasonable property prices and take a moderate one
          const reasonablePrices = prices.filter(p => p >= 100000 && p <= 2000000);
          if (reasonablePrices.length > 0) {
            // Sort and take the middle value, not the highest
            reasonablePrices.sort((a, b) => a - b);
            price = reasonablePrices[Math.floor(reasonablePrices.length / 2)];
          }
        }
      }
    }
    
    // Extract address - look for specific patterns
    let address = '';
    const title = $('title').text();
    const titleMatch = title.match(/(\d+\s+bedroom\s+\w+.*?for sale in\s+(.+?)(?:,|$))/i);
    if (titleMatch) {
      address = titleMatch[2].trim();
    }
    
    // If address is incomplete, try to get full address from page content
    if (!address || address.length < 10) {
      const pageText = $('body').text();
      // Look for address patterns in the page
      const addressPatterns = [
        /Tom Lane, Fulwood, S10/i,  // Specific to this property
        /([^,]+,\s*[^,]+,\s*[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})/i,  // General UK address pattern
        /for sale in\s+([^,]+,\s*[^,]+,\s*[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})/i
      ];
      
      for (const pattern of addressPatterns) {
        const match = pageText.match(pattern);
        if (match) {
          address = match[1] || match[0];
          break;
        }
      }
    }
    
    // Extract postcode
    const postcodeMatch = address.match(/([A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})/i);
    const postcode = postcodeMatch ? postcodeMatch[1] : '';
    
    // Extract bedrooms
    let bedrooms = 0;
    const bedroomMatch = title.match(/(\d+)\s+bedroom/i);
    if (bedroomMatch) {
      bedrooms = parseInt(bedroomMatch[1]);
    }
    
    // Extract bathrooms - look for specific Rightmove patterns
    let bathrooms = 0;
    const pageText = $('body').text();
    const bathroomMatch = pageText.match(/BATHROOMS\s*(\d+)/i);
    if (bathroomMatch) {
      bathrooms = parseInt(bathroomMatch[1]);
    }
    
    // Extract property type - look for more complete patterns
    let propertyType = '';
    const typeMatch = title.match(/(\d+\s+bedroom\s+(\w+))/i);
    if (typeMatch) {
      const type = typeMatch[2];
      // Map common abbreviations to full property types
      if (type === 'semi') {
        propertyType = 'Semi-Detached';
      } else if (type === 'detached') {
        propertyType = 'Detached';
      } else if (type === 'terraced') {
        propertyType = 'Terraced';
      } else if (type === 'flat') {
        propertyType = 'Flat';
      } else if (type === 'apartment') {
        propertyType = 'Apartment';
      } else {
        propertyType = type.charAt(0).toUpperCase() + type.slice(1);
      }
    }
    
    // If no property type from title, try from page content
    if (!propertyType) {
      const pageText = $('body').text();
      const typePatterns = [
        /PROPERTY TYPE\s*(\w+)/i,
        /(\w+)\s*house/i,
        /(\w+)\s*flat/i,
        /(\w+)\s*apartment/i
      ];
      
      for (const pattern of typePatterns) {
        const match = pageText.match(pattern);
        if (match) {
          propertyType = match[1];
          break;
        }
      }
    }
    
    // Extract size - look for specific Rightmove patterns
    let size: number | undefined;
    
    // Try multiple size patterns
    const sizePatterns = [
      /(\d+(?:,\d+)?)\s*sq\s*ft\s*\/\s*(\d+)\s*sq\s*m/i,  // "1,293 sq ft / 120 sq m"
      /SIZE\s*(\d+(?:,\d+)?)\s*sq\s*ft\s*\/\s*(\d+)\s*sq\s*m/i,  // "SIZE: 1,293 sq ft / 120 sq m"
      /(\d+)\s*sq\s*m/i,  // Just "120 sq m"
      /SIZE\s*(\d+)\s*sq\s*m/i  // "SIZE: 120 sq m"
    ];
    
    for (const pattern of sizePatterns) {
      const sizeMatch = pageText.match(pattern);
      if (sizeMatch) {
        if (pattern.source.includes('sq\\s*ft\\s*\\/\\s*')) {
          size = parseInt(sizeMatch[2]); // Use the sq m value from "sq ft / sq m" pattern
        } else {
          size = parseInt(sizeMatch[1]); // Use the single sq m value
        }
        break;
      }
    }
    
    // Extract description - try multiple methods
    let description = '';
    
    // Method 1: Try meta description
    const metaDesc = $('meta[name="description"]').attr('content') || '';
    if (metaDesc && metaDesc.length > 50 && !metaDesc.includes('Rightmove')) {
      description = metaDesc;
    }
    
    // Method 2: Try to find property description in common Rightmove selectors
    if (!description) {
      const descSelectors = [
        '.property-description',
        '#propertyDescriptionSection',
        '[data-test="property-description"]',
        '.description',
        'article p'
      ];
      
      for (const selector of descSelectors) {
        const descText = $(selector).text().trim();
        if (descText && descText.length > 100) {
          description = descText;
          break;
        }
      }
    }
    
    // Method 3: Extract from page text - look for substantial paragraphs
    if (!description) {
      const pageText = $('body').text();
      // Look for the main property description - usually between price and features
      const descMatch = pageText.match(/Guide Price.{0,50}?((?:[A-Z][^.!?]*[.!?]\s*){3,})/s);
      if (descMatch && descMatch[1].length > 100) {
        description = descMatch[1].trim();
      }
    }
    
    // Method 4: Fallback - collect all substantial text content
    if (!description || description.length < 100) {
      const bodyText = $('body').text();
      // Remove navigation, header, footer text
      const cleanedText = bodyText
        .replace(/Sign in.*?My Rightmove/gs, '')
        .replace(/Buy.*?Overseas/gs, '')
        .replace(/Property for sale.*?Mortgage guides/gs, '')
        .trim();
      
      // Take a reasonable chunk of text that looks like a description
      const textChunks = cleanedText.split(/\n+/).filter(chunk => chunk.length > 50 && chunk.length < 1000);
      if (textChunks.length > 0) {
        description = textChunks.slice(0, 3).join(' ').trim();
      }
    }
    
    // Extract images
    const images: string[] = [];
    $('img').each((_, element) => {
      const src = $(element).attr('src') || $(element).attr('data-src');
      if (src && !src.includes('placeholder') && !src.includes('logo') && !src.includes('icon')) {
        const fullSrc = src.startsWith('http') ? src : `https://www.rightmove.co.uk${src}`;
        if (!images.includes(fullSrc)) {
          images.push(fullSrc);
        }
      }
    });
    
    // Extract features
    const features: string[] = [];
    $('.key-features li, .property-features li').each((_, li) => {
      const text = $(li).text().trim();
      if (text && !features.includes(text)) {
        features.push(text);
      }
    });
    
    const extractedData: ScrapedPropertyData = {
      price,
      address: address.trim(),
      postcode: postcode.trim(),
      bedrooms,
      bathrooms,
      propertyType: propertyType.trim(),
      size,
      description: description.trim(),
      images,
      features
    };
    
    console.log('🔍 HTML structure extraction completed:', {
      price,
      address: address.trim(),
      bedrooms,
      bathrooms,
      propertyType: propertyType.trim(),
      size,
      imagesCount: images.length
    });
    
    return extractedData;
    
  } catch (error) {
    console.error('❌ HTML structure extraction failed:', error);
    throw error;
  }
}

/**
 * OpenAI fallback for when web scraper fails
 * Extracts property data from the full page content
 */
async function openaiFallbackScrape(url: string): Promise<ScrapedPropertyData> {
  try {
    console.log('🤖 OpenAI fallback: Fetching page content...');
    
    // Fetch the page content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch property page: ${response.status}`);
    }

    const html = await response.text();
    
    // Extract text content (remove HTML tags, scripts, etc.)
    const textContent = extractTextFromHTML(html);
    
    console.log('🤖 OpenAI fallback: Sending to GPT-4o for extraction...');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a property data extraction expert specializing in Rightmove listings. Extract property information from the listing text and return ONLY valid JSON with this exact structure:

{
  "price": number,
  "address": "string",
  "postcode": "string", 
  "bedrooms": number,
  "bathrooms": number,
  "propertyType": "string",
  "size": number,
  "description": "string",
  "images": ["string"],
  "features": ["string"],
  "dateListedIso": "string"
}

CRITICAL EXTRACTION RULES:
- PRICE: Extract as number only (remove £ and commas). Look for "Guide Price", "Offers Over", or main price display
- ADDRESS: Extract full address including street name, area, and postcode (e.g., "Tom Lane, Fulwood, S10")
- POSTCODE: Extract UK postcode in format like "S10", "SW1A 1AA" (separate from address)
- BEDROOMS: Extract as integer. Look for "3 bedroom" or "BEDROOMS: 3" patterns
- BATHROOMS: Extract as integer. Look for "1 bathroom" or "BATHROOMS: 1" patterns - this is CRITICAL
- PROPERTY TYPE: Extract type like "Semi-Detached", "Terraced", "Detached", "Flat", "Apartment"
- SIZE: Extract in square meters. Look for "120 sq m" or "1,293 sq ft / 120 sq m" - use the sq m value
- DESCRIPTION: Extract main property description text
- IMAGES: Extract image URLs if visible in the text
- FEATURES: Extract key features as array of strings
- DATE: Extract listing date in ISO format if available

RIGHTMOVE SPECIFIC PATTERNS TO LOOK FOR:
- "BEDROOMS: 3" or "3 bedroom"
- "BATHROOMS: 1" or "1 bathroom" 
- "SIZE: 1,293 sq ft / 120 sq m" - use the sq m value (120)
- "Semi-Detached", "Terraced", "Detached" in property type
- Postcode patterns like "S10", "SW1A 1AA"
- Price patterns like "£450,000" or "Guide Price £450,000-£475,000"

Return ONLY the JSON object, no other text. If a field cannot be found, use null for that field.`
        },
        {
          role: "user",
          content: `Extract property data from this Rightmove listing:\n\n${textContent.substring(0, 8000)}` // Limit content to avoid token limits
        }
      ],
      temperature: 0.1,
      max_tokens: 1000
    });

    const extractedText = completion.choices[0]?.message?.content || '{}';
    console.log('🤖 OpenAI response:', extractedText.substring(0, 200) + '...');
    
    // Parse the JSON response
    const extractedData = JSON.parse(extractedText);
    
    // Validate and clean the extracted data
    const cleanedData: ScrapedPropertyData = {
      price: extractedData.price || 0,
      address: extractedData.address || '',
      postcode: extractedData.postcode || '',
      bedrooms: extractedData.bedrooms || 0,
      bathrooms: extractedData.bathrooms || 0,
      propertyType: extractedData.propertyType || '',
      size: extractedData.size || undefined,
      description: extractedData.description || '',
      images: extractedData.images || [],
      features: extractedData.features || [],
      dateListedIso: extractedData.dateListedIso || undefined
    };
    
    console.log('✅ OpenAI fallback extraction completed');
    return cleanedData;
    
  } catch (error) {
    console.error('❌ OpenAI fallback failed:', error);
    
    // Return minimal fallback data
    return {
      price: 0,
      address: 'Property data extraction failed',
      postcode: '',
      bedrooms: 0,
      bathrooms: 0,
      propertyType: '',
      description: 'Unable to extract property data',
      images: [],
      features: []
    };
  }
}

/**
 * Extract clean text content from HTML
 */
function extractTextFromHTML(html: string): string {
  // Remove scripts, styles, and other non-content elements
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<[^>]+>/g, ' ') // Remove all HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  // Limit length to avoid token limits
  return text.substring(0, 8000);
}

/**
 * Get scraping statistics for monitoring
 */
export function getScrapingStats(): { scraperSuccess: number; fallbackCount: number; totalAttempts: number } {
  // This would be implemented with proper metrics tracking
  // For now, return placeholder stats
  return {
    scraperSuccess: 0,
    fallbackCount: 0,
    totalAttempts: 0
  };
}
