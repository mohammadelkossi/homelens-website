// Test script to manually calculate 12-month average sold price
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const TARGET_POSTCODE = 'S10';  // Looking for properties starting with S10
const TARGET_PROPERTY_TYPE = 'S';  // S = Semi-Detached
const DATA_PATH = path.join(__dirname, 'data');

console.log('🔍 Testing 12-month average sold price calculation');
console.log(`📍 Target: ${TARGET_POSTCODE} postcodes, ${TARGET_PROPERTY_TYPE} (Semi-Detached) properties`);
console.log(`📁 Data path: ${DATA_PATH}\n`);

// Helper: Normalize postcode (remove spaces, uppercase)
function normalizePostcode(postcode) {
  return postcode.replace(/\s/g, '').toUpperCase();
}

// Helper: Check if postcode matches (starts with target)
function matchesPostcode(target, recordPostcode) {
  const normalizedTarget = normalizePostcode(target);
  const normalizedRecord = normalizePostcode(recordPostcode);
  return normalizedRecord.startsWith(normalizedTarget);
}

// Helper: Check if date is within past 12 months
function isWithinPast12Months(dateString) {
  try {
    const datePart = dateString.split(' ')[0];
    const recordDate = new Date(datePart);
    const today = new Date();
    const twelveMonthsAgo = new Date(today);
    twelveMonthsAgo.setFullYear(today.getFullYear() - 1);
    
    return recordDate >= twelveMonthsAgo && recordDate <= today;
  } catch (error) {
    return false;
  }
}

// Helper: Parse CSV line
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
      street: parts[7].replace(/"/g, ''),
      townCity: parts[10].replace(/"/g, '')
    };
  } catch (error) {
    return null;
  }
}

// Main processing
const years = [2024, 2025];
const allMatchingPrices = [];
let totalRecordsProcessed = 0;

for (const year of years) {
  const filePath = path.join(DATA_PATH, `land-registry-price-paid-${year}.csv`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ File not found: ${filePath}`);
    continue;
  }
  
  console.log(`\n📂 Processing ${year} data...`);
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n');
  
  console.log(`   Total lines in file: ${lines.length}`);
  
  // Sample first 5 records to see data structure
  console.log(`   Sample records:`);
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const record = parseCSVLine(lines[i]);
    if (record) {
      console.log(`   - ${record.postcode} | ${record.propertyType} | £${record.price.toLocaleString()} | ${record.dateOfTransfer} | ${record.street}`);
    }
  }
  
  let yearMatches = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    totalRecordsProcessed++;
    const record = parseCSVLine(line);
    
    if (!record || record.price === 0) continue;
    
    // Check all conditions
    const postcodeMatch = matchesPostcode(TARGET_POSTCODE, record.postcode);
    const typeMatch = record.propertyType === TARGET_PROPERTY_TYPE;
    const dateMatch = isWithinPast12Months(record.dateOfTransfer);
    
    // Debug first 3 matches
    if (postcodeMatch && typeMatch && dateMatch && yearMatches < 3) {
      console.log(`   ✅ Match #${yearMatches + 1}: ${record.postcode} | ${record.propertyType} | £${record.price.toLocaleString()} | ${record.dateOfTransfer} | ${record.street}, ${record.townCity}`);
    }
    
    if (postcodeMatch && typeMatch && dateMatch) {
      allMatchingPrices.push(record.price);
      yearMatches++;
    }
  }
  
  console.log(`   📊 Found ${yearMatches} matching records in ${year}`);
}

// Calculate results
console.log(`\n═══════════════════════════════════════`);
console.log(`📊 RESULTS`);
console.log(`═══════════════════════════════════════`);
console.log(`Total records processed: ${totalRecordsProcessed.toLocaleString()}`);
console.log(`Matching properties found: ${allMatchingPrices.length}`);

if (allMatchingPrices.length > 0) {
  const averagePrice = allMatchingPrices.reduce((sum, price) => sum + price, 0) / allMatchingPrices.length;
  const minPrice = Math.min(...allMatchingPrices);
  const maxPrice = Math.max(...allMatchingPrices);
  
  console.log(`\nPrice Statistics:`);
  console.log(`  Average: £${Math.round(averagePrice).toLocaleString()}`);
  console.log(`  Minimum: £${minPrice.toLocaleString()}`);
  console.log(`  Maximum: £${maxPrice.toLocaleString()}`);
  console.log(`\nSample prices (first 10):`);
  allMatchingPrices.slice(0, 10).forEach((price, i) => {
    console.log(`  ${i + 1}. £${price.toLocaleString()}`);
  });
} else {
  console.log(`❌ No matching properties found!`);
  console.log(`\nDebugging tips:`);
  console.log(`1. Check if data files exist in: ${DATA_PATH}`);
  console.log(`2. Verify postcode format in CSV (should be like "S10 5PR")`);
  console.log(`3. Verify property type code (S = Semi-Detached)`);
  console.log(`4. Check date range (past 12 months from today)`);
}

console.log(`═══════════════════════════════════════\n`);


