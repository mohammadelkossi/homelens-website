import { describe, it, expect } from 'vitest';
import { parseJsonLdDate, parseGlobalJsonModelDate, parseAddedOnFromText, extractGlobalJson } from './scrapeTimeOnMarket';

describe('parseJsonLdDate', () => {
  it('should extract datePosted from JSON-LD', () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "RealEstateListing",
            "datePosted": "2025-09-10T10:00:00Z"
          }
          </script>
        </head>
      </html>
    `;
    
    const result = parseJsonLdDate(html);
    expect(result).toBe('2025-09-10');
  });
  
  it('should handle array of JSON-LD objects', () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
          [{
            "@context": "https://schema.org",
            "@type": "WebPage"
          },
          {
            "@context": "https://schema.org",
            "@type": "Product",
            "datePublished": "2025-08-15"
          }]
          </script>
        </head>
      </html>
    `;
    
    const result = parseJsonLdDate(html);
    expect(result).toBe('2025-08-15');
  });
  
  it('should return null when no date found', () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Product"
          }
          </script>
        </head>
      </html>
    `;
    
    const result = parseJsonLdDate(html);
    expect(result).toBeNull();
  });
  
  it('should handle malformed JSON gracefully', () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
          { invalid json }
          </script>
        </head>
      </html>
    `;
    
    const result = parseJsonLdDate(html);
    expect(result).toBeNull();
  });
});

describe('parseGlobalJsonModelDate', () => {
  it('should extract date from window.jsonModel', () => {
    const html = `
      <html>
        <head>
          <script>
            window.jsonModel = {
              "property": {
                "addedOn": "2025-09-10",
                "price": 500000
              }
            };
          </script>
        </head>
      </html>
    `;
    
    const result = parseGlobalJsonModelDate(html);
    expect(result).toBe('2025-09-10');
  });
  
  it('should extract date from var assignment', () => {
    const html = `
      <html>
        <head>
          <script>
            var propertyData = {
              "details": {
                "firstListedDate": "2025-08-20T00:00:00"
              }
            };
          </script>
        </head>
      </html>
    `;
    
    const result = parseGlobalJsonModelDate(html);
    expect(result).toBe('2025-08-20');
  });
  
  it('should return null when no date keys found', () => {
    const html = `
      <html>
        <head>
          <script>
            window.jsonModel = {
              "property": {
                "price": 500000,
                "bedrooms": 3
              }
            };
          </script>
        </head>
      </html>
    `;
    
    const result = parseGlobalJsonModelDate(html);
    expect(result).toBeNull();
  });
});

describe('parseAddedOnFromText', () => {
  it('should parse absolute date "Added on DD Month YYYY"', () => {
    const html = `
      <html>
        <body>
          <div>Added on 15 September 2025</div>
        </body>
      </html>
    `;
    
    const fetchedAt = new Date('2025-10-01T12:00:00Z');
    const result = parseAddedOnFromText(html, fetchedAt);
    
    expect(result.date).toBe('2025-09-15');
    expect(result.snippet).toBe('Added on 15 September 2025');
  });
  
  it('should parse "Added today"', () => {
    const html = `
      <html>
        <body>
          <div>Added today</div>
        </body>
      </html>
    `;
    
    const fetchedAt = new Date('2025-10-01T12:00:00Z');
    const result = parseAddedOnFromText(html, fetchedAt);
    
    expect(result.date).toBe('2025-10-01');
    expect(result.snippet).toBe('Added today');
  });
  
  it('should parse "Added yesterday"', () => {
    const html = `
      <html>
        <body>
          <div>Added yesterday</div>
        </body>
      </html>
    `;
    
    const fetchedAt = new Date('2025-10-01T12:00:00Z');
    const result = parseAddedOnFromText(html, fetchedAt);
    
    expect(result.date).toBe('2025-09-30');
    expect(result.snippet).toBe('Added yesterday');
  });
  
  it('should parse "Added 3 weeks ago"', () => {
    const html = `
      <html>
        <body>
          <div>Added 3 weeks ago</div>
        </body>
      </html>
    `;
    
    const fetchedAt = new Date('2025-10-01T12:00:00Z');
    const result = parseAddedOnFromText(html, fetchedAt);
    
    // 3 weeks = 21 days before Oct 1 = Sep 10
    expect(result.date).toBe('2025-09-10');
    expect(result.snippet).toBe('Added 3 weeks ago');
  });
  
  it('should parse "Added 5 days ago"', () => {
    const html = `
      <html>
        <body>
          <div>Added 5 days ago</div>
        </body>
      </html>
    `;
    
    const fetchedAt = new Date('2025-10-01T12:00:00Z');
    const result = parseAddedOnFromText(html, fetchedAt);
    
    expect(result.date).toBe('2025-09-26');
    expect(result.snippet).toBe('Added 5 days ago');
  });
  
  it('should return null when no date pattern found', () => {
    const html = `
      <html>
        <body>
          <div>Beautiful property for sale</div>
        </body>
      </html>
    `;
    
    const fetchedAt = new Date('2025-10-01T12:00:00Z');
    const result = parseAddedOnFromText(html, fetchedAt);
    
    expect(result.date).toBeNull();
    expect(result.snippet).toBeNull();
  });
});

describe('extractGlobalJson', () => {
  it('should extract date from JSON with addedOn key', () => {
    const scriptContent = `
      window.PAGE_MODEL = {
        "listing": {
          "addedOn": "2025-09-15",
          "price": 500000
        }
      };
    `;
    
    const dateKeys = ['addedOn', 'firstListedDate', 'datePosted'];
    const result = extractGlobalJson(scriptContent, dateKeys);
    
    expect(result).toBe('2025-09-15');
  });
  
  it('should handle nested date keys', () => {
    const scriptContent = `
      var propertyData = {
        "property": {
          "details": {
            "firstListedDate": "2025-08-20"
          }
        }
      };
    `;
    
    const dateKeys = ['addedOn', 'firstListedDate', 'datePosted'];
    const result = extractGlobalJson(scriptContent, dateKeys);
    
    expect(result).toBe('2025-08-20');
  });
  
  it('should return null when no date keys found', () => {
    const scriptContent = `
      var data = {
        "price": 500000,
        "bedrooms": 3
      };
    `;
    
    const dateKeys = ['addedOn', 'firstListedDate', 'datePosted'];
    const result = extractGlobalJson(scriptContent, dateKeys);
    
    expect(result).toBeNull();
  });
});

