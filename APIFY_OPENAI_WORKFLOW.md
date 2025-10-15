# Apify + OpenAI Property Scraping Workflow

## Overview
This document describes the new intelligent property scraping workflow that combines Apify's comprehensive data extraction with OpenAI's AI-powered fallback for missing information.

## Workflow Steps

### Step 1: User Clicks "Analyse Property" Button
- User enters a Rightmove URL in the preferences page
- Clicks the "Analyse Property" button
- Triggers `handleAnalyzeProperty()` function

### Step 2: Apify Primary Scraping
**API Route:** `/api/scrape-with-apify-fallback`

The system first attempts to scrape all property data using **Apify Rightmove Scraper**:

```javascript
const apifyResult = await scrapeWithApify(rightmoveUrl);
```

**Apify provides:**
- ✅ Address
- ✅ Price
- ✅ Bedrooms & Bathrooms
- ✅ Property Type
- ✅ Size (sometimes)
- ✅ Description
- ✅ Features (garden, parking, etc.)
- ✅ Images
- ✅ Floor plans
- ✅ Coordinates (lat/lng)
- ✅ Price History
- ✅ EPC Rating
- ✅ First Visible Date (sometimes)
- ✅ Listing Update Date
- ✅ Tenure
- ✅ Council Tax Band
- ✅ Agent Information

### Step 3: OpenAI Fallback for Missing Size
**Condition:** If `sizeInSqm` is missing AND floor plans are available

When Apify doesn't return the property size, the system:

1. **Checks for floor plans** in the Apify data
2. **Downloads the first floor plan image**
3. **Analyzes it with OpenAI Vision API** (`gpt-4o`)
4. **Extracts room dimensions** from the floor plan
5. **Calculates total area** by summing all rooms
6. **Validates the calculation** with fail-safes:
   - Compares AI total vs manual sum of rooms
   - Uses manual calculation if discrepancy > 5%
   - Checks if size is within reasonable range (50-500 sqm)

```javascript
const sizeResult = await extractSizeFromFloorplan(floorplanUrl);
```

**OpenAI Vision Prompt:**
```
Analyze this floor plan image and extract the total property size.

TASK:
1. Identify all room dimensions (e.g., "3.5m x 4.2m")
2. Calculate area of each room
3. Sum all room areas
4. Provide result in sqm and sqft
```

### Step 4: OpenAI Fallback for First Listed Date
**Condition:** If first visible date is missing OR shows "Reduced on..."

When Apify returns a price reduction date instead of the original listing date:

1. **Fetches the property HTML**
2. **Analyzes it with OpenAI** (`gpt-4o`)
3. **Searches for date patterns:**
   - `"added":"YYYYMMDD"` (JSON format) - MOST RELIABLE
   - "Added on DD/MM/YYYY" text
   - "Added on DD Month YYYY" text
4. **Ignores reduction dates** - focuses only on original listing date
5. **Calculates days on market**

```javascript
const dateResult = await extractFirstListedDateFromHTML(html);
```

**OpenAI Analysis Prompt:**
```
Find the ORIGINAL FIRST LISTED DATE (not price reduction dates).

IMPORTANT PATTERNS:
1. "added":"20250603" (YYYYMMDD) - MOST RELIABLE
2. "Added on DD/MM/YYYY"
3. "Added on DD Month YYYY"

IGNORE:
- "Reduced on" dates
- "listingUpdateReason" with reductions
```

### Step 5: Comprehensive Data Return
The system returns a complete property data object with:

```javascript
{
  success: true,
  propertyData: {
    address: "...",
    price: 725000,
    bedrooms: 3,
    bathrooms: 2,
    propertyType: "Detached",
    sizeInSqm: 195,           // From Apify OR OpenAI Vision
    firstVisibleDate: "2025-06-03",  // From Apify OR OpenAI HTML Analysis
    description: "...",
    features: ["Garden", "Parking", ...],
    images: [...],
    coordinates: { lat: ..., lng: ... },
    priceHistory: [...],
    epc: {...},
    floorplans: [...],
    // ... more data
  },
  scrapingMethod: "apify_with_openai_fallback",
  extractionMethods: {
    size: "apify" | "openai_vision_floorplan",
    firstListedDate: "apify" | "openai_html_analysis"
  }
}
```

