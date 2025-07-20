import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerDatabaseService } from '@/lib/services/database';
import { WorkspaceRole } from '@/lib/interfaces/database';

export interface AuthContext {
  user: {
    id: string;
    email: string;
  };
  dbService: any;
}

export interface AuthMiddlewareOptions {
  requireAuth?: boolean;
  requireWorkspaceAccess?: {
    workspaceIdParam?: string;
    requiredRole?: WorkspaceRole;
  };
  requireApplicantAccess?: {
    applicantIdParam?: string;
    requiredRole?: WorkspaceRole;
  };
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
}

// Simple in-memory rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Authentication middleware for API routes
 */
export async function withAuth(
  request: NextRequest,
  options: AuthMiddlewareOptions = {}
): Promise<{ context: AuthContext | null; error: NextResponse | null }> {
  try {
    // Rate limiting
    if (options.rateLimit) {
      const clientIp = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
      const rateLimitKey = `${clientIp}:${request.nextUrl.pathname}`;
      const now = Date.now();

      const existing = rateLimitStore.get(rateLimitKey);
      if (existing) {
        if (now < existing.resetTime) {
          if (existing.count >= options.rateLimit.maxRequests) {
            return {
              context: null,
              error: NextResponse.json(
                { error: 'Rate limit exceeded', success: false },
                { status: 429 }
              )
            };
          }
          existing.count++;
        } else {
          // Reset window
          rateLimitStore.set(rateLimitKey, {
            count: 1,
            resetTime: now + options.rateLimit.windowMs
          });
        }
      } else {
        rateLimitStore.set(rateLimitKey, {
          count: 1,
          resetTime: now + options.rateLimit.windowMs
        });
      }
    }

    // Authentication check
    if (options.requireAuth !== false) {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return {
          context: null,
          error: NextResponse.json(
            { error: 'Authentication required', success: false },
            { status: 401 }
          )
        };
      }

      const dbService = await getServerDatabaseService();
      const context: AuthContext = {
        user: {
          id: user.id,
          email: user.email || ''
        },
        dbService
      };

      // Workspace access validation
      if (options.requireWorkspaceAccess) {
        const workspaceId = extractParamFromRequest(
          request,
          options.requireWorkspaceAccess.workspaceIdParam || 'workspaceId'
        );

        if (!workspaceId) {
          return {
            context: null,
            error: NextResponse.json(
              { error: 'Workspace ID is required', success: false },
              { status: 400 }
            )
          };
        }

        const hasAccess = await dbService.validateWorkspaceAccess(
          workspaceId,
          user.id,
          options.requireWorkspaceAccess.requiredRole
        );

        if (!hasAccess) {
          return {
            context: null,
            error: NextResponse.json(
              { error: 'Access denied to workspace', success: false },
              { status: 403 }
            )
          };
        }
      }

      // Applicant access validation
      if (options.requireApplicantAccess) {
        const applicantId = extractParamFromRequest(
          request,
          options.requireApplicantAccess.applicantIdParam || 'applicantId'
        );

        if (!applicantId) {
          return {
            context: null,
            error: NextResponse.json(
              { error: 'Applicant ID is required', success: false },
              { status: 400 }
            )
          };
        }

        const hasAccess = await dbService.validateApplicantAccess(
          applicantId,
          user.id,
          options.requireApplicantAccess.requiredRole
        );

        if (!hasAccess) {
          return {
            context: null,
            error: NextResponse.json(
              { error: 'Access denied to applicant', success: false },
              { status: 403 }
            )
          };
        }
      }

      return { context, error: null };
    }

    // No auth required
    return { context: null, error: null };
  } catch (error) {
    console.error('Auth middleware error:', error);
    return {
      context: null,
      error: NextResponse.json(
        { error: 'Internal server error', success: false },
        { status: 500 }
      )
    };
  }
}

/**
 * Extract parameter from request URL or body
 */
function extractParamFromRequest(request: NextRequest, paramName: string): string | null {
  // Try URL search params first
  const { searchParams } = new URL(request.url);
  const fromQuery = searchParams.get(paramName);
  if (fromQuery) return fromQuery;

  // Try to extract from URL path (for dynamic routes)
  const pathSegments = request.nextUrl.pathname.split('/');
  const paramIndex = pathSegments.findIndex(segment => segment === paramName);
  if (paramIndex !== -1 && paramIndex + 1 < pathSegments.length) {
    return pathSegments[paramIndex + 1];
  }

  // For form data or JSON body, we'd need to parse it, but that's more complex
  // and should be handled in the route handler itself
  return null;
}

/**
 * Input validation middleware
 */
export function validateInput(schema: any) {
  return async (data: any): Promise<{ isValid: boolean; errors: string[] }> => {
    const errors: string[] = [];

    // Basic validation - in a real app, you'd use a library like Zod or Joi
    if (schema.required) {
      for (const field of schema.required) {
        if (data[field] === undefined || data[field] === null || data[field] === '') {
          errors.push(`${field} is required`);
        }
      }
    }

    if (schema.types) {
      for (const [field, expectedType] of Object.entries(schema.types)) {
        if (data[field] !== undefined && typeof data[field] !== expectedType) {
          errors.push(`${field} must be of type ${expectedType}`);
        }
      }
    }

    if (schema.patterns) {
      for (const [field, pattern] of Object.entries(schema.patterns)) {
        if (data[field] && !(pattern as RegExp).test(data[field])) {
          errors.push(`${field} format is invalid`);
        }
      }
    }

    if (schema.lengths) {
      for (const [field, constraints] of Object.entries(schema.lengths)) {
        const value = data[field];
        const { min, max } = constraints as { min?: number; max?: number };

        if (value && typeof value === 'string') {
          if (min && value.length < min) {
            errors.push(`${field} must be at least ${min} characters long`);
          }
          if (max && value.length > max) {
            errors.push(`${field} must be no more than ${max} characters long`);
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };
}

/**
 * Sanitize input data
 */
export function sanitizeInput(data: any): any {
  if (typeof data === 'string') {
    // Basic HTML/script tag removal
    return data
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeInput);
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }

  return data;
}

/**
 * Error handler for API routes
 */
export function handleApiError(error: any, operation: string): NextResponse {
  console.error(`API Error in ${operation}:`, error);

  // Database errors
  if (error.message?.includes('duplicate key') || error.code === '23505') {
    return NextResponse.json(
      { error: 'Resource already exists', success: false },
      { status: 409 }
    );
  }

  if (error.message?.includes('foreign key') || error.code === '23503') {
    return NextResponse.json(
      { error: 'Referenced resource not found', success: false },
      { status: 400 }
    );
  }

  if (error.message?.includes('not found') || error.code === 'PGRST116') {
    return NextResponse.json(
      { error: 'Resource not found', success: false },
      { status: 404 }
    );
  }

  // Authentication/Authorization errors
  if (error.message?.includes('Authentication') || error.message?.includes('auth')) {
    return NextResponse.json(
      { error: 'Authentication required', success: false },
      { status: 401 }
    );
  }

  if (error.message?.includes('Access denied') || error.message?.includes('permission')) {
    return NextResponse.json(
      { error: 'Access denied', success: false },
      { status: 403 }
    );
  }

  // Validation errors
  if (error.message?.includes('validation') || error.message?.includes('invalid')) {
    return NextResponse.json(
      { error: error.message || 'Validation failed', success: false },
      { status: 400 }
    );
  }

  // Storage errors
  if (error.message?.includes('storage') || error.message?.includes('file')) {
    return NextResponse.json(
      { error: 'File operation failed', success: false },
      { status: 500 }
    );
  }

  // Generic server error
  return NextResponse.json(
    { error: 'Internal server error', success: false },
    { status: 500 }
  );
}

/**
 * CORS headers for API responses
 */
export function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}

/**
 * Security headers for API responses
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

/**
 * Logging middleware for API requests
 */
export function logApiRequest(request: NextRequest, startTime: number): void {
  const duration = Date.now() - startTime;
  const method = request.method;
  const url = request.nextUrl.pathname;
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';

  console.log(`[API] ${method} ${url} - ${duration}ms - ${ip} - ${userAgent}`);
}
