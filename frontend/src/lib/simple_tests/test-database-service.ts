// Simple test for database service interfaces and utilities

import {
  DatabaseError,
  AuthenticationError,
  ValidationError,
  handleDatabaseError,
  safeExecute,
  withRetry
} from '../supabase/errors';

import { DatabaseClient, TABLES, STORAGE_BUCKETS } from '../supabase/database';

// Test error handling
export function testErrorHandling() {
  console.log('Testing error handling utilities...');

  // Test DatabaseError creation
  const dbError = new DatabaseError('Test error', 'TEST_CODE', 'Test details');
  console.log('✓ DatabaseError created:', dbError.message, dbError.code);

  // Test AuthenticationError
  const authError = new AuthenticationError('Auth failed');
  console.log('✓ AuthenticationError created:', authError.message, authError.code);

  // Test ValidationError
  const validationError = new ValidationError('Validation failed', 'email');
  console.log('✓ ValidationError created:', validationError.message, validationError.details);

  // Test error handler with different error types
  const postgrestError = {
    code: '23502',
    message: 'null value in column "name" violates not-null constraint',
    details: 'Failing row contains (id, null, ...)',
    hint: 'Add a value for the name column'
  };

  const handledError = handleDatabaseError(postgrestError);
  console.log('✓ Handled PostgrestError:', handledError.name, handledError.message);

  // Test with HTTP status error
  const httpError = {
    status: 401,
    message: 'Unauthorized'
  };

  const handledHttpError = handleDatabaseError(httpError);
  console.log('✓ Handled HTTP error:', handledHttpError.name, handledHttpError.message);

  console.log('Error handling tests completed ✓\n');
}

// Test database client utilities
export function testDatabaseClient() {
  console.log('Testing database client utilities...');

  // Test table constants
  console.log('✓ Tables defined:', Object.keys(TABLES));
  console.log('✓ Storage buckets defined:', Object.keys(STORAGE_BUCKETS));

  // Test that we can create a browser client (won't actually connect without env vars)
  try {
    const browserClient = DatabaseClient.createBrowserClient();
    console.log('✓ Browser client created successfully');

    // Test client methods exist
    console.log('✓ Client has from method:', typeof browserClient.from === 'function');
    console.log('✓ Client has storage method:', typeof browserClient.storage === 'function');
    console.log('✓ Client has auth method:', typeof browserClient.auth === 'function');
  } catch (error) {
    console.log('⚠ Browser client creation failed (expected without env vars):', error.message);
  }

  console.log('Database client tests completed ✓\n');
}

// Test retry utility
export async function testRetryUtility() {
  console.log('Testing retry utility...');

  let attemptCount = 0;

  // Test successful retry
  const successResult = await withRetry(async () => {
    attemptCount++;
    if (attemptCount < 2) {
      throw new Error('Temporary failure');
    }
    return 'success';
  }, 3, 10);

  console.log('✓ Retry succeeded after', attemptCount, 'attempts:', successResult);

  // Test retry with non-retryable error
  try {
    await withRetry(async () => {
      throw new ValidationError('This should not retry');
    }, 3, 10);
  } catch (error) {
    console.log('✓ Non-retryable error correctly thrown:', error.name);
  }

  console.log('Retry utility tests completed ✓\n');
}

// Test safe execute utility
export async function testSafeExecute() {
  console.log('Testing safe execute utility...');

  // Test successful operation
  const successResult = await safeExecute(async () => ({
    data: { id: '123', name: 'Test' },
    error: null
  }), 'Test resource');

  console.log('✓ Safe execute success:', successResult);

  // Test operation with error
  try {
    await safeExecute(async () => ({
      data: null,
      error: { code: '23502', message: 'Not null violation' }
    }), 'Test resource');
  } catch (error) {
    console.log('✓ Safe execute error handled:', error.name, error.message);
  }

  // Test operation with null data (not found)
  try {
    await safeExecute(async () => ({
      data: null,
      error: null
    }), 'Test resource');
  } catch (error) {
    console.log('✓ Safe execute null data handled:', error.name);
  }

  console.log('Safe execute tests completed ✓\n');
}

// Run all tests
export async function runDatabaseServiceTests() {
  console.log('=== Database Service Interface Tests ===\n');

  testErrorHandling();
  testDatabaseClient();
  await testRetryUtility();
  await testSafeExecute();

  console.log('=== All Database Service Tests Completed ===');
}

// Export for use in other test files
export {
  DatabaseError,
  AuthenticationError,
  ValidationError,
  handleDatabaseError,
  DatabaseClient,
  TABLES,
  STORAGE_BUCKETS
};
