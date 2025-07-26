/**
 * Quick LinkedIn API connection test
 * Tests just the initial API call without waiting for results
 */

async function quickLinkedInApiTest() {
  const testUrl = 'https://www.linkedin.com/in/satyanadella';
  
  console.log('🔍 Quick LinkedIn API connection test...');
  console.log(`Testing with URL: ${testUrl}`);
  
  try {
    // Check if API key is set
    if (!process.env.BRIGHTDATA_API_KEY) {
      console.error('❌ BRIGHTDATA_API_KEY environment variable is not set');
      console.log('💡 Set it with: export BRIGHTDATA_API_KEY=your_key_here');
      process.exit(1);
    }
    
    console.log('✅ API key found');
    console.log('⏳ Testing LinkedIn API connection...');
    
    const startTime = Date.now();
    
    // Test the BrightData API trigger
    const response = await fetch('https://api.brightdata.com/datasets/v3/trigger?dataset_id=gd_l1viktl72bvl7bjuj0&format=json&uncompressed_webhook=true', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.BRIGHTDATA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ url: testUrl }]),
    });
    
    const endTime = Date.now();
    
    console.log(`📊 API Response (${endTime - startTime}ms):`);
    console.log(`- Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error: ${errorText}`);
      process.exit(1);
    }
    
    const data = await response.json();
    console.log(`- Snapshot ID: ${data.snapshot_id || 'N/A'}`);
    console.log(`- Response: ${JSON.stringify(data, null, 2)}`);
    
    if (data.snapshot_id) {
      console.log('✅ LinkedIn API connection successful!');
      console.log('📝 Snapshot created. Full processing would require polling.');
    } else {
      console.log('⚠️  API responded but no snapshot_id returned');
    }
    
  } catch (error) {
    console.error('❌ LinkedIn API test failed:');
    console.error(error instanceof Error ? error.message : 'Unknown error');
    
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        console.log('💡 Check your BRIGHTDATA_API_KEY is correct');
      } else if (error.message.includes('fetch')) {
        console.log('💡 Check your internet connection');
      }
    }
    
    process.exit(1);
  }
}

// Run the test
quickLinkedInApiTest()
  .then(() => {
    console.log('✅ Quick test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });

export { quickLinkedInApiTest };