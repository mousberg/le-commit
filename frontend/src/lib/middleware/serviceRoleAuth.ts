import { NextRequest, NextResponse } from 'next/server';
import { withApiMiddleware, type ApiHandlerContext, type ApiHandler } from './apiWrapper';

export interface ServiceRoleContext extends ApiHandlerContext {
  isServiceRole: true;
  userId: string;
}

export interface ServiceRoleOptions {
  requireWebhookSecret?: boolean;
  webhookSecretHeader?: string;
}

/**
 * Check if request is using service role authentication
 */
export function isServiceRoleRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return authHeader === `Bearer ${serviceRoleKey}` && !!serviceRoleKey;
}

/**
 * Validate service role request and extract userId
 */
export async function validateServiceRoleRequest(
  request: NextRequest,
  options: ServiceRoleOptions = {}
): Promise<{ isValid: boolean; userId?: string; error?: NextResponse }> {
  try {
    // Validate webhook secret if required
    if (options.requireWebhookSecret) {
      const webhookSecret = request.headers.get(options.webhookSecretHeader || 'x-webhook-secret');
      const expectedSecret = process.env.WEBHOOK_SECRET || 'webhook-secret-dev';
      
      if (webhookSecret !== expectedSecret) {
        return {
          isValid: false,
          error: NextResponse.json({ error: 'Invalid webhook secret' }, { status: 403 })
        };
      }
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return {
        isValid: false,
        error: NextResponse.json(
          { error: 'userId required for service role authentication', success: false },
          { status: 400 }
        )
      };
    }

    return { isValid: true, userId };
  } catch {
    return {
      isValid: false,
      error: NextResponse.json(
        { error: 'Invalid request body for service role authentication', success: false },
        { status: 400 }
      )
    };
  }
}

/**
 * Create service role context with enhanced database client
 */
export async function createServiceRoleContext(
  request: NextRequest,
  userId: string,
  body: Record<string, unknown>
): Promise<ServiceRoleContext> {
  // Import these dynamically to avoid client-side bundling
  const { createServiceRoleClient } = await import('@/lib/supabase/server');
  const { DatabaseClient } = await import('@/lib/supabase/database');
  const { SupabaseDatabaseService } = await import('@/lib/services/database');
  
  const serviceRoleSupabase = createServiceRoleClient();
  const dbClient = new DatabaseClient(serviceRoleSupabase);
  const dbService = new SupabaseDatabaseService();
  
  // Override the client with service role client
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (dbService as any).dbClient = dbClient;
  
  return {
    user: { id: userId, email: '' },
    dbService,
    request,
    body,
    params: {},
    isServiceRole: true,
    userId
  };
}

/**
 * Enhanced logging for service role vs user authentication
 */
export function logServiceRoleAuth(
  request: NextRequest,
  isServiceRole: boolean,
  userId?: string
): void {
  const authHeader = request.headers.get('authorization');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('🔍 Authentication Debug:', {
    endpoint: request.url,
    method: request.method,
    hasAuthHeader: !!authHeader,
    authHeaderType: authHeader?.split(' ')[0] || 'none',
    isServiceRole,
    hasServiceRoleKey: !!serviceRoleKey,
    userId: userId || 'N/A',
    timestamp: new Date().toISOString()
  });
}

/**
 * Enhanced logging for successful operations
 */
export function logServiceRoleSuccess(
  request: NextRequest,
  isServiceRole: boolean,
  status: number = 200
): void {
  const emoji = status === 200 ? '✅' : '❌';
  const authType = isServiceRole ? 'service role' : 'user auth';
  const endpoint = new URL(request.url).pathname;
  
  console.log(`${emoji} ${request.method} ${endpoint} ${status} (${authType})`, {
    status,
    isServiceRole,
    timestamp: new Date().toISOString()
  });
}

/**
 * Enhanced logging for authentication failures
 */
export function logServiceRoleError(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: any,
  context?: string
): void {
  const endpoint = new URL(request.url).pathname;
  
  console.error(`❌ ${request.method} ${endpoint} auth error${context ? ` (${context})` : ''}:`, {
    error: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
    url: request.url,
    method: request.method
  });
}

/**
 * Wrapper to add service role support to existing API handlers
 */
export function withServiceRoleSupport(
  handler: ApiHandler,
  options: ServiceRoleOptions = {}
) {
  return async (request: NextRequest, routeParams: { params: Promise<Record<string, string>> }): Promise<NextResponse> => {
    try {
      const isServiceRoleAuth = isServiceRoleRequest(request);
      
      logServiceRoleAuth(request, isServiceRoleAuth);
      
      if (isServiceRoleAuth) {
        // Handle service role authentication
        const validation = await validateServiceRoleRequest(request, options);
        
        if (!validation.isValid) {
          logServiceRoleError(request, 'Service role validation failed');
          return validation.error!;
        }
        
        console.log('🔧 Service role auth detected:', { 
          userId: validation.userId,
          endpoint: new URL(request.url).pathname
        });
        
        // Create service role context
        const body = await request.clone().json();
        const serviceRoleContext = await createServiceRoleContext(request, validation.userId!, body);
        
        // Call handler with service role context
        const response = await handler(serviceRoleContext);
        
        logServiceRoleSuccess(request, true, response.status);
        
        return response;
      } else {
        // Use regular middleware for user authentication
        console.log('🔧 User auth path detected, using middleware');
        
        const middlewareResponse = await withApiMiddleware(handler, {
          requireAuth: true,
          enableCors: true
        })(request, routeParams);

        logServiceRoleSuccess(request, false, middlewareResponse.status);
        
        // Enhanced logging for 401s
        if (middlewareResponse.status === 401) {
          const responseClone = middlewareResponse.clone();
          const responseBody = await responseClone.json().catch(() => null);
          logServiceRoleError(request, responseBody, 'User auth 401');
        }
        
        return middlewareResponse;
      }
    } catch (error) {
      logServiceRoleError(request, error, 'Wrapper exception');
      
      return NextResponse.json(
        { 
          error: 'Internal server error', 
          success: false,
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Simple service role detection for endpoints that only need service role auth
 */
export function withServiceRoleOnly(
  handler: (context: ServiceRoleContext) => Promise<NextResponse>,
  options: ServiceRoleOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const isServiceRoleAuth = isServiceRoleRequest(request);
      
      if (!isServiceRoleAuth) {
        return NextResponse.json(
          { error: 'Service role authentication required', success: false },
          { status: 401 }
        );
      }

      const validation = await validateServiceRoleRequest(request, options);
      
      if (!validation.isValid) {
        return validation.error!;
      }

      const body = await request.json();
      const serviceRoleContext = await createServiceRoleContext(request, validation.userId!, body);
      
      return await handler(serviceRoleContext);
    } catch (error) {
      logServiceRoleError(request, error);
      
      return NextResponse.json(
        { 
          error: 'Internal server error', 
          success: false,
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  };
}