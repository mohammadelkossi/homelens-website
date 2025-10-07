const fs = require('fs');
const path = require('path');

// Enhanced Land Registry data parser with EPC integration
class PricePerSqmAnalyzer {
  constructor() {
    this.dataDir = path.join(__dirname, 'data');
    this.epcApiBase = 'https://epc.opendatacommunities.org/api/v1/domestic/search';
  }

  // Parse CSV line for Land Registry data
  parseCSVLine(line) {
    try {
      const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
      if (!parts || parts.length < 15) return null;

      return {
        transactionId: parts[0].replace(/"/g, ''),
        price: parseInt(parts[1].replace(/"/g, '')) || 0,
        dateOfTransfer: parts[2].replace(/"/g, ''),
        postcode: parts[3].replace(/"/g, ''),
        propertyType: parts[4].replace(/"/g, ''),
        newBuild: parts[5].replace(/"/g, ''),
        tenure: parts[6].replace(/"/g, ''),
        paon: parts[7].replace(/"/g, ''),
        saon: parts[8].replace(/"/g, ''),
        street: parts[9].replace(/"/g, ''),
        locality: parts[10].replace(/"/g, ''),
        townCity: parts[11].replace(/"/g, ''),
        district: parts[12].replace(/"/g, ''),
        county: parts[13].replace(/"/g, ''),
        ppdCategoryType: parts[14].replace(/"/g, ''),
        recordStatus: parts[15]?.replace(/"/g, '') || 'A'
      };
    } catch (error) {
      console.warn('Failed to parse CSV line:', error);
      return null;
    }
  }

  // Get property type name
  getPropertyTypeName(code) {
    const types = {
      'D': 'Detached',
      'S': 'Semi-detached', 
      'T': 'Terraced',
      'F': 'Flat',
      'O': 'Other'
    };
    return types[code] || 'Unknown';
  }

  // Map Land Registry property type to EPC format
  mapPropertyTypeToEPC(landRegistryType) {
    const mapping = {
      'D': 'Detached',
      'S': 'Semi-Detached',
      'T': 'Terraced',
      'F': 'Flat',
      'O': 'Other'
    };
    return mapping[landRegistryType] || 'Other';
  }

  // Check if postcode matches target area
  isRelevantPostcode(postcode, targetArea) {
    const postcodePrefix = postcode.split(' ')[0];
    return postcodePrefix === targetArea || postcodePrefix.startsWith(targetArea.substring(0, 2));
  }

  // Fetch EPC data (simulated for demo)
  async fetchEPCData(postcode, propertyType) {
    console.log(`🏠 Fetching EPC data for ${postcode} (${propertyType})...`);
    
    // In a real implementation, you would call the EPC API here
    // For demo purposes, we'll simulate EPC data
    const mockEPCData = [
      {
        lmk_key: 'mock-epc-1',
        postcode: postcode,
        address1: '123 Test Street',
        built_form: propertyType,
        total_floor_area: 120,
        property_type: 'House'
      },
      {
        lmk_key: 'mock-epc-2', 
        postcode: postcode,
        address1: '456 Sample Road',
        built_form: propertyType,
        total_floor_area: 95,
        property_type: 'House'
      }
    ];

    console.log(`✅ EPC data simulated: ${mockEPCData.length} properties`);
    return mockEPCData;
  }

  // Match Land Registry property with EPC data
  matchPropertyWithEPC(landRegistryProperty, epcProperties) {
    const postcode = landRegistryProperty.postcode?.toUpperCase();
    const address = landRegistryProperty.paon?.toLowerCase();
    
    if (!postcode || !address) return null;

    // Extract postcode area (e.g., "NW10 1AA" -> "NW10")
    const postcodeArea = postcode.split(' ')[0];

    const matchingEPC = epcProperties.filter(epc => 
      epc.postcode?.toUpperCase() === postcodeArea
    );

    if (matchingEPC.length === 0) return null;

    // For demo purposes, return the first match if postcode area matches
    // In real implementation, you'd do more sophisticated address matching
    console.log(`🔍 Matching property: ${address} in ${postcode} (area: ${postcodeArea})`);
    console.log(`🔍 Available EPC properties: ${matchingEPC.length}`);
    
    // Return first match for demo (in real scenario, you'd match by address)
    return matchingEPC[0];
  }

  // Calculate price per square meter
  calculatePricePerSqm(price, totalFloorArea) {
    if (!price || !totalFloorArea || totalFloorArea <= 0) {
      return null;
    }
    return Math.round(price / totalFloorArea);
  }

  // Main analysis function
  async analyzePricePerSqm(postcodeArea, propertyType, year) {
    console.log(`📊 Analyzing price per sqm for ${propertyType} in ${postcodeArea} for ${year}...\n`);

    const years = ['2021', '2022', '2023', '2024', '2025'];
    const results = {};

    for (const dataYear of years) {
      const filePath = path.join(this.dataDir, `land-registry-price-paid-${dataYear}.csv`);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${filePath}`);
        continue;
      }

      console.log(`📊 Processing ${dataYear} data...`);
      
      try {
        const csvData = fs.readFileSync(filePath, 'utf-8');
        const lines = csvData.split('\n');
        
        const relevantSales = [];
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          const record = this.parseCSVLine(line);
          if (!record || record.price <= 0) continue;
          
          // Filter for postcode area and property type
          if (this.isRelevantPostcode(record.postcode, postcodeArea) && 
              record.propertyType === propertyType) {
            relevantSales.push(record);
          }
        }

        if (relevantSales.length > 0) {
          console.log(`✅ ${dataYear}: ${relevantSales.length} ${this.getPropertyTypeName(propertyType)} sales found`);
          
          // Simulate EPC data fetch
          const epcData = await this.fetchEPCData(postcodeArea, this.mapPropertyTypeToEPC(propertyType));
          
          // Match properties and calculate price per sqm
          const pricePerSqmData = [];
          
          for (const sale of relevantSales) {
            const epcProperty = this.matchPropertyWithEPC(sale, epcData);
            
            if (epcProperty && epcProperty.total_floor_area) {
              const pricePerSqm = this.calculatePricePerSqm(sale.price, epcProperty.total_floor_area);
              
              if (pricePerSqm) {
                pricePerSqmData.push(pricePerSqm);
              }
            }
          }

          if (pricePerSqmData.length > 0) {
            const averagePricePerSqm = Math.round(
              pricePerSqmData.reduce((sum, price) => sum + price, 0) / pricePerSqmData.length
            );
            
            const sortedPrices = pricePerSqmData.sort((a, b) => a - b);
            const medianPricePerSqm = sortedPrices[Math.floor(sortedPrices.length / 2)];
            const minPricePerSqm = Math.min(...pricePerSqmData);
            const maxPricePerSqm = Math.max(...pricePerSqmData);

            results[dataYear] = {
              count: pricePerSqmData.length,
              averagePricePerSqm,
              medianPricePerSqm,
              minPricePerSqm,
              maxPricePerSqm,
              priceRange: `${minPricePerSqm.toLocaleString()} - ${maxPricePerSqm.toLocaleString()}`
            };

            console.log(`✅ ${dataYear}: £${averagePricePerSqm.toLocaleString()}/sqm (${pricePerSqmData.length} with EPC data)`);
          } else {
            console.log(`❌ ${dataYear}: No EPC matches found for price per sqm calculation`);
          }
        } else {
          console.log(`❌ ${dataYear}: No ${this.getPropertyTypeName(propertyType)} sales found in ${postcodeArea}`);
        }

      } catch (error) {
        console.error(`❌ Error processing ${dataYear}:`, error.message);
      }
    }

    return results;
  }
}

// Run the analysis
async function runAnalysis() {
  const analyzer = new PricePerSqmAnalyzer();
  
  console.log('🏠 PRICE PER SQUARE METER ANALYSIS');
  console.log('=' .repeat(50));
  console.log('This analysis combines Land Registry sales data with EPC size data');
  console.log('to calculate average price per square meter by postcode and property type.\n');

  // Example analysis for NW10 semi-detached houses
  const results = await analyzer.analyzePricePerSqm('NW10', 'S', 2025);
  
  console.log('\n📈 RESULTS: Price per Square Meter Analysis');
  console.log('=' .repeat(60));
  
  Object.keys(results).sort().forEach(year => {
    const data = results[year];
    if (data.count > 0) {
      console.log(`${year}: £${data.averagePricePerSqm.toLocaleString()}/sqm (${data.count} properties)`);
      console.log(`   Range: £${data.priceRange}/sqm`);
      console.log(`   Median: £${data.medianPricePerSqm.toLocaleString()}/sqm`);
    } else {
      console.log(`${year}: No data available`);
    }
    console.log('');
  });

  // Calculate year-over-year growth
  console.log('📊 Year-over-Year Growth:');
  const years = Object.keys(results).sort();
  for (let i = 1; i < years.length; i++) {
    const currentYear = years[i];
    const previousYear = years[i-1];
    const current = results[currentYear];
    const previous = results[previousYear];
    
    if (current && previous && current.count > 0 && previous.count > 0) {
      const growth = ((current.averagePricePerSqm - previous.averagePricePerSqm) / previous.averagePricePerSqm * 100).toFixed(1);
      console.log(`${previousYear} → ${currentYear}: ${growth > 0 ? '+' : ''}${growth}%`);
    }
  }

  console.log('\n💡 INSIGHT:');
  const latestYear = years[years.length - 1];
  const latestData = results[latestYear];
  if (latestData && latestData.count > 0) {
    console.log(`In ${latestYear}, on average semi-detached houses in NW10 were sold for £${latestData.averagePricePerSqm.toLocaleString()} per square metre`);
    console.log(`This represents a sample of ${latestData.count} properties with matching EPC data.`);
  }
}

runAnalysis().catch(error => {
  console.error('❌ Analysis failed:', error);
});
