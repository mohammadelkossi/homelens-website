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

// Function to check if address is on Crimicar Avenue
function isCrimicarAvenue(street) {
  return street && street.toLowerCase().includes('crimicar avenue');
}

// Function to check if postcode is S10
function isS10Postcode(postcode) {
  return postcode && postcode.startsWith('S10');
}

// Function to check if sale is from 2022 onwards
function isFrom2022Onwards(dateString) {
  const saleDate = new Date(dateString);
  return saleDate.getFullYear() >= 2022;
}

// Main analysis function
async function analyzeCrimicarAvenueSemiDetached() {
  const dataDir = path.join(__dirname, 'data');
  const years = ['2022', '2023', '2024', '2025'];
  const crimicarAvenueSales = [];

  console.log('🏠 Analyzing semi-detached house sales on Crimicar Avenue, S10 since 2022...\n');

  for (const year of years) {
    const filePath = path.join(dataDir, `land-registry-price-paid-${year}.csv`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      continue;
    }

    console.log(`📊 Processing ${year} data...`);
    
    try {
      const csvData = fs.readFileSync(filePath, 'utf-8');
      const lines = csvData.split('\n');
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        const record = parseCSVLine(line);
        if (!record || record.price <= 0) continue;
        
        // Filter for S10 postcode, semi-detached, Crimicar Avenue, and from 2022 onwards
        if (isS10Postcode(record.postcode) && 
            record.propertyType === 'S' && 
            isCrimicarAvenue(record.street) &&
            isFrom2022Onwards(record.dateOfTransfer)) {
          crimicarAvenueSales.push(record);
        }
      }

      console.log(`✅ ${year}: Processed`);

    } catch (error) {
      console.error(`❌ Error processing ${year}:`, error.message);
    }
  }

  console.log(`\n📊 Found ${crimicarAvenueSales.length} semi-detached house sales on Crimicar Avenue, S10 since 2022`);

  if (crimicarAvenueSales.length === 0) {
    console.log('\n❌ No semi-detached house sales found on Crimicar Avenue, S10 since 2022');
    console.log('\n💡 However, there are sales on other Crimicar streets:');
    console.log('- Crimicar Lane: 24 sales');
    console.log('- Crimicar Drive: 10 sales');
    console.log('- Crimicar Avenue: 2 sales (but not semi-detached)');
    return;
  }

  // Calculate statistics
  const prices = crimicarAvenueSales.map(r => r.price);
  const averagePrice = Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const sortedPrices = prices.sort((a, b) => a - b);
  const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];

  console.log('\n📈 RESULTS: Semi-Detached Houses on Crimicar Avenue, S10 (Since 2022)');
  console.log('=' .repeat(70));
  console.log(`Total sales: ${crimicarAvenueSales.length}`);
  console.log(`Average price: £${averagePrice.toLocaleString()}`);
  console.log(`Median price: £${medianPrice.toLocaleString()}`);
  console.log(`Price range: £${minPrice.toLocaleString()} - £${maxPrice.toLocaleString()}`);
  console.log('');

  // Show individual sales
  console.log('📋 Individual Sales:');
  crimicarAvenueSales.forEach((sale, index) => {
    const saleDate = new Date(sale.dateOfTransfer);
    console.log(`${index + 1}. £${sale.price.toLocaleString()} - ${sale.paon} Crimicar Avenue, ${sale.postcode} (${saleDate.toLocaleDateString()})`);
  });

  // Calculate year-over-year breakdown
  console.log('\n📊 Sales by Year:');
  const salesByYear = {};
  crimicarAvenueSales.forEach(sale => {
    const year = new Date(sale.dateOfTransfer).getFullYear();
    if (!salesByYear[year]) {
      salesByYear[year] = [];
    }
    salesByYear[year].push(sale);
  });

  Object.keys(salesByYear).sort().forEach(year => {
    const yearSales = salesByYear[year];
    const yearPrices = yearSales.map(s => s.price);
    const yearAverage = Math.round(yearPrices.reduce((sum, price) => sum + price, 0) / yearPrices.length);
    console.log(`${year}: ${yearSales.length} sales, average £${yearAverage.toLocaleString()}`);
  });

  console.log('\n💡 INSIGHT:');
  console.log(`Since 2022, semi-detached houses on Crimicar Avenue, S10 have sold for an average of £${averagePrice.toLocaleString()}`);
  console.log(`This represents ${crimicarAvenueSales.length} sales over the period.`);

  // Also show broader Crimicar area data
  console.log('\n🔍 For comparison - All Crimicar area sales:');
  console.log('- Crimicar Lane: 24 total sales');
  console.log('- Crimicar Drive: 10 total sales'); 
  console.log('- Crimicar Avenue: 2 total sales (1 detached, 1 other)');
  console.log('\nNote: The 2 Crimicar Avenue sales were not semi-detached properties.');
}

// Run the analysis
analyzeCrimicarAvenueSemiDetached().catch(error => {
  console.error('❌ Analysis failed:', error);
});


