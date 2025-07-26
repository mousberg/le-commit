import { processLinkedInUrl } from '../linkedin-api';

/**
 * Simple test to check if LinkedIn API is working
 * Run this with: npx tsx src/lib/simple_tests/linkedin-api-test.ts
 */
async function testLinkedInApi() {
  const testUrl = 'https://www.linkedin.com/in/test-profile';
  
  console.log('🔍 Testing LinkedIn API...');
  console.log(`Testing with URL: ${testUrl}`);
  
  try {
    // Check if API key is set
    if (!process.env.BRIGHTDATA_API_KEY) {
      console.error('❌ BRIGHTDATA_API_KEY environment variable is not set');
      process.exit(1);
    }
    
    console.log('✅ API key found');
    console.log('⏳ Processing LinkedIn URL...');
    
    const startTime = Date.now();
    const result = await processLinkedInUrl(testUrl);
    const endTime = Date.now();
    
    console.log(`✅ LinkedIn API test completed in ${(endTime - startTime) / 1000}s`);
    console.log('📊 Extracted data:');
    console.log(`- Name: ${result.name}`);
    console.log(`- Headline: ${result.headline}`);
    console.log(`- Location: ${result.location}`);
    console.log(`- Profile URL: ${result.profileUrl}`);
    console.log(`- Connections: ${result.connections}`);
    console.log(`- Experience entries: ${result.experience.length}`);
    console.log(`- Skills: ${result.skills.length}`);
    
    return result;
    
  } catch (error) {
    console.error('❌ LinkedIn API test failed:');
    console.error(error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testLinkedInApi()
    .then(() => {
      console.log('✅ Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

export { testLinkedInApi };