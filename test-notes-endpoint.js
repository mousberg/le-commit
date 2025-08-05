#!/usr/bin/env node

// Test script for the Ashby Notes API endpoint
// Usage: node test-notes-endpoint.js

const testNotesEndpoint = async () => {
  const baseUrl = 'http://localhost:3000'; // Adjust if your dev server runs on a different port
  const endpoint = `${baseUrl}/api/ashby/notes`;
  
  // Test data
  const testData = {
    candidateId: 'c60823fd-e421-4', // Replace with a real candidate ID from your Ashby account
    note: 'Interesting Unmask Test',
    sendNotifications: false
  };

  try {
    console.log('🧪 Testing Ashby Notes API endpoint...');
    console.log('📝 Sending request to:', endpoint);
    console.log('📋 Test data:', JSON.stringify(testData, null, 2));
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In a real test, you'll need to add authentication headers
        // 'Authorization': 'Bearer your-session-token'
      },
      body: JSON.stringify(testData)
    });

    console.log('\n📊 Response Status:', response.status);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseData = await response.json();
    console.log('\n📄 Response Body:', JSON.stringify(responseData, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Success! Note created successfully');
    } else {
      console.log('\n❌ Failed to create note');
    }
    
  } catch (error) {
    console.error('\n💥 Error testing endpoint:', error);
  }
};

// Test without authentication (should return 401)
const testUnauthenticated = async () => {
  const baseUrl = 'http://localhost:3000';
  const endpoint = `${baseUrl}/api/ashby/notes`;
  
  try {
    console.log('\n🔒 Testing unauthenticated request (should return 401)...');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        candidateId: 'test-id',
        note: 'test note'
      })
    });
    
    const responseData = await response.json();
    console.log('📊 Status:', response.status);
    console.log('📄 Response:', JSON.stringify(responseData, null, 2));
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
};

// Test with missing parameters
const testMissingParams = async () => {
  const baseUrl = 'http://localhost:3000';
  const endpoint = `${baseUrl}/api/ashby/notes`;
  
  try {
    console.log('\n🚫 Testing missing parameters (should return 400)...');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // Missing candidateId and note
      })
    });
    
    const responseData = await response.json();
    console.log('📊 Status:', response.status);
    console.log('📄 Response:', JSON.stringify(responseData, null, 2));
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
};

// Run tests
const runTests = async () => {
  console.log('🚀 Starting Ashby Notes API Tests\n');
  
  await testUnauthenticated();
  await testMissingParams();
  // await testNotesEndpoint(); // Uncomment when you have proper authentication
  
  console.log('\n✨ Tests completed!');
  console.log('\n📝 To test with authentication:');
  console.log('1. Start your Next.js dev server: npm run dev');
  console.log('2. Log in to your app in the browser');
  console.log('3. Get your session token from browser dev tools');
  console.log('4. Uncomment testNotesEndpoint() and add proper auth headers');
  console.log('5. Replace the test candidateId with a real one from your Ashby account');
};

runTests().catch(console.error);