import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  
  console.log('🔍 Middleware executing for:', url.pathname);
  
  // Check for waitlist bypass code
  const waitlistCode = url.searchParams.get('code');
  const validWaitlistCode = 'early-access-2025';
  
  // Check if user has valid waitlist code in cookie
  const hasValidAccess = request.cookies.get('waitlist-access')?.value === 'true';
  
  console.log('🎫 Has valid access:', hasValidAccess, 'Code provided:', waitlistCode);
  
  // Set cookie if valid code is provided
  if (waitlistCode === validWaitlistCode) {
    console.log('✅ Setting waitlist access cookie');
    const response = NextResponse.next();
    response.cookies.set('waitlist-access', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    });
    return response;
  }
  
  // Protected routes - these require waitlist access
  const isProtectedRoute = url.pathname.startsWith('/board') || 
                          url.pathname.startsWith('/call') || 
                          url.pathname.startsWith('/session') || 
                          url.pathname.startsWith('/setup') || 
                          url.pathname.startsWith('/overlay');
  
  console.log('🛡️ Is protected route:', isProtectedRoute);
  
  // Block access to protected routes without valid access
  if (isProtectedRoute && !hasValidAccess) {
    console.log('🚫 BLOCKING access to protected route - redirecting to root');
    const redirectUrl = new URL('/', request.url);
    return NextResponse.redirect(redirectUrl);
  }
  
  console.log('✅ Allowing request to continue');
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};