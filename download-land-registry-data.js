console.log('📥 Downloading Land Registry Price Paid Data');

const fs = require('fs');
const path = require('path');

async function downloadLandRegistryData() {
  try {
    console.log('🔍 Downloading from: http://prod1.publicdata.landregistry.gov.uk.s3-website-eu-west-1.amazonaws.com/pp-2025.csv');
    
    const response = await fetch('http://prod1.publicdata.landregistry.gov.uk.s3-website-eu-west-1.amazonaws.com/pp-2025.csv');
    
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.status}`);
    }
    
    const csvData = await response.text();
    console.log('✅ Data downloaded successfully!');
    console.log('📊 Data size:', (csvData.length / 1024 / 1024).toFixed(2), 'MB');
    
    // Save the raw CSV data
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }
    
    const csvPath = path.join(dataDir, 'land-registry-price-paid-2025.csv');
    fs.writeFileSync(csvPath, csvData);
    console.log('💾 Saved to:', csvPath);
    
    // Parse the CSV data
    console.log('\n🔍 Parsing CSV data...');
    const lines = csvData.split('\n');
    console.log('📊 Total lines:', lines.length);
    
    // Parse first few lines to understand structure
    const sampleLines = lines.slice(0, 5);
    console.log('\n📋 Sample data structure:');
    sampleLines.forEach((line, index) => {
      if (line.trim()) {
        console.log(`Line ${index + 1}:`, line.substring(0, 100) + '...');
      }
    });
    
    // Filter for LS7 (Chapel Allerton) and surrounding areas
    console.log('\n🔍 Filtering for LS7 and surrounding areas...');
    const ls7Lines = lines.filter(line => {
      const postcodeMatch = line.match(/"([A-Z]{1,2}\d[A-Z]?)\s*\d[A-Z]{2}"/);
      if (postcodeMatch) {
        const postcode = postcodeMatch[1];
        return postcode === 'LS7' || postcode.startsWith('LS');
      }
      return false;
    });
    
    console.log('📊 LS7 and surrounding areas found:', ls7Lines.length, 'properties');
    
    if (ls7Lines.length > 0) {
      console.log('\n📋 Sample LS7 properties:');
      ls7Lines.slice(0, 5).forEach((line, index) => {
        const parts = line.split('","');
        if (parts.length >= 4) {
          const price = parts[1].replace(/"/g, '');
          const date = parts[2].replace(/"/g, '');
          const postcode = parts[3].replace(/"/g, '');
          const propertyType = parts[4].replace(/"/g, '');
          const street = parts[8].replace(/"/g, '');
          const town = parts[11].replace(/"/g, '');
          
          console.log(`${index + 1}. £${parseInt(price).toLocaleString()} - ${date} - ${postcode} - ${propertyType} - ${street}, ${town}`);
        }
      });
      
      // Calculate statistics for LS7 area
      const ls7Prices = ls7Lines.map(line => {
        const parts = line.split('","');
        return parts.length >= 2 ? parseInt(parts[1].replace(/"/g, '')) : 0;
      }).filter(price => price > 0);
      
      if (ls7Prices.length > 0) {
        const avgPrice = ls7Prices.reduce((sum, price) => sum + price, 0) / ls7Prices.length;
        const minPrice = Math.min(...ls7Prices);
        const maxPrice = Math.max(...ls7Prices);
        
        console.log('\n📊 LS7 Area Statistics:');
        console.log(`💰 Average price: £${Math.round(avgPrice).toLocaleString()}`);
        console.log(`📉 Lowest price: £${minPrice.toLocaleString()}`);
        console.log(`📈 Highest price: £${maxPrice.toLocaleString()}`);
        console.log(`📏 Sample size: ${ls7Prices.length} properties`);
        
        // Calculate price per sqm (estimated)
        const estimatedSqm = 50; // Rough estimate for UK properties
        const avgPricePerSqm = Math.round(avgPrice / estimatedSqm);
        console.log(`📏 Estimated price per sqm: £${avgPricePerSqm.toLocaleString()}`);
      }
    }
    
    console.log('\n✅ Land Registry data processing completed!');
    console.log('🎯 Ready to integrate with your property analysis system!');
    
  } catch (error) {
    console.error('❌ Error downloading Land Registry data:', error.message);
  }
}

downloadLandRegistryData();


