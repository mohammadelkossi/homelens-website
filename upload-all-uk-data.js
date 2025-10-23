const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Data directory
const dataDir = './data';

// Years to process
const years = ['2021', '2022', '2023', '2024', '2025'];

// Function to process a single CSV file
async function processCSVFile(filePath, year) {
  return new Promise((resolve, reject) => {
    const records = [];
    let processedCount = 0;
    let errorCount = 0;

    console.log(`📁 Processing ${filePath}...`);

    fs.createReadStream(filePath)
      .pipe(csv({ headers: false }))
      .on('data', (row) => {
        try {
          // Map columns by position (based on Land Registry format)
          // Column order: transaction_id, price, date_of_transfer, postcode, property_type, 
          // old_new, duration, paon, saon, street, locality, town_city, district, county, 
          // ppd_category_type, record_status
          const record = {
            transaction_id: row['0'] || null,
            price: row['1'] ? parseInt(row['1'].replace(/[^0-9]/g, '')) : null,
            date_of_transfer: row['2'] || null,
            postcode: row['3'] || null,
            property_type: row['4'] || null,
            paon: row['7'] || null,
            saon: row['8'] || null,
            street: row['9'] || null,
            town_city: row['11'] || null,
            district: row['12'] || null,
            county: row['13'] || null,
            created_at: new Date().toISOString()
          };

          // Only add records with valid data
          if (record.price && record.date_of_transfer && record.postcode) {
            records.push(record);
          }

          processedCount++;

          // Log progress every 50,000 records
          if (processedCount % 50000 === 0) {
            console.log(`  📊 Processed ${processedCount} records from ${year}...`);
          }
        } catch (error) {
          errorCount++;
          if (errorCount % 1000 === 0) {
            console.log(`  ⚠️  ${errorCount} errors so far in ${year}`);
          }
        }
      })
      .on('end', () => {
        console.log(`✅ Completed ${filePath}`);
        console.log(`  📊 Total processed: ${processedCount}`);
        console.log(`  ✅ Valid records: ${records.length}`);
        console.log(`  ❌ Errors: ${errorCount}`);
        resolve(records);
      })
      .on('error', (error) => {
        console.log(`❌ Error processing ${filePath}:`, error.message);
        reject(error);
      });
  });
}

// Function to upload records in batches
async function uploadRecords(records, year) {
  const batchSize = 1000;
  const totalBatches = Math.ceil(records.length / batchSize);
  let uploadedCount = 0;
  let errorCount = 0;

  console.log(`📤 Uploading ${records.length} records from ${year} in ${totalBatches} batches...`);

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;

    try {
      const { error } = await supabase
        .from('land_registry')
        .insert(batch);

      if (error) {
        console.log(`❌ Batch ${batchNumber} failed:`, error.message);
        errorCount += batch.length;
      } else {
        uploadedCount += batch.length;
      }

      // Log progress every 10 batches
      if (batchNumber % 10 === 0) {
        console.log(`  📊 Batch ${batchNumber}/${totalBatches} - ${uploadedCount} uploaded, ${errorCount} errors`);
      }

      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.log(`❌ Batch ${batchNumber} error:`, error.message);
      errorCount += batch.length;
    }
  }

  console.log(`✅ ${year} upload complete: ${uploadedCount} uploaded, ${errorCount} errors`);
  return { uploadedCount, errorCount };
}

// Main function
async function uploadAllUKData() {
  console.log('🚀 Starting UK Land Registry data upload...');
  console.log(`📅 Processing years: ${years.join(', ')}`);
  console.log(`🗄️  Database: ${supabaseUrl}`);

  let totalRecords = 0;
  let totalUploaded = 0;
  let totalErrors = 0;

  for (const year of years) {
    const filePath = path.join(dataDir, `land-registry-price-paid-${year}.csv`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      continue;
    }

    try {
      // Process the CSV file
      const records = await processCSVFile(filePath, year);
      totalRecords += records.length;

      if (records.length > 0) {
        // Upload the records
        const { uploadedCount, errorCount } = await uploadRecords(records, year);
        totalUploaded += uploadedCount;
        totalErrors += errorCount;
      }

      console.log(`\n📊 ${year} Summary:`);
      console.log(`  📁 Records processed: ${records.length}`);
      console.log(`  📤 Records uploaded: ${totalUploaded}`);
      console.log(`  ❌ Errors: ${totalErrors}`);

    } catch (error) {
      console.log(`❌ Failed to process ${year}:`, error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');
  }

  console.log('🎉 UK Land Registry upload complete!');
  console.log(`📊 Total records processed: ${totalRecords}`);
  console.log(`📤 Total records uploaded: ${totalUploaded}`);
  console.log(`❌ Total errors: ${totalErrors}`);
  console.log(`✅ Success rate: ${((totalUploaded / totalRecords) * 100).toFixed(2)}%`);
}

// Run the upload
uploadAllUKData().catch(console.error);
