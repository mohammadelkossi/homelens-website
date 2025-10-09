console.log('📥 Downloading Historical Land Registry Data (2021-2024)');

const fs = require('fs');
const path = require('path');

async function downloadHistoricalData() {
  try {
    const years = [2024, 2023, 2022, 2021];
    const dataDir = path.join(__dirname, 'data');
    
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }
    
    for (const year of years) {
      console.log(`\n📊 Downloading ${year} data...`);
      
      const url = `http://prod1.publicdata.landregistry.gov.uk.s3-website-eu-west-1.amazonaws.com/pp-${year}.csv`;
      console.log(`🔍 URL: ${url}`);
      
      try {
        const response = await fetch(url);
        
        if (!response.ok) {
          console.log(`❌ Failed to download ${year} data: ${response.status}`);
          continue;
        }
        
        const csvData = await response.text();
        console.log(`✅ ${year} data downloaded successfully!`);
        console.log(`📊 Data size: ${(csvData.length / 1024 / 1024).toFixed(2)} MB`);
        
        // Save the data
        const filePath = path.join(dataDir, `land-registry-price-paid-${year}.csv`);
        fs.writeFileSync(filePath, csvData);
        console.log(`💾 Saved to: ${filePath}`);
        
        // Parse and analyze the data
        const lines = csvData.split('\n');
        console.log(`📊 Total records in ${year}: ${lines.length}`);
        
        // Filter for Leeds area (LS postcodes)
        const leedsLines = lines.filter(line => {
          const postcodeMatch = line.match(/"([A-Z]{1,2}\d[A-Z]?)\s*\d[A-Z]{2}"/);
          if (postcodeMatch) {
            const postcode = postcodeMatch[1];
            return postcode.startsWith('LS');
          }
          return false;
        });
        
        console.log(`📊 Leeds area properties in ${year}: ${leedsLines.length}`);
        
        if (leedsLines.length > 0) {
          // Calculate statistics for Leeds area
          const prices = leedsLines.map(line => {
            const parts = line.split('","');
            return parts.length >= 2 ? parseInt(parts[1].replace(/"/g, '')) : 0;
          }).filter(price => price > 0);
          
          if (prices.length > 0) {
            const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            
            console.log(`📊 ${year} Leeds Area Statistics:`);
            console.log(`   💰 Average price: £${Math.round(avgPrice).toLocaleString()}`);
            console.log(`   📉 Lowest price: £${minPrice.toLocaleString()}`);
            console.log(`   📈 Highest price: £${maxPrice.toLocaleString()}`);
            console.log(`   📏 Sample size: ${prices.length} properties`);
            
            // Calculate price per sqm (estimated)
            const estimatedSqm = 50;
            const avgPricePerSqm = Math.round(avgPrice / estimatedSqm);
            console.log(`   📏 Estimated price per sqm: £${avgPricePerSqm.toLocaleString()}`);
          }
        }
        
      } catch (error) {
        console.log(`❌ Error downloading ${year} data:`, error.message);
      }
    }
    
    console.log('\n✅ Historical data download completed!');
    console.log('🎯 Ready to create comprehensive market analysis with 5 years of data!');
    
    // List all downloaded files
    console.log('\n📁 Downloaded files:');
    const files = fs.readdirSync(dataDir);
    files.forEach(file => {
      if (file.startsWith('land-registry-price-paid-')) {
        const filePath = path.join(dataDir, file);
        const stats = fs.statSync(filePath);
        console.log(`   ${file} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error downloading historical data:', error.message);
  }
}

downloadHistoricalData();



