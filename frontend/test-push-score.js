#!/usr/bin/env node

/**
 * Test script for the Ashby Push Score API endpoint
 * 
 * This script demonstrates how to use the /api/ashby/push-score endpoint
 * to send AI analysis scores to Ashby custom fields.
 * 
 * Usage:
 *   node test-push-score.js
 * 
 * Requirements:
 *   - ASHBY_API_KEY environment variable set
 *   - Valid Ashby Application or Candidate ID
 *   - Server running on localhost:3000 (or update BASE_URL)
 */

const BASE_URL = 'http://localhost:3000';

// Example usage scenarios (Candidate-focused for authenticity)
const testCases = [
  {
    name: '✨ Auto-detect everything (recommended)',
    payload: {
      applicantId: 'your-applicant-id-here' // Replace with actual applicant ID
      // Everything else auto-detected!
    }
  },
  {
    name: '🎯 Custom field name',
    payload: {
      applicantId: 'your-applicant-id-here',
      customFieldId: 'credibility_score'
    }
  },
  {
    name: '🧪 Manual test (bypass database)',
    payload: {
      scoreOverride: 85, // Test score (0-100)
      ashbyObjectId: 'your-ashby-candidate-id-here', // Replace with actual Ashby Candidate ID
      customFieldId: 'authenticity_confidence'
    }
  }
];

async function testPushScore(testCase) {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log('Payload:', JSON.stringify(testCase.payload, null, 2));

  try {
    const response = await fetch(`${BASE_URL}/api/ashby/push-score`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        // Note: In production, you'd need proper authentication
        // 'Authorization': 'Bearer your-auth-token'
      },
      body: JSON.stringify(testCase.payload)
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Success:', result);
    } else {
      console.log('❌ Error:', result);
    }

  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Testing Ashby Push Score API');
  console.log('================================');

  // Check if we have the required environment
  if (!process.env.ASHBY_API_KEY) {
    console.log('⚠️  Warning: ASHBY_API_KEY not set in environment');
    console.log('   Make sure to set this before running real tests');
  }

  console.log('📝 Before running these tests:');
  console.log('   1. Replace applicant IDs with real UUIDs from your database');
  console.log('   2. Ensure ASHBY_API_KEY environment variable is set');
  console.log('   3. Create "authenticity_confidence" field in Ashby for Candidates');
  console.log('   4. Ensure your server is running (npm run dev)');
  console.log('   5. Set up proper authentication if needed');

  // Run test cases
  for (const testCase of testCases) {
    await testPushScore(testCase);
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
  }

  console.log('\n✨ Testing complete!');
}

// Run the tests
runTests().catch(console.error);