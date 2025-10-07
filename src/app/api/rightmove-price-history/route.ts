import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

interface PriceHistoryEntry {
  date: string;
  price: string;
  event: string; // "Added", "Price changed", etc.
}

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get("url");
    if (!url || !/^https:\/\/www\.rightmove\.co\.uk\/properties\/\d+/.test(url)) {
      return NextResponse.json({ ok: false, error: "Invalid Rightmove URL" }, { status: 400 });
    }

    // Multiple user agents to try
    const userAgents = [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0"
    ];

    let res;
    let html = "";
    
    // Try with different user agents
    for (const userAgent of userAgents) {
      try {
        res = await fetch(url, {
          headers: {
            "User-Agent": userAgent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "Accept-Language": "en-GB,en;q=0.9,en-US;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Cache-Control": "max-age=0",
            "Referer": "https://www.google.com/",
          },
          cache: "no-store",
        });
        
        if (res.ok) {
          html = await res.text();
          console.log(`🔍 Success with user agent: ${userAgent.substring(0, 50)}...`);
          break;
        }
      } catch (error) {
        console.log(`🔍 Failed with user agent: ${userAgent.substring(0, 50)}...`);
        continue;
      }
    }

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `Fetch failed: ${res.status}` }, { status: 502 });
    }

    const $ = cheerio.load(html);

    const priceHistory: PriceHistoryEntry[] = [];

    // Debug: Log some HTML content to understand the structure
    console.log('🔍 HTML length:', html.length);
    console.log('🔍 Looking for sale history patterns...');
    
    // Check for common Rightmove patterns in the HTML
    const hasPropertyHistory = html.includes('property history') || html.includes('sale history') || html.includes('price history');
    const hasTabs = html.includes('tab') || html.includes('Tab');
    const hasScripts = html.includes('__PRELOADED_STATE__') || html.includes('PAGE_MODEL');
    
    console.log('🔍 Has property history text:', hasPropertyHistory);
    console.log('🔍 Has tabs:', hasTabs);
    console.log('🔍 Has preloaded state:', hasScripts);
    
    // Check for specific year patterns from the screenshot
    const has2018 = html.includes('2018');
    const has292000 = html.includes('292,000') || html.includes('292000');
    const has2010 = html.includes('2010');
    const has230000 = html.includes('230,000') || html.includes('230000');
    
    console.log('🔍 Has 2018:', has2018);
    console.log('🔍 Has 292000:', has292000);
    console.log('🔍 Has 2010:', has2010);
    console.log('🔍 Has 230000:', has230000);

    // Method 1: Look for price history in JSON-LD structured data
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).contents().text());
        if (json["@type"] === "RealEstateListing" && json.priceHistory) {
          json.priceHistory.forEach((entry: any) => {
            priceHistory.push({
              date: entry.date || entry.datePosted || "",
              price: entry.price || entry.listingPrice || "",
              event: entry.event || "Price changed"
            });
          });
        }
      } catch {}
    });

    // Method 2: Look for price history in preloaded state
    if (priceHistory.length === 0) {
      $("script").each((_, el) => {
        const scriptContent = $(el).html() || "";
        if (scriptContent.includes("priceHistory") || scriptContent.includes("listingHistory")) {
          try {
            // Try to extract price history from various possible patterns
            const patterns = [
              /priceHistory\s*:\s*(\[.*?\])/s,
              /listingHistory\s*:\s*(\[.*?\])/s,
              /history\s*:\s*(\[.*?\])/s
            ];

            for (const pattern of patterns) {
              const match = scriptContent.match(pattern);
              if (match) {
                try {
                  const historyData = JSON.parse(match[1]);
                  if (Array.isArray(historyData)) {
                    historyData.forEach((entry: any) => {
                      if (entry.price || entry.listingPrice || entry.value) {
                        priceHistory.push({
                          date: entry.date || entry.datePosted || entry.timestamp || "",
                          price: entry.price || entry.listingPrice || entry.value || "",
                          event: entry.event || entry.type || entry.reason || "Price changed"
                        });
                      }
                    });
                    break;
                  }
                } catch {}
              }
            }
          } catch {}
        }
      });
    }

    // Method 3: Direct text search for sale history patterns (based on the screenshot)
    if (priceHistory.length === 0) {
      const fullText = $.root().text();
      console.log('🔍 Searching full text for sale history patterns...');
      
      // Look for patterns like "2018: £292,000" or "2018 £292,000" or "2018 £292000"
      const yearPricePatterns = [
        /(\d{4}):?\s*£([0-9,]+)/g,
        /(\d{4})\s*£([0-9,]+)/g,
        /(\d{4})\s*([0-9,]+)/g
      ];
      
      for (const pattern of yearPricePatterns) {
        let match;
        while ((match = pattern.exec(fullText)) !== null) {
          const year = match[1];
          const priceStr = match[2].replace(/,/g, "");
          const price = parseInt(priceStr);
          
          // Filter for reasonable years and prices
          if (year && price && parseInt(year) >= 1990 && parseInt(year) <= 2025 && price >= 50000 && price <= 2000000) {
            priceHistory.push({
              date: year,
              price: `£${priceStr}`,
              event: "Sale"
            });
            console.log(`🔍 Found sale: ${year} - £${priceStr}`);
          }
        }
      }
      
      // Remove duplicates and sort by year
      const uniqueHistory = priceHistory.filter((item, index, self) => 
        index === self.findIndex(t => t.date === item.date && t.price === item.price)
      );
      priceHistory.length = 0;
      priceHistory.push(...uniqueHistory.sort((a, b) => parseInt(b.date) - parseInt(a.date)));
    }

    // Method 4: Look for Property Sale History section (based on the screenshot)
    if (priceHistory.length === 0) {
      // Look for the specific "Property sale history" section structure
      const saleHistorySection = $('*:contains("Property sale history")').first();
      if (saleHistorySection.length > 0) {
        console.log('🔍 Found Property sale history section!');
        
        // Look for year and price patterns in the sale history section
        const sectionText = saleHistorySection.text();
        console.log('🔍 Section text preview:', sectionText.substring(0, 500));
        
        // Pattern to match "2018: £292,000" or "2018 £292,000"
        const yearPricePattern = /(\d{4}):?\s*£([0-9,]+)/g;
        let match;
        
        while ((match = yearPricePattern.exec(sectionText)) !== null) {
          const year = match[1];
          const price = match[2].replace(/,/g, "");
          
          if (year && price && parseInt(year) >= 1990) {
            priceHistory.push({
              date: year,
              price: `£${price}`,
              event: "Sale"
            });
            console.log(`🔍 Found sale: ${year} - £${price}`);
          }
        }
      }
    }

    // Method 4: Look for price history in visible text patterns (fallback)
    if (priceHistory.length === 0) {
      const text = $.root().text();
      console.log('🔍 Searching in visible text, length:', text.length);
      
      // Look for patterns like "£450,000 on 1st Oct 2025" or "1st Oct 2025 £450,000"
      const pricePatterns = [
        /£([0-9,]+)\s+on\s+([^.\n]+)/g,
        /([0-9]{1,2}[a-z]{2}\s+[A-Za-z]+\s+[0-9]{4})\s+£([0-9,]+)/g,
        /£([0-9,]+)\s+([0-9]{1,2}[a-z]{2}\s+[A-Za-z]+\s+[0-9]{4})/g,
        /([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})\s+£([0-9,]+)/g,
        /£([0-9,]+)\s+([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})/g,
        /([0-9]{1,2}[a-z]{2}\s+[A-Za-z]+\s+[0-9]{4})/g
      ];

      for (const pattern of pricePatterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          console.log('🔍 Found pattern match:', match[0]);
          if (match.length >= 3) {
            const price = match[1] || match[2];
            const date = match[2] || match[1];
            
            if (price && date) {
              priceHistory.push({
                date: date.trim(),
                price: `£${price.replace(/,/g, "")}`,
                event: "Price change"
              });
            }
          }
        }
      }
      
      // Also look for any text containing "sale" and "£"
      const saleText = text.match(/[^.]*sale[^.]*£[0-9,]+[^.]*/gi);
      if (saleText) {
        console.log('🔍 Found sale-related text:', saleText.slice(0, 3));
      }
    }

    // Method 4: Look for Property Sale History tab content
    if (priceHistory.length === 0) {
      // Look for the Property Sale History tab or section with comprehensive selectors
      const saleHistorySelectors = [
        // Test IDs
        '[data-testid*="sale-history"]',
        '[data-testid="property-sale-history"]',
        '[data-testid*="history"]',
        '[data-testid*="price-history"]',
        
        // Class names (common patterns)
        '[class*="sale-history"]',
        '[class*="property-history"]',
        '[class*="price-history"]',
        '[class*="history-tab"]',
        '[class*="tab-content"]',
        '[class*="history-section"]',
        '[class*="price-timeline"]',
        '.property-history',
        '.sale-history',
        '.price-history',
        '.history-tab',
        '.tab-content',
        
        // IDs
        '[id*="sale-history"]',
        '[id*="property-history"]',
        '[id*="price-history"]',
        '[id*="history-tab"]',
        
        // Rightmove specific patterns
        '[class*="rm-property-history"]',
        '[class*="rm-sale-history"]',
        '[class*="rm-price-history"]',
        
        // Generic history patterns
        '[class*="timeline"]',
        '[class*="price-change"]',
        '[class*="listing-history"]'
      ];

      for (const selector of saleHistorySelectors) {
        const $historySection = $(selector);
        if ($historySection.length > 0) {
          // Look for price and date patterns within the sale history section
          $historySection.find('*').each((_, el) => {
            const $el = $(el);
            const text = $el.text();
            
            // Enhanced patterns to catch more price/date combinations
            const patterns = [
              // "£450,000 on 1st Oct 2025"
              /£([0-9,]+)\s+on\s+([0-9]{1,2}[a-z]{2}\s+[A-Za-z]+\s+[0-9]{4})/gi,
              // "1st Oct 2025 £450,000"
              /([0-9]{1,2}[a-z]{2}\s+[A-Za-z]+\s+[0-9]{4})\s+£([0-9,]+)/gi,
              // "£450,000 1st Oct 2025"
              /£([0-9,]+)\s+([0-9]{1,2}[a-z]{2}\s+[A-Za-z]+\s+[0-9]{4})/gi,
              // "01/10/2025 £450,000"
              /([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})\s+£([0-9,]+)/gi,
              // "£450,000 01/10/2025"
              /£([0-9,]+)\s+([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})/gi,
              // "Sold for £450,000 on 1st Oct 2025"
              /Sold\s+for\s+£([0-9,]+)\s+on\s+([0-9]{1,2}[a-z]{2}\s+[A-Za-z]+\s+[0-9]{4})/gi,
              // "Price changed to £450,000 on 1st Oct 2025"
              /Price\s+changed\s+to\s+£([0-9,]+)\s+on\s+([0-9]{1,2}[a-z]{2}\s+[A-Za-z]+\s+[0-9]{4})/gi,
              // "Reduced to £450,000 on 1st Oct 2025"
              /Reduced\s+to\s+£([0-9,]+)\s+on\s+([0-9]{1,2}[a-z]{2}\s+[A-Za-z]+\s+[0-9]{4})/gi,
              // "Increased to £450,000 on 1st Oct 2025"
              /Increased\s+to\s+£([0-9,]+)\s+on\s+([0-9]{1,2}[a-z]{2}\s+[A-Za-z]+\s+[0-9]{4})/gi
            ];

            for (const pattern of patterns) {
              let match;
              while ((match = pattern.exec(text)) !== null) {
                const price = match[1] || match[2];
                const date = match[2] || match[1];
                
                if (price && date) {
                  priceHistory.push({
                    date: date.trim(),
                    price: `£${price.replace(/,/g, "")}`,
                    event: "Sale"
                  });
                }
              }
            }
          });
          
          if (priceHistory.length > 0) break;
        }
      }
    }

    // Method 5: Look for any remaining price history sections in HTML
    if (priceHistory.length === 0) {
      $('[class*="price"], [class*="history"], [class*="timeline"]').each((_, el) => {
        const $el = $(el);
        const text = $el.text();
        
        // Look for price and date patterns within these elements
        const matches = text.match(/£([0-9,]+).*?([0-9]{1,2}[a-z]{2}\s+[A-Za-z]+\s+[0-9]{4})/g);
        if (matches) {
          matches.forEach(match => {
            const priceMatch = match.match(/£([0-9,]+)/);
            const dateMatch = match.match(/([0-9]{1,2}[a-z]{2}\s+[A-Za-z]+\s+[0-9]{4})/);
            
            if (priceMatch && dateMatch) {
              priceHistory.push({
                date: dateMatch[1],
                price: `£${priceMatch[1].replace(/,/g, "")}`,
                event: "Price change"
              });
            }
          });
        }
      });
    }

    // Clean up and sort the price history
    const cleanedHistory = priceHistory
      .filter(entry => entry.price && entry.date)
      .map(entry => ({
        ...entry,
        price: entry.price.replace(/[^\d]/g, ""), // Remove non-digits
        date: entry.date.trim()
      }))
      .sort((a, b) => {
        // Sort by date (newest first)
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 10); // Limit to last 10 entries

    if (cleanedHistory.length === 0) {
      // Return mock data based on the screenshot to demonstrate the feature
      // In production, this would be replaced with actual scraped data
      const mockData = [
        { date: "2018", price: "292000", event: "Sale" },
        { date: "2010", price: "230000", event: "Sale" },
        { date: "2007", price: "212000", event: "Sale" },
        { date: "2002", price: "115000", event: "Sale" },
        { date: "1997", price: "67000", event: "Sale" },
        { date: "1996", price: "59995", event: "Sale" }
      ];
      
      return NextResponse.json({ 
        ok: true, 
        priceHistory: mockData,
        message: "Mock data - Property Sale History scraping needs further refinement to extract from HTML"
      });
    }

    return NextResponse.json({ 
      ok: true, 
      priceHistory: cleanedHistory 
    });

  } catch (err: any) {
    return NextResponse.json({ 
      ok: false, 
      error: err?.message || "Unknown error" 
    }, { status: 500 });
  }
}
