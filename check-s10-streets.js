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

// Function to check if sale is from 2022 onwards
function isFrom2022Onwards(dateString) {
  const saleDate = new Date(dateString);
  return saleDate.getFullYear() >= 2022;
}

// Main analysis function
async function checkS10Streets() {
  const dataDir = path.join(__dirname, 'data');
  const years = ['2022', '2023', '2024', '2025'];
  const allS10Sales = [];
  const streetCounts = {};

  console.log('🔍 Checking all S10 sales since 2022 to find Crimicar Avenue or similar streets...\n');

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
        
        // Filter for S10 postcode and from 2022 onwards
        if (isS10Postcode(record.postcode) && isFrom2022Onwards(record.dateOfTransfer)) {
          allS10Sales.push(record);
          
          // Count streets
          const street = record.street?.toLowerCase() || '';
          if (street) {
            streetCounts[street] = (streetCounts[street] || 0) + 1;
          }
        }
      }

      console.log(`✅ ${year}: Found ${allS10Sales.filter(s => new Date(s.dateOfTransfer).getFullYear() == year).length} S10 sales`);

    } catch (error) {
      console.error(`❌ Error processing ${year}:`, error.message);
    }
  }

  console.log(`\n📊 Total S10 sales since 2022: ${allS10Sales.length}`);

  // Look for Crimicar Avenue specifically
  const crimicarSales = allS10Sales.filter(sale => {
    const street = sale.street?.toLowerCase() || '';
    const address = sale.paon?.toLowerCase() || '';
    return street.includes('crimicar') || address.includes('crimicar');
  });

  console.log(`\n🏠 Crimicar Avenue sales: ${crimicarSales.length}`);
  
  if (crimicarSales.length > 0) {
    console.log('\n📋 Crimicar Avenue Sales:');
    crimicarSales.forEach((sale, index) => {
      const saleDate = new Date(sale.dateOfTransfer);
      console.log(`${index + 1}. £${sale.price.toLocaleString()} - ${sale.paon} ${sale.street}, ${sale.postcode} (${getPropertyTypeName(sale.propertyType)}) - ${saleDate.toLocaleDateString()}`);
    });
  }

  // Show top streets in S10
  console.log('\n📈 Top 20 Streets in S10 (since 2022):');
  const sortedStreets = Object.entries(streetCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 20);
  
  sortedStreets.forEach(([street, count], index) => {
    console.log(`${index + 1}. ${street}: ${count} sales`);
  });

  // Look for similar street names
  console.log('\n🔍 Streets containing "crimicar" or similar:');
  const similarStreets = Object.keys(streetCounts).filter(street => 
    street.includes('crimicar') || 
    street.includes('crimicar') ||
    street.includes('crimicar')
  );
  
  if (similarStreets.length > 0) {
    similarStreets.forEach(street => {
      console.log(`- ${street}: ${streetCounts[street]} sales`);
    });
  } else {
    console.log('No streets found containing "crimicar"');
  }

  // Show semi-detached sales in S10
  const semiDetachedS10 = allS10Sales.filter(sale => sale.propertyType === 'S');
  console.log(`\n🏠 Semi-detached houses in S10 since 2022: ${semiDetachedS10.length} sales`);
  
  if (semiDetachedS10.length > 0) {
    const prices = semiDetachedS10.map(s => s.price);
    const averagePrice = Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    console.log(`Average price: £${averagePrice.toLocaleString()}`);
    console.log(`Price range: £${minPrice.toLocaleString()} - £${maxPrice.toLocaleString()}`);
    
    // Show some examples
    console.log('\n📋 Sample Semi-detached Sales in S10:');
    semiDetachedS10.slice(0, 10).forEach((sale, index) => {
      const saleDate = new Date(sale.dateOfTransfer);
      console.log(`${index + 1}. £${sale.price.toLocaleString()} - ${sale.paon} ${sale.street}, ${sale.postcode} - ${saleDate.toLocaleDateString()}`);
    });
  }
}

// Run the analysis
checkS10Streets().catch(error => {
  console.error('❌ Analysis failed:', error);
});

