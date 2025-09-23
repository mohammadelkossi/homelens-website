# Real Estate Investment Scorecard

A modern, AI-powered web application that analyzes UK property investments from Rightmove listings. The application provides comprehensive scoring across four key categories: financials, convenience, fundamentals, and non-negotiables.

## Features

### 🏠 Property Analysis
- **Web Scraping**: Automatically extracts property data from Rightmove URLs
- **Comprehensive Scoring**: Evaluates properties across multiple investment criteria
- **Real-time Analysis**: Instant results with detailed breakdowns
- **Market Metrics**: Integration with UK Land Registry data for accurate market analysis

### 📊 Scoring Categories

1. **Financials** (Blue)
   - Price per square meter analysis
   - Property size evaluation
   - Total price assessment

2. **Custom Criteria** (User-defined)
   - Garage availability (0.2 no, 0.8 yes)
   - Location preference (S10 postcode: 1.0, others: 0.2)
   - Number of toilets (2 toilets: 0.8, 1 toilet: 0.2)
   - Parking spaces (2 spaces: 0.8, 1 space: 0.5, none: 0.2)
   - Garden availability (garden: 0.8, no garden: 0.2)
   - Minimum space requirements (>100 sqm: 0.8, <100 sqm: 0.2)
   - Time on market (<1 month: 0.8, >1 month: 0.2)
   - Property type (detached: 0.8, semi-detached: 0.5, terraced: 0.2)

3. **Market Metrics** (Postcode-level)
   - Average listed price per sqm
   - Average sold price per sqm
   - Annual price growth percentage
   - Price change trends (1m, 3m, 6m, 12m)
   - Recent sales data (last 90 days)

4. **Local Amenities & Services** (Google Maps Integration)
   - Parks and green spaces
   - Airports and transport hubs
   - Schools and educational facilities
   - Hospitals and healthcare
   - Train stations and public transport
   - Petrol stations and fuel
   - Supermarkets and shopping

### 🎨 Modern UI/UX
- **Sleek Design**: Modern, minimalist interface with dark mode support
- **Interactive Charts**: Visual score breakdowns with pie and bar charts
- **Responsive Layout**: Works seamlessly on desktop and mobile devices
- **Customizable Requirements**: Adjustable non-negotiable criteria

### 📈 Data Visualization
- Overall investment score (0-100)
- Category-specific breakdowns
- Interactive charts and graphs
- Personalized recommendations

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- (Optional) UK Land Registry API key for enhanced market data
- (Optional) Google Maps API key for locality analysis

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd rm-scorecard
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) Set up API keys:
   
   **Land Registry API:**
   - Visit [https://use-land-property-data.service.gov.uk/](https://use-land-property-data.service.gov.uk/)
   - Create an account and obtain an API key
   
   **Google Maps API:**
   - Visit [https://console.cloud.google.com/](https://console.cloud.google.com/)
   - Create a project and enable the Places API
   - Create credentials (API key)
   
   Create a `.env.local` file in the root directory:
   ```bash
   LAND_REGISTRY_API_KEY=your_land_registry_api_key_here
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   ```
   
   **Note:** The application works without API keys using fallback data

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Enter Property URL**: Paste a Rightmove property URL
2. **Analyze**: Click "Analyze Property" to get instant results
3. **Review Results**: View comprehensive scoring including:
   - Price per square meter analysis
   - Custom criteria scoring (garage, location, toilets, etc.)
   - Local amenities & services (parks, schools, hospitals, etc.)
   - Market metrics (postcode-level averages and trends)
   - Overall investment score

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **Web Scraping**: Cheerio
- **Distance Calculation**: Haversine Distance
- **Validation**: Zod
- **Market Data**: UK Land Registry API (with fallback data)
- **Locality Data**: Google Maps Places API (with fallback data)
- **Caching**: In-memory cache (24-hour TTL for market data, 7-day TTL for places)

## API Endpoints

### POST `/api/analyze`
Analyzes a property from a Rightmove URL.

**Request Body:**
```json
{
  "rightmoveUrl": "https://www.rightmove.co.uk/properties/...",
  "nonNegotiables": {
    "minBathrooms": 2,
    "minSize": 100,
    "requiresGarden": true,
    "requiresParking": false
  },
  "customCriteria": {
    "garageWeight": { "yes": 0.8, "no": 0.2 },
    "locationWeight": { "s10": 1.0, "other": 0.2 }
  }
}
```

**Response:**
```json
{
  "overallScore": 85,
  "categories": {
    "financials": { "score": 92, "maxScore": 100, "breakdown": {...} },
    "customCriteria": { "score": 78, "maxScore": 100, "breakdown": {...} }
  },
  "propertyData": {...},
  "marketMetrics": {
    "listingPricePerSqm": 3500,
    "avgListedPricePerSqmPostcode": 3200,
    "avgSoldPricePerSqmPostcode": 3000,
    "avgAnnualPriceGrowthPct": 5.2,
    "soldPriceChangePct": {
      "last1m": 0.4,
      "last3m": 1.2,
      "last6m": 2.8,
      "last12m": 5.2
    },
    "bandedAvgSoldPriceLast90d": {
      "sqmBand": "90-105 sqm",
      "avgSoldPrice": 325000,
      "sampleSize": 8
    }
  }
}
```

## Project Structure

```
src/
├── app/
│   ├── api/analyze/route.ts    # Analysis API endpoint
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Main application page
├── components/
│   ├── NonNegotiablesConfig.tsx # Configuration component
│   └── ScoreChart.tsx          # Chart visualization
├── lib/
│   ├── analysis.ts             # Analysis logic
│   ├── scraper.ts              # Web scraping utilities
│   ├── market.ts               # Land Registry API integration
│   └── places.ts               # Google Maps Places API integration
└── types/
    └── property.ts             # TypeScript definitions
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Disclaimer

This application is for educational and informational purposes only. Property investment decisions should be made with professional advice and thorough due diligence. The analysis provided is based on publicly available data and simplified algorithms.
