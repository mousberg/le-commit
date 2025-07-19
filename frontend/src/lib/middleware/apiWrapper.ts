import { NextRequest, NextResponse } from 'next/server';
import {
    withAuth,
    AuthMiddlewareOptions,
    AuthContext,
    validateInput,
    sanitizeInput,
    handleApiError,
    addCorsHeaders,
    addSecurityHeaders,
    logApiRequest
} from './auth';

export interface ApiHandlerOptions extends AuthMiddlewareOptions {
    validation?: {
        body?: any;
        query?: any;
    };
    sanitizeInput?: boolean;
    enableCors?: boolean;
    enableSecurityHeaders?: boolean;
    enableLogging?: boolean;
}

export interface ApiHandlerContext extends AuthContext {
    request: NextRequest;
    params?: any;
}

export type ApiHandler = (
    context: ApiHandlerContext,
    params?: any
) => Promise<NextResponse>;

/**
 * Wrapper for API route handlers with middleware
 */
export function withApiMiddleware(
    handler: ApiHandler,
    options: ApiHandlerOptions = {}
) {
    return async (request: NextRequest, routeParams?: any): Promise<NextResponse> => {
        const startTime = Date.now();

        try {
            // Handle CORS preflight requests
            if (request.method === 'OPTIONS' && options.enableCors) {
                const response = new NextResponse(null, { status: 200 });
                return addCorsHeaders(response);
            }

            // Authentication and authorization
            const { context: authContext, error: authError } = await withAuth(request, options);

            if (authError) {
                return authError;
            }

            // Parse request body if present
            let body: any = null;
            if (request.method !== 'GET' && request.method !== 'DELETE') {
                const contentType = request.headers.get('content-type') || '';

                if (contentType.includes('application/json')) {
                    try {
                        body = await request.json();
                    } catch (error) {
                        return NextResponse.json(
                            { error: 'Invalid JSON in request body', success: false },
                            { status: 400 }
                        );
                    }
                } else if (contentType.includes('multipart/form-data')) {
                    try {
                        body = await request.formData();
                    } catch (error) {
                        return NextResponse.json(
                            { error: 'Invalid form data in request body', success: false },
                            { status: 400 }
                        );
                    }
                }
            }

            // Input validation
            if (options.validation?.body && body && !(body instanceof FormData)) {
                const validation = await validateInput(options.validation.body);
                const validationResult = await validation(body);

                if (!validationResult.isValid) {
                    return NextResponse.json(
                        {
                            error: 'Validation failed',
                            details: validationResult.errors,
                            success: false
                        },
                        { status: 400 }
                    );
                }
            }

            // Query parameter validation
            if (options.validation?.query) {
                const queryParams = Object.fromEntries(new URL(request.url).searchParams);
                const validation = await validateInput(options.validation.query);
                const validationResult = await validation(queryParams);

                if (!validationResult.isValid) {
                    return NextResponse.json(
                        {
                            error: 'Query validation failed',
                            details: validationResult.errors,
                            success: false
                        },
                        { status: 400 }
                    );
                }
            }

            // Input sanitization
            if (options.sanitizeInput && body && !(body instanceof FormData)) {
                body = sanitizeInput(body);
            }

            // Create enhanced request with parsed body
            const enhancedRequest = Object.assign(request, { body });

            // Create handler context
            const handlerContext: ApiHandlerContext = {
                ...authContext!,
                request: enhancedRequest,
                params: routeParams
            };

            // Call the actual handler
            const response = await handler(handlerContext, routeParams);

            // Add security headers
            if (options.enableSecurityHeaders) {
                addSecurityHeaders(response);
            }

            // Add CORS headers
            if (options.enableCors) {
                addCorsHeaders(response);
            }

            // Log request
            if (options.enableLogging) {
                logApiRequest(request, startTime);
            }

            return response;

        } catch (error) {
            // Log request even on error
            if (options.enableLogging) {
                logApiRequest(request, startTime);
            }

            return handleApiError(error, `${request.method} ${request.nextUrl.pathname}`);
        }
    };
}

/**
 * Convenience wrapper for GET requests
 */
export function withGetMiddleware(
    handler: ApiHandler,
    options: Omit<ApiHandlerOptions, 'validation'> & {
        validation?: { query?: any }
    } = {}
) {
    return withApiMiddleware(handler, {
        ...options,
        validation: options.validation ? { query: options.validation.query } : undefined
    });
}

/**
 * Convenience wrapper for POST requests
 */
export function withPostMiddleware(
    handler: ApiHandler,
    options: ApiHandlerOptions = {}
) {
    return withApiMiddleware(handler, {
        ...options,
        requireAuth: options.requireAuth !== false,
        sanitizeInput: options.sanitizeInput !== false
    });
}

/**
 * Convenience wrapper for PUT requests
 */
export function withPutMiddleware(
    handler: ApiHandler,
    options: ApiHandlerOptions = {}
) {
    return withApiMiddleware(handler, {
        ...options,
        requireAuth: options.requireAuth !== false,
        sanitizeInput: options.sanitizeInput !== false
    });
}

/**
 * Convenience wrapper for DELETE requests
 */
export function withDeleteMiddleware(
    handler: ApiHandler,
    options: Omit<ApiHandlerOptions, 'validation'> & {
        validation?: { query?: any }
    } = {}
) {
    return withApiMiddleware(handler, {
        ...options,
        requireAuth: options.requireAuth !== false,
        validation: options.validation ? { query: options.validation.query } : undefined
    });
}

/**
 * Schema definitions for common validations
 */
export const ValidationSchemas = {
    workspace: {
        create: {
            required: ['name'],
            types: { name: 'string', description: 'string' },
            lengths: {
                name: { min: 1, max: 100 },
                description: { max: 500 }
            }
        },
        update: {
            types: { name: 'string', description: 'string' },
            lengths: {
                name: { min: 1, max: 100 },
                description: { max: 500 }
            }
        }
    },
    workspaceMember: {
        add: {
            required: ['userId'],
            types: { userId: 'string', role: 'string' },
            patterns: {
                role: /^(owner|admin|read_only)$/
            }
        },
        updateRole: {
            required: ['role'],
            types: { role: 'string' },
            patterns: {
                role: /^(owner|admin|read_only)$/
            }
        }
    },
    applicant: {
        create: {
            required: ['workspaceId'],
            types: {
                workspaceId: 'string',
                name: 'string',
                email: 'string'
            },
            patterns: {
                email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            }
        },
        update: {
            types: {
                name: 'string',
                email: 'string',
                status: 'string'
            },
            patterns: {
                email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                status: /^(uploading|processing|analyzing|completed|failed)$/
            }
        }
    },
    query: {
        pagination: {
            types: { limit: 'string', offset: 'string' },
            patterns: {
                limit: /^\d+$/,
                offset: /^\d+$/
            }
        },
        search: {
            types: { search: 'string', status: 'string' },
            lengths: {
                search: { min: 1, max: 100 }
            }
        }
    }
};

/**
 * Rate limiting configurations
 */
export const RateLimits = {
    standard: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100
    },
    strict: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 20
    },
    fileUpload: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 5
    }
};
