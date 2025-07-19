// Database error handling utilities

import { PostgrestError } from '@supabase/supabase-js';

// Custom error types
export class DatabaseError extends Error {
  public readonly code: string;
  public readonly details?: string;
  public readonly hint?: string;
  public readonly originalError?: any;

  constructor(message: string, code: string, details?: string, hint?: string, originalError?: any) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.details = details;
    this.hint = hint;
    this.originalError = originalError;
  }
}

export class AuthenticationError extends DatabaseError {
  constructor(message: string = 'Authentication required', originalError?: any) {
    super(message, 'AUTH_REQUIRED', undefined, undefined, originalError);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends DatabaseError {
  constructor(message: string = 'Insufficient permissions', originalError?: any) {
    super(message, 'INSUFFICIENT_PERMISSIONS', undefined, undefined, originalError);
    this.name = 'AuthorizationError';
  }
}

export class ValidationError extends DatabaseError {
  constructor(message: string, field?: string, originalError?: any) {
    super(message, 'VALIDATION_ERROR', field, undefined, originalError);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends DatabaseError {
  constructor(resource: string, id?: string, originalError?: any) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    super(message, 'NOT_FOUND', resource, undefined, originalError);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends DatabaseError {
  constructor(message: string, originalError?: any) {
    super(message, 'CONFLICT', undefined, undefined, originalError);
    this.name = 'ConflictError';
  }
}

// Error code mappings
const ERROR_CODE_MAPPINGS: Record<string, (error: PostgrestError) => DatabaseError> = {
  // Authentication errors
  'PGRST301': (error) => new AuthenticationError('JWT token is invalid', error),
  'PGRST302': (error) => new AuthenticationError('JWT token has expired', error),

  // Authorization errors
  'PGRST116': (error) => new AuthorizationError('Row Level Security policy violation', error),
  '42501': (error) => new AuthorizationError('Insufficient privileges', error),

  // Validation errors
  '23502': (error) => new ValidationError('Required field is missing', error.details, error),
  '23514': (error) => new ValidationError('Check constraint violation', error.details, error),
  '22001': (error) => new ValidationError('Value too long for field', error.details, error),
  '22003': (error) => new ValidationError('Numeric value out of range', error.details, error),

  // Conflict errors
  '23505': (error) => new ConflictError('Unique constraint violation: ' + (error.details || 'Record already exists'), error),
  '23503': (error) => new ConflictError('Foreign key constraint violation: ' + (error.details || 'Referenced record does not exist'), error),

  // Not found (handled separately as it's not always an error code)
};

// Main error handler function
export function handleDatabaseError(error: any): DatabaseError {
  // Handle null/undefined errors
  if (!error) {
    return new DatabaseError('Unknown database error', 'UNKNOWN');
  }

  // Handle already processed DatabaseError instances
  if (error instanceof DatabaseError) {
    return error;
  }

  // Handle Supabase PostgrestError
  if (error.code && typeof error.code === 'string') {
    const errorHandler = ERROR_CODE_MAPPINGS[error.code];
    if (errorHandler) {
      return errorHandler(error);
    }
  }

  // Handle common HTTP status codes from Supabase
  if (error.status) {
    switch (error.status) {
      case 401:
        return new AuthenticationError(error.message || 'Authentication required', error);
      case 403:
        return new AuthorizationError(error.message || 'Insufficient permissions', error);
      case 404:
        return new NotFoundError('Resource', undefined, error);
      case 409:
        return new ConflictError(error.message || 'Conflict occurred', error);
      case 422:
        return new ValidationError(error.message || 'Validation failed', undefined, error);
    }
  }

  // Handle network and connection errors
  if (error.message) {
    if (error.message.includes('fetch')) {
      return new DatabaseError('Network connection error', 'NETWORK_ERROR', error.message, 'Check your internet connection', error);
    }
    if (error.message.includes('timeout')) {
      return new DatabaseError('Request timeout', 'TIMEOUT', error.message, 'Try again later', error);
    }
  }

  // Default fallback
  return new DatabaseError(
    error.message || 'An unexpected database error occurred',
    'UNKNOWN',
    error.details,
    error.hint,
    error
  );
}

// Utility function to safely execute database operations
export async function safeExecute<T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  context?: string
): Promise<T> {
  try {
    const { data, error } = await operation();

    if (error) {
      throw handleDatabaseError(error);
    }

    if (data === null) {
      throw new NotFoundError(context || 'Resource');
    }

    return data;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw handleDatabaseError(error);
  }
}

// Utility function for operations that may return null (like optional gets)
export async function safeExecuteOptional<T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  context?: string
): Promise<T | null> {
  try {
    const { data, error } = await operation();

    if (error) {
      throw handleDatabaseError(error);
    }

    return data;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw handleDatabaseError(error);
  }
}

// Utility function for operations that return arrays
export async function safeExecuteArray<T>(
  operation: () => Promise<{ data: T[] | null; error: any }>,
  context?: string
): Promise<T[]> {
  try {
    const { data, error } = await operation();

    if (error) {
      throw handleDatabaseError(error);
    }

    return data || [];
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw handleDatabaseError(error);
  }
}

// Logging utility for database errors
export function logDatabaseError(error: DatabaseError, context?: string) {
  const logData = {
    name: error.name,
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
    context,
    timestamp: new Date().toISOString(),
    stack: error.stack,
  };

  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.error('Database Error:', logData);
  }

  // In production, you might want to send to a logging service
  // Example: sendToLoggingService(logData);
}

// Retry utility for transient errors
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry on certain error types
      if (error instanceof AuthenticationError ||
          error instanceof AuthorizationError ||
          error instanceof ValidationError ||
          error instanceof NotFoundError) {
        throw error;
      }

      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }

      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }

  throw lastError;
}
