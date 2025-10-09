// upload-to-supabase.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

// UPDATE THESE WITH YOUR ACTUAL VALUES FROM SUPABASE
const SUPABASE_URL = 'https://ybnwoiumffktqaxeldzi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibndvaXVtZmZrdHFheGVsZHppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMjI3NDIsImV4cCI6MjA3NTU5ODc0Mn0.7XoWEWLVsnReNvNzrFURfUAWVoFC1QxuFJ0DkHtScAU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function uploadCSV(filePath, year) {
  console.log(`📁 Processing ${year} data from ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return 0;
  }

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let batch = [];
  let totalRecords = 0;
  const BATCH_SIZE = 500; // Upload in batches

  for await (const line of rl) {
    if (!line.trim()) continue;
    
    const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    if (!parts || parts.length < 15) continue;

    const record = {
      transaction_id: parts[0]?.replace(/"/g, ''),
      price: parseInt(parts[1]?.replace(/"/g, '')) || 0,
      date_of_transfer: parts[2]?.replace(/"/g, ''),
      postcode: parts[3]?.replace(/"/g, ''),
      property_type: parts[4]?.replace(/"/g, ''),
      paon: parts[7]?.replace(/"/g, ''),
      saon: parts[8]?.replace(/"/g, ''),
      street: parts[9]?.replace(/"/g, ''),
      town_city: parts[11]?.replace(/"/g, ''),
      district: parts[12]?.replace(/"/g, ''),
      county: parts[13]?.replace(/"/g, '')
    };

    // Only include Sheffield area (S postcodes) to reduce data size
    if (record.postcode && record.postcode.startsWith('S')) {
      batch.push(record);
    }

    if (batch.length >= BATCH_SIZE) {
      const { error } = await supabase
        .from('land_registry')
        .insert(batch);
      
      if (error) {
        console.error('Upload error:', error);
      } else {
        totalRecords += batch.length;
        console.log(`  ✓ Uploaded ${totalRecords} records...`);
      }
      batch = [];
    }
  }

  // Upload remaining records
  if (batch.length > 0) {
    const { error } = await supabase
      .from('land_registry')
      .insert(batch);
    
    if (error) {
      console.error('Final batch upload error:', error);
    } else {
      totalRecords += batch.length;
    }
  }

  console.log(`✅ Completed ${year}: ${totalRecords} Sheffield records uploaded`);
  return totalRecords;
}

async function main() {
  console.log('🚀 Starting Land Registry data upload to Supabase...\n');
  
  // Check if credentials are set
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_ANON_KEY') {
    console.error('❌ ERROR: Please update SUPABASE_URL and SUPABASE_ANON_KEY with your actual values!');
    console.error('   Get these from Supabase Dashboard → Settings → API');
    return;
  }

  const years = [2021, 2022, 2023, 2024, 2025];
  let totalUploaded = 0;
  
  for (const year of years) {
    const csvPath = path.join(__dirname, 'data', `land-registry-price-paid-${year}.csv`);
    const count = await uploadCSV(csvPath, year);
    totalUploaded += count;
  }
  
  console.log(`\n✅ Upload complete! Total Sheffield records: ${totalUploaded}`);
  console.log('📊 Your Land Registry data is now in Supabase!');
  console.log('🎉 Your app at homelens.co will now have working Land Registry features!');
}

// Run the upload
main().catch(console.error);