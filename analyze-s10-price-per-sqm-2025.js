const fs = require('fs');
const path = require('path');

// Function to parse CSV line and extract relevant data
function parseCSVLine(line) {
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

// Function to get property type name
function getPropertyTypeName(code) {
  const types = {
    'D': 'Detached',
    'S': 'Semi-detached', 
    'T': 'Terraced',
    'F': 'Flat',
    'O': 'Other'
  };
  return types[code] || 'Unknown';
}

// Function to check if postcode is S10
function isS10Postcode(postcode) {
  return postcode && postcode.startsWith('S10');
}

// Function to check if sale is from 2025
function isFrom2025(dateString) {
  const saleDate = new Date(dateString);
  return saleDate.getFullYear() === 2025;
}

// Function to fetch EPC data for a property
async function fetchEPCDataForProperty(address, postcode) {
  const apiKey = 'e4f4035c1f31d4d3cde622673f50f84279213f42';
  const email = 'mohammad.elkossi@gmail.com';
  
  try {
    // Build query parameters
    const params = new URLSearchParams({
      postcode: postcode,
      size: '50',
      from: '0'
    });

    const url = `https://epc.opendatacommunities.org/api/v1/domestic/search?${params.toString()}`;
    
    // Use HTTP Basic Auth with email:apiKey format
    const authString = Buffer.from(`${email}:${apiKey}`).toString('base64');
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Basic ${authString}`,
        'User-Agent': 'HomeLens-Property-Analysis/1.0'
      }
    });

    if (!response.ok) {
      console.log(`❌ EPC API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    
    if (!data.rows || data.rows.length === 0) {
      return null;
    }

    // Find matching property by address similarity
    const matchingProperty = data.rows.find(epc => {
      const epcAddress = epc.address?.toLowerCase() || '';
      const landRegistryAddress = address?.toLowerCase() || '';
      
      // Simple address matching - look for street name or number
      return epcAddress.includes(landRegistryAddress.split(' ')[0]) || 
             landRegistryAddress.includes(epcAddress.split(' ')[0]);
    });

    if (matchingProperty) {
      return {
        total_floor_area: parseFloat(matchingProperty['total-floor-area']) || 0,
        built_form: matchingProperty['built-form'],
        energy_rating: matchingProperty['current-energy-rating'],
        address: matchingProperty.address,
        postcode: matchingProperty.postcode
      };
    }

    return null;
  } catch (error) {
    console.error('EPC API error:', error.message);
    return null;
  }
}

// Main analysis function
async function analyzeS10PricePerSqm2025() {
  const dataDir = path.join(__dirname, 'data');
  const filePath = path.join(dataDir, 'land-registry-price-paid-2025.csv');
  
  if (!fs.existsSync(filePath)) {
    console.log('❌ 2025 Land Registry data not found');
    return;
  }

  console.log('🏠 Analyzing S10 semi-detached house sales in 2025...\n');
  console.log('📊 Step 1: Finding semi-detached sales in S10 for 2025...\n');

  try {
    const csvData = fs.readFileSync(filePath, 'utf-8');
    const lines = csvData.split('\n');
    
    const s10SemiDetachedSales = [];
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const record = parseCSVLine(line);
      if (!record || record.price <= 0) continue;
      
      // Filter for S10 postcode, semi-detached, and 2025
      if (isS10Postcode(record.postcode) && 
          record.propertyType === 'S' && 
          isFrom2025(record.dateOfTransfer)) {
        s10SemiDetachedSales.push(record);
      }
    }

    console.log(`✅ Found ${s10SemiDetachedSales.length} semi-detached house sales in S10 for 2025`);
    
    if (s10SemiDetachedSales.length === 0) {
      console.log('❌ No semi-detached house sales found in S10 for 2025');
      return;
    }

    // Show the sales
    console.log('\n📋 Semi-Detached Sales in S10 (2025):');
    s10SemiDetachedSales.forEach((sale, index) => {
      const saleDate = new Date(sale.dateOfTransfer);
      console.log(`${index + 1}. £${sale.price.toLocaleString()} - ${sale.paon} ${sale.street}, ${sale.postcode} (${saleDate.toLocaleDateString()})`);
    });

    console.log('\n📊 Step 2: Fetching EPC data for property sizes...\n');

    const propertiesWithEPC = [];
    let processedCount = 0;

    for (const sale of s10SemiDetachedSales) {
      processedCount++;
      console.log(`🔍 Processing ${processedCount}/${s10SemiDetachedSales.length}: ${sale.paon} ${sale.street}`);
      
      const epcData = await fetchEPCDataForProperty(sale.paon, sale.postcode);
      
      if (epcData && epcData.total_floor_area > 0) {
        const pricePerSqm = Math.round(sale.price / epcData.total_floor_area);
        propertiesWithEPC.push({
          ...sale,
          epcData,
          pricePerSqm
        });
        console.log(`✅ Found EPC data: ${epcData.total_floor_area} sqm, £${pricePerSqm}/sqm`);
      } else {
        console.log(`❌ No EPC data found for ${sale.paon} ${sale.street}`);
      }
      
      // Add small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n📊 Step 3: Calculating average price per square meter...\n`);

    if (propertiesWithEPC.length === 0) {
      console.log('❌ No properties found with EPC data');
      return;
    }

    // Calculate statistics
    const pricesPerSqm = propertiesWithEPC.map(p => p.pricePerSqm);
    const averagePricePerSqm = Math.round(pricesPerSqm.reduce((sum, price) => sum + price, 0) / pricesPerSqm.length);
    const minPricePerSqm = Math.min(...pricesPerSqm);
    const maxPricePerSqm = Math.max(...pricesPerSqm);
    const sortedPrices = pricesPerSqm.sort((a, b) => a - b);
    const medianPricePerSqm = sortedPrices[Math.floor(sortedPrices.length / 2)];

    console.log('📈 RESULTS: Semi-Detached Houses in S10 (2025)');
    console.log('=' .repeat(60));
    console.log(`Total sales with EPC data: ${propertiesWithEPC.length}`);
    console.log(`Average price per sqm: £${averagePricePerSqm.toLocaleString()}`);
    console.log(`Median price per sqm: £${medianPricePerSqm.toLocaleString()}`);
    console.log(`Price per sqm range: £${minPricePerSqm.toLocaleString()} - £${maxPricePerSqm.toLocaleString()}`);
    console.log('');

    // Show individual properties with EPC data
    console.log('📋 Properties with EPC Data:');
    propertiesWithEPC.forEach((property, index) => {
      const saleDate = new Date(property.dateOfTransfer);
      console.log(`${index + 1}. £${property.price.toLocaleString()} - ${property.paon} ${property.street}`);
      console.log(`   Floor Area: ${property.epcData.total_floor_area} sqm`);
      console.log(`   Price per sqm: £${property.pricePerSqm.toLocaleString()}`);
      console.log(`   Energy Rating: ${property.epcData.energy_rating}`);
      console.log(`   Sale Date: ${saleDate.toLocaleDateString()}`);
      console.log('');
    });

    console.log('💡 INSIGHT:');
    console.log(`In 2025, on average semi-detached houses in S10 were sold for £${averagePricePerSqm.toLocaleString()} per square metre`);
    console.log(`This analysis is based on ${propertiesWithEPC.length} properties with available EPC data.`);

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

// Run the analysis
analyzeS10PricePerSqm2025().catch(error => {
  console.error('❌ Analysis failed:', error);
});

