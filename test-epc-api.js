// Using built-in fetch (Node.js 18+)

// Test the EPC API with your real API key
async function testEPCApi() {
  const apiKey = 'e4f4035c1f31d4d3cde622673f50f84279213f42';
  const email = 'mohammad.elkossi@gmail.com'; // Your registered email
  const postcode = 'S10';
  const propertyType = 'Semi-Detached';
  
  console.log('🧪 Testing EPC API with your API key...\n');
  console.log('📧 Note: You need to provide your registered email address for authentication');
  
  try {
    // Build query parameters (no API key in URL)
    const params = new URLSearchParams({
      postcode: postcode,
      size: '10',
      from: '0'
    });

    if (propertyType) {
      params.append('built-form', propertyType);
    }

    const url = `https://epc.opendatacommunities.org/api/v1/domestic/search?${params.toString()}`;
    console.log(`🔗 EPC API URL: ${url}`);

    // Use HTTP Basic Auth with email:apiKey format
    console.log('🔑 Using HTTP Basic Auth with email:apiKey...');
    const authString = Buffer.from(`${email}:${apiKey}`).toString('base64');
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Basic ${authString}`,
        'User-Agent': 'HomeLens-Property-Analysis/1.0'
      }
    });

    console.log(`📊 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Error response: ${errorText}`);
      return;
    }

    const data = await response.json();
    console.log(`✅ Successfully fetched EPC data!`);
    console.log(`📊 Response structure:`, Object.keys(data));
    console.log(`📊 Total rows: ${data.total_rows || 'Unknown'}`);
    console.log(`📊 Rows returned: ${data.rows?.length || 0}`);
    
    // Log the first property to see the actual structure
    if (data.rows && data.rows.length > 0) {
      console.log('\n🔍 First property structure:');
      console.log(JSON.stringify(data.rows[0], null, 2));
    }
    
    if (data.rows && data.rows.length > 0) {
      console.log('\n📋 Sample EPC Properties:');
      data.rows.slice(0, 3).forEach((property, index) => {
        console.log(`${index + 1}. ${property.address1 || 'N/A'} ${property.street || 'N/A'}, ${property.postcode || 'N/A'}`);
        console.log(`   Property Type: ${property.built_form || 'N/A'}`);
        console.log(`   Total Floor Area: ${property.total_floor_area || 'N/A'} sqm`);
        console.log(`   Energy Rating: ${property.current_energy_rating || 'N/A'}`);
        console.log(`   Address: ${property.address || 'N/A'}`);
        console.log('');
      });
    }

    console.log('🎉 EPC API integration is working!');
    console.log('💡 You can now use real EPC data for price per square meter analysis.');

  } catch (error) {
    console.error('❌ EPC API test failed:', error.message);
  }
}

// Run the test
testEPCApi();
