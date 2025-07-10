import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';
  
  // Define your domains
  const mainDomain = 'unmask.click';
  const appSubdomain = 'app.unmask.click';
  
  // For local development, handle localhost
  const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');
  
  // Check for waitlist bypass code
  const waitlistCode = url.searchParams.get('code');
  const validWaitlistCode = 'early-access-2025'; // You can change this to your desired code
  
  // Check if user has valid waitlist code in cookie
  const hasValidAccess = request.cookies.has('waitlist-access') || waitlistCode === validWaitlistCode;
  
  // Set cookie if valid code is provided
  if (waitlistCode === validWaitlistCode) {
    const response = NextResponse.next();
    response.cookies.set('waitlist-access', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    });
    return response;
  }
  
  // Protect app routes - redirect to landing if no valid access
  if (url.pathname.startsWith('/app') && !hasValidAccess) {
    url.pathname = '/landing';
    return NextResponse.redirect(url);
  }
  
  // For local development
  if (isLocalhost) {
    const subdomain = url.searchParams.get('subdomain');
    
    if (subdomain === 'app') {
      // Simulate app subdomain - check for valid access
      if (!hasValidAccess) {
        url.pathname = '/landing';
        return NextResponse.redirect(url);
      }
      return NextResponse.next();
    } else if (subdomain === 'www' || subdomain === null) {
      // Simulate main domain - serve landing page
      url.pathname = '/landing';
      return NextResponse.rewrite(url);
    }
  }
  
  // Production routing
  if (hostname === appSubdomain) {
    // app.unmask.click - check for valid access
    if (!hasValidAccess) {
      url.pathname = '/landing';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }
  
  if (hostname === mainDomain || hostname === `www.${mainDomain}`) {
    // unmask.click or www.unmask.click - serve landing page
    url.pathname = '/landing';
    return NextResponse.rewrite(url);
  }
  
  // Default behavior - redirect to landing page
  if (url.pathname === '/') {
    url.pathname = '/landing';
    return NextResponse.rewrite(url);
  }
  
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