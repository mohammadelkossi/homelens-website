import * as cheerio from 'cheerio';

export type TimeOnMarket = {
  url: string;
  fetched_at: string; // ISO
  portal_added_on: string | null; // ISO date (YYYY-MM-DD) or null
  source: 'json-ld' | 'jsonModel' | 'text' | 'none';
  time_on_market_days: number | null;
  raw_snippet?: string; // only when source='text'
};

/**
 * Parse date from JSON-LD schema
 */
export function parseJsonLdDate(html: string): string | null {
  try {
    const $ = cheerio.load(html);
    const jsonLdScripts = $('script[type="application/ld+json"]');
    
    for (let i = 0; i < jsonLdScripts.length; i++) {
      const scriptContent = $(jsonLdScripts[i]).html();
      if (!scriptContent) continue;
      
      try {
        const data = JSON.parse(scriptContent);
        
        // Handle array of LD objects
        const items = Array.isArray(data) ? data : [data];
        
        for (const item of items) {
          // Check for datePosted, datePublished, or dateCreated
          const dateField = item.datePosted || item.datePublished || item.dateCreated;
          if (dateField) {
            return normalizeDate(dateField);
          }
          
          // Check nested objects
          if (item['@graph']) {
            for (const graphItem of item['@graph']) {
              const graphDate = graphItem.datePosted || graphItem.datePublished || graphItem.dateCreated;
              if (graphDate) {
                return normalizeDate(graphDate);
              }
            }
          }
        }
      } catch (e) {
        // Skip malformed JSON
        continue;
      }
    }
  } catch (e) {
    // Parsing error, return null
  }
  
  return null;
}

/**
 * Extract and parse global JSON models from script tags
 */
export function parseGlobalJsonModelDate(html: string): string | null {
  try {
    const $ = cheerio.load(html);
    const scriptTags = $('script:not([src])');
    
    const dateKeys = ['addedOn', 'firstListedDate', 'datePosted', 'datePublished', 'listedDate', 'addedDate'];
    
    for (let i = 0; i < scriptTags.length; i++) {
      const scriptContent = $(scriptTags[i]).html();
      if (!scriptContent || scriptContent.includes('application/ld+json')) continue;
      
      // Try to find variable assignments or JSON objects
      const extracted = extractGlobalJson(scriptContent, dateKeys);
      if (extracted) {
        return extracted;
      }
    }
  } catch (e) {
    // Parsing error
  }
  
  return null;
}

/**
 * Extract date from global JSON objects in script tags
 */
export function extractGlobalJson(scriptContent: string, dateKeys: string[]): string | null {
  // Look for common patterns: window.jsonModel = {...}, var data = {...}, etc.
  const patterns = [
    /window\.(jsonModel|__PRELOADED_STATE__|PAGE_MODEL)\s*=\s*(\{[\s\S]*?\});/,
    /var\s+(jsonModel|pageModel|propertyData)\s*=\s*(\{[\s\S]*?\});/,
    /const\s+(jsonModel|pageModel|propertyData)\s*=\s*(\{[\s\S]*?\});/,
  ];
  
  for (const pattern of patterns) {
    const match = scriptContent.match(pattern);
    if (match && match[2]) {
      try {
        const jsonStr = match[2];
        const data = JSON.parse(jsonStr);
        
        // Search for date keys recursively
        const found = findDateInObject(data, dateKeys);
        if (found) {
          return normalizeDate(found);
        }
      } catch (e) {
        // Not valid JSON, try next pattern
        continue;
      }
    }
  }
  
  // Try to find the largest JSON object that contains date keys
  const jsonObjects = scriptContent.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g) || [];
  const sortedBySize = jsonObjects.sort((a, b) => b.length - a.length);
  
  for (const jsonStr of sortedBySize) {
    if (jsonStr.length < 100) break; // Too small to be useful
    
    try {
      const data = JSON.parse(jsonStr);
      
      // Check if it contains any date keys
      const hasDateKey = dateKeys.some(key => 
        JSON.stringify(data).toLowerCase().includes(key.toLowerCase())
      );
      
      if (hasDateKey) {
        const found = findDateInObject(data, dateKeys);
        if (found) {
          return normalizeDate(found);
        }
      }
    } catch (e) {
      // Not valid JSON, skip
      continue;
    }
  }
  
  return null;
}

/**
 * Recursively search for date keys in an object
 */
function findDateInObject(obj: any, dateKeys: string[], depth = 0): string | null {
  if (depth > 5 || !obj || typeof obj !== 'object') return null;
  
  // Check direct keys (case-insensitive)
  for (const key of Object.keys(obj)) {
    const lowerKey = key.toLowerCase();
    if (dateKeys.some(dk => lowerKey.includes(dk.toLowerCase()))) {
      const value = obj[key];
      if (typeof value === 'string' && (value.match(/^\d{4}-\d{2}-\d{2}/) || value.match(/^\d{2}\/\d{2}\/\d{4}/))) {
        return value;
      }
    }
  }
  
  // Search nested objects and arrays
  for (const value of Object.values(obj)) {
    if (typeof value === 'object' && value !== null) {
      const found = findDateInObject(value, dateKeys, depth + 1);
      if (found) return found;
    }
  }
  
  return null;
}

/**
 * Parse "Added on" text from page content
 */
export function parseAddedOnFromText(html: string, fetchedAt: Date): { date: string | null; snippet: string | null } {
  try {
    const $ = cheerio.load(html);
    const bodyText = $('body').text();
    
    // Pattern 1: "Added on DD Month YYYY" or "Listed on DD Month YYYY"
    const absolutePattern = /(Added|Listed|First listed)\s+on\s+(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i;
    const absoluteMatch = bodyText.match(absolutePattern);
    
    if (absoluteMatch) {
      const day = absoluteMatch[2].padStart(2, '0');
      const month = monthToNumber(absoluteMatch[3]);
      const year = absoluteMatch[4];
      const snippet = absoluteMatch[0];
      
      if (month) {
        return {
          date: `${year}-${month}-${day}`,
          snippet
        };
      }
    }
    
    // Pattern 2: "Added DD/MM/YYYY"
    const slashPattern = /(Added|Listed)\s+(?:on\s+)?(\d{1,2})\/(\d{1,2})\/(\d{4})/i;
    const slashMatch = bodyText.match(slashPattern);
    
    if (slashMatch) {
      const day = slashMatch[2].padStart(2, '0');
      const month = slashMatch[3].padStart(2, '0');
      const year = slashMatch[4];
      const snippet = slashMatch[0];
      
      return {
        date: `${year}-${month}-${day}`,
        snippet
      };
    }
    
    // Pattern 3: Relative dates - "Added today", "Added yesterday", "Added X days ago", "Added X weeks ago"
    const relativePattern = /(Added|Listed)\s+(today|yesterday|(\d+)\s+(day|week|month)s?\s+ago)/i;
    const relativeMatch = bodyText.match(relativePattern);
    
    if (relativeMatch) {
      const snippet = relativeMatch[0];
      const timePhrase = relativeMatch[2].toLowerCase();
      
      let calculatedDate = new Date(fetchedAt);
      
      if (timePhrase === 'today') {
        // Use fetch date
      } else if (timePhrase === 'yesterday') {
        calculatedDate.setDate(calculatedDate.getDate() - 1);
      } else if (relativeMatch[3] && relativeMatch[4]) {
        const amount = parseInt(relativeMatch[3]);
        const unit = relativeMatch[4].toLowerCase();
        
        if (unit === 'day') {
          calculatedDate.setDate(calculatedDate.getDate() - amount);
        } else if (unit === 'week') {
          calculatedDate.setDate(calculatedDate.getDate() - (amount * 7));
        } else if (unit === 'month') {
          calculatedDate.setMonth(calculatedDate.getMonth() - amount);
        }
      }
      
      const year = calculatedDate.getFullYear();
      const month = String(calculatedDate.getMonth() + 1).padStart(2, '0');
      const day = String(calculatedDate.getDate()).padStart(2, '0');
      
      return {
        date: `${year}-${month}-${day}`,
        snippet
      };
    }
    
  } catch (e) {
    // Parsing error
  }
  
  return { date: null, snippet: null };
}

/**
 * Convert month name to number string
 */
function monthToNumber(monthName: string): string | null {
  const months: Record<string, string> = {
    'january': '01', 'february': '02', 'march': '03', 'april': '04',
    'may': '05', 'june': '06', 'july': '07', 'august': '08',
    'september': '09', 'october': '10', 'november': '11', 'december': '12'
  };
  
  return months[monthName.toLowerCase()] || null;
}

/**
 * Normalize date to YYYY-MM-DD format
 */
function normalizeDate(dateStr: string): string | null {
  try {
    // If already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Try parsing ISO date and extract date part
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    // Invalid date
  }
  
  return null;
}

/**
 * Calculate days between two dates
 */
function calculateDaysOnMarket(addedOn: string, fetchedAt: Date): number | null {
  try {
    const addedDate = new Date(addedOn + 'T00:00:00Z');
    const fetchDate = new Date(fetchedAt.toISOString().split('T')[0] + 'T00:00:00Z');
    
    if (isNaN(addedDate.getTime()) || isNaN(fetchDate.getTime())) {
      return null;
    }
    
    const diffMs = fetchDate.getTime() - addedDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    return diffDays >= 0 ? diffDays : null;
  } catch (e) {
    return null;
  }
}

/**
 * Main function to scrape time on market
 */
export async function scrapeTimeOnMarket(url: string): Promise<TimeOnMarket> {
  const fetchedAt = new Date();
  const fetchedAtIso = fetchedAt.toISOString();
  
  try {
    // Fetch HTML with retries
    const html = await fetchWithRetry(url);
    
    // Try JSON-LD first
    const jsonLdDate = parseJsonLdDate(html);
    if (jsonLdDate) {
      return {
        url,
        fetched_at: fetchedAtIso,
        portal_added_on: jsonLdDate,
        source: 'json-ld',
        time_on_market_days: calculateDaysOnMarket(jsonLdDate, fetchedAt)
      };
    }
    
    // Try global JSON model
    const jsonModelDate = parseGlobalJsonModelDate(html);
    if (jsonModelDate) {
      return {
        url,
        fetched_at: fetchedAtIso,
        portal_added_on: jsonModelDate,
        source: 'jsonModel',
        time_on_market_days: calculateDaysOnMarket(jsonModelDate, fetchedAt)
      };
    }
    
    // Try text fallback
    const textResult = parseAddedOnFromText(html, fetchedAt);
    if (textResult.date) {
      return {
        url,
        fetched_at: fetchedAtIso,
        portal_added_on: textResult.date,
        source: 'text',
        time_on_market_days: calculateDaysOnMarket(textResult.date, fetchedAt),
        raw_snippet: textResult.snippet || undefined
      };
    }
    
    // No date found
    return {
      url,
      fetched_at: fetchedAtIso,
      portal_added_on: null,
      source: 'none',
      time_on_market_days: null
    };
    
  } catch (error) {
    throw new Error(`Failed to fetch ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fetch HTML with retries and timeout
 */
async function fetchWithRetry(url: string, maxRetries = 3, timeout = 10000): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.text();
      
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  
  throw new Error('Max retries exceeded');
}