## Data Flow Diagram

```
User Input (Rightmove URL)
         ↓
[Apify Scraper]
         ↓
    ┌────────────────────┐
    │ Size Available?    │
    └────────────────────┘
         ↓           ↓
        YES         NO
         ↓           ↓
         ↓      [OpenAI Vision]
         ↓      Analyze Floor Plan
         ↓           ↓
         └───────┬───┘
                 ↓
    ┌────────────────────────┐
    │ First Date Available?  │
    │ (not "Reduced on")     │
    └────────────────────────┘
         ↓           ↓
        YES         NO
         ↓           ↓
         ↓      [OpenAI HTML]
         ↓      Extract Date
         ↓           ↓
         └───────┬───┘
                 ↓
    [Complete Property Data]
                 ↓
    [Comprehensive Analysis]
```

## Key Benefits

### 🎯 Accuracy
- **Primary**: Apify provides structured, reliable data
- **Fallback**: OpenAI fills gaps with intelligent extraction

### 🚀 Speed
- Apify is fast and comprehensive
- OpenAI only runs when needed

### 💰 Cost Efficiency
- Apify does the heavy lifting
- OpenAI Vision/Analysis only for missing data

### 📊 Data Richness
- **Garden & Parking**: Detailed from Apify features
- **Size**: Floor plan analysis when not available
- **First Listed Date**: Accurate even when showing reductions
- **Price History**: Full history from Apify
- **EPC**: Energy performance data
- **Agent Info**: Contact details and logo

## Error Handling

### Apify Fails
- System returns error
- No fallback to old scraper

### OpenAI Vision Fails
- Size remains `null`
- Analysis continues without size

### OpenAI HTML Analysis Fails
- Uses listing update date as fallback
- Analysis continues

## Console Logging

The workflow provides detailed logging at each step:

```
🚀 Starting Apify-first scraping workflow for: [URL]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 STEP 1: Scraping with Apify...
✅ Apify scraping successful!
📊 Apify data summary:
  - Address: Wilmslow Road, Cheadle, SK8
  - Price: 725000
  - Size: 195 sqm
  - Bedrooms: 3
  - Bathrooms: 2
  - First Listed: 2025-06-03
  - Listing Update: Reduced on 06/10/2025
  - Floor plans: 4

📍 STEP 2: Size already available from Apify, skipping extraction

📍 STEP 3: First listed date already available from Apify, skipping extraction

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ SCRAPING COMPLETE
📊 Final data summary:
  - Address: Wilmslow Road, Cheadle, SK8
  - Price: £725,000
  - Size: 195 sqm (apify)
  - First Listed: 2025-06-03 (apify)
  - Bedrooms: 3
  - Bathrooms: 2
  - Features: 10
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Configuration

### Environment Variables Required
```bash
# Apify API Token
APIFY_API_TOKEN=apify_api_...

# OpenAI API Key
OPENAI_API_KEY=sk-proj-...
```

### API Routes
- **Primary**: `/api/scrape-with-apify-fallback`
- **Fallback**: None (Apify is required)

## Testing

To test the workflow:

```bash
# Test with a property that has size data
node test-apify-scraper.js

# Test with a property missing size (will trigger OpenAI Vision)
# Test with a property showing "Reduced on" (will trigger OpenAI HTML analysis)
```

## Future Enhancements

1. **Multi-floor plan analysis** - Analyze all floor plans and combine
2. **Image recognition for features** - Detect garden/parking from images
3. **Price trend prediction** - Use price history for forecasting
4. **Neighborhood analysis** - Use coordinates for area insights

