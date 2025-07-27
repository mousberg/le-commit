// Ashby Integration Test Script
// Run with: npm run test:ashby or node -r ts-node/register src/lib/simple_tests/ashby-test.ts

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { AshbyClient } from '../ashby/client';

// Test configuration
const TEST_CONFIG = {
  maxCandidates: 5,
  testUpdates: false, // DISABLED - Read-only access
  includeResumes: true, // Safe to test - read-only
  verbose: true,
  readOnlyMode: true // Force read-only operations
};

async function testAshbyIntegration() {
  console.log('🧪 Starting Ashby Integration Test\n');

  // Check environment variables
  const apiKey = process.env.ASHBY_API_KEY;
  const baseUrl = process.env.ASHBY_BASE_URL;

  if (!apiKey) {
    console.error('❌ ASHBY_API_KEY environment variable not set');
    process.exit(1);
  }

  console.log('✅ Environment variables configured');
  if (baseUrl) {
    console.log(`🔗 Using custom base URL: ${baseUrl}`);
  }

  // Initialize client
  const client = new AshbyClient({
    apiKey,
    baseUrl
  });

  console.log('\n📡 Testing API Connection...');

  try {
    // Test 1: Basic connection
    console.log('Test 1: Basic API connection');
    const connectionTest = await client.listCandidates({ limit: 1 });
    
    if (!connectionTest.success) {
      console.error('❌ API connection failed:', connectionTest.error?.message);
      return;
    }
    
    console.log('✅ API connection successful');

    // Test 2: Fetch first few candidates
    console.log(`\nTest 2: Fetching first ${TEST_CONFIG.maxCandidates} candidates`);
    const candidatesResponse = await client.listCandidates({
      limit: TEST_CONFIG.maxCandidates,
      includeArchived: false
    });

    if (!candidatesResponse.success) {
      console.error('❌ Failed to fetch candidates:', candidatesResponse.error?.message);
      return;
    }

    const candidates = candidatesResponse.results?.results || [];
    console.log(`✅ Retrieved ${candidates.length} candidates`);

    if (candidates.length === 0) {
      console.log('ℹ️  No candidates found in Ashby');
      return;
    }

    // Display candidate summary
    console.log('\n📊 Candidate Summary:');
    console.log('─'.repeat(80));
    
    candidates.forEach((candidate, index) => {
      console.log(`${index + 1}. ${candidate.name || 'No name'}`);
      console.log(`   Email: ${candidate.email || 'No email'}`);
      console.log(`   LinkedIn: ${candidate.linkedInUrl || 'No LinkedIn URL'}`);
      console.log(`   Resume: ${candidate.resumeFileHandle ? 'Yes' : 'No'}`);
      console.log(`   ID: ${candidate.id}`);
      console.log(`   Created: ${candidate.createdAt}`);
      if (candidate.tags && candidate.tags.length > 0) {
        console.log(`   Tags: ${candidate.tags.join(', ')}`);
      }
      console.log('');
    });

    // Test 3: Get detailed candidate information
    if (candidates.length > 0) {
      console.log('Test 3: Fetching detailed candidate information');
      const firstCandidate = candidates[0];
      
      const detailedCandidate = await client.getCandidate(firstCandidate.id);
      
      if (detailedCandidate.success) {
        console.log('✅ Successfully fetched detailed candidate info');
        if (TEST_CONFIG.verbose) {
          console.log('📝 Detailed candidate data:');
          console.log(JSON.stringify(detailedCandidate.results, null, 2));
        }
      } else {
        console.error('❌ Failed to fetch detailed candidate:', detailedCandidate.error?.message);
      }
    }

    // Test 4: Resume fetching (if enabled and available)
    if (TEST_CONFIG.includeResumes && candidates.some(c => c.resumeFileHandle)) {
      console.log('\nTest 4: Testing resume fetching');
      const candidateWithResume = candidates.find(c => c.resumeFileHandle);
      
      if (candidateWithResume?.resumeFileHandle) {
        const resumeResponse = await client.getResumeUrl(candidateWithResume.resumeFileHandle);
        
        if (resumeResponse.success) {
          console.log('✅ Successfully fetched resume URL');
          console.log(`📄 Resume URL: ${resumeResponse.results?.url}`);
        } else {
          console.error('❌ Failed to fetch resume URL:', resumeResponse.error?.message);
        }
      }
    }

    // Test 5: Update candidate (SKIPPED - Read-only access)
    if (TEST_CONFIG.readOnlyMode) {
      console.log('\nTest 5: ⏭️  Skipping candidate updates (read-only mode)');
      console.log('ℹ️  This integration is configured for read-only access');
    }

    // Test 6: Pagination test
    if (candidatesResponse.results?.moreDataAvailable) {
      console.log('\nTest 6: Testing pagination');
      const nextPageResponse = await client.listCandidates({
        limit: 2,
        cursor: candidatesResponse.results.nextCursor
      });

      if (nextPageResponse.success) {
        console.log('✅ Pagination working correctly');
        console.log(`📄 Next page has ${nextPageResponse.results?.results?.length || 0} candidates`);
      } else {
        console.error('❌ Pagination failed:', nextPageResponse.error?.message);
      }
    }

    console.log('\n🎉 Ashby read-only integration test completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Use the fetched candidate data to test your verification pipeline');
    console.log('2. Set up periodic sync to pull new candidates (read-only)');
    console.log('3. Test the complete workflow: Ashby → Unmask → Analysis');
    console.log('4. Once verification is complete, manually update Ashby with results');

  } catch (error) {
    console.error('💥 Test failed with error:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (TEST_CONFIG.verbose) {
        console.error('Stack trace:', error.stack);
      }
    }
  }
}

// Helper function to test webhook signature verification
function testWebhookSignature() {
  console.log('\n🔐 Testing webhook signature verification...');
  
  const testPayload = '{"id":"test","type":"candidate.created","data":{"candidateId":"test123"}}';
  const testSecret = 'test-secret';
  const testSignature = 'test-signature';

  try {
    const isValid = AshbyClient.verifyWebhookSignature(testPayload, testSignature, testSecret);
    console.log(`Signature verification result: ${isValid ? 'Valid' : 'Invalid'}`);
    console.log('ℹ️  Note: This uses a test signature and will likely show as invalid');
  } catch (error) {
    console.error('❌ Webhook signature test failed:', error);
  }
}

// Main execution
if (require.main === module) {
  console.log('Starting Ashby Integration Tests...\n');
  
  testAshbyIntegration()
    .then(() => {
      testWebhookSignature();
      console.log('\n✅ All tests completed');
    })
    .catch((error) => {
      console.error('\n❌ Tests failed:', error);
      process.exit(1);
    });
}

export { testAshbyIntegration, testWebhookSignature };