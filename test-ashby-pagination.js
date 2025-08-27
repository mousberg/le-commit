// Quick test script to verify Ashby pagination behavior
// Run this in your browser console on the ATS page

async function testAshbyPagination() {
  console.log('🧪 Testing Ashby Pagination...');
  
  try {
    // Test with different limits
    const tests = [50, 100, 200, 500, 1000];
    
    for (const limit of tests) {
      console.log(`\n📊 Testing with limit: ${limit}`);
      
      const startTime = Date.now();
      const response = await fetch('/api/ashby/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit })
      });
      
      const data = await response.json();
      const duration = Date.now() - startTime;
      
      if (data.success) {
        console.log(`✅ Limit ${limit}: Got ${data.candidates_synced || 'unknown'} candidates in ${duration}ms`);
        console.log(`   Total candidates in DB: ${data.candidates?.length || 'unknown'}`);
      } else {
        console.log(`❌ Limit ${limit}: Error - ${data.error}`);
      }
      
      // Wait between tests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n🏁 Test completed! Check the Network tab for detailed API calls.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testAshbyPagination();
