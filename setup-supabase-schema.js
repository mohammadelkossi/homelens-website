// setup-supabase-schema.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createLandRegistryTable() {
  console.log('🔧 Creating land_registry table...');
  
  // SQL to create the land_registry table
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS land_registry (
      id BIGSERIAL PRIMARY KEY,
      transaction_id TEXT,
      price INTEGER,
      date_of_transfer DATE,
      postcode TEXT,
      property_type TEXT,
      paon TEXT,
      saon TEXT,
      street TEXT,
      town_city TEXT,
      district TEXT,
      county TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    
    if (error) {
      console.error('❌ Error creating table:', error);
      return false;
    }
    
    console.log('✅ land_registry table created successfully');
    return true;
  } catch (err) {
    console.error('❌ Error executing SQL:', err.message);
    return false;
  }
}

async function createIndexes() {
  console.log('🔧 Creating indexes for better performance...');
  
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_land_registry_postcode ON land_registry(postcode);',
    'CREATE INDEX IF NOT EXISTS idx_land_registry_street ON land_registry(street);',
    'CREATE INDEX IF NOT EXISTS idx_land_registry_property_type ON land_registry(property_type);',
    'CREATE INDEX IF NOT EXISTS idx_land_registry_date ON land_registry(date_of_transfer);'
  ];

  for (const indexSQL of indexes) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: indexSQL });
      if (error) {
        console.log(`⚠️  Index creation warning: ${error.message}`);
      }
    } catch (err) {
      console.log(`⚠️  Index creation warning: ${err.message}`);
    }
  }
  
  console.log('✅ Indexes created');
}

async function main() {
  console.log('🚀 Setting up Supabase database schema...\n');
  
  const tableCreated = await createLandRegistryTable();
  
  if (tableCreated) {
    await createIndexes();
    console.log('\n✅ Database schema setup complete!');
    console.log('📊 You can now run the upload script to populate the data.');
  } else {
    console.log('\n❌ Failed to create database schema');
  }
}

main().catch(console.error);
