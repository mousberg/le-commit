// Remove static import to prevent client-side bundling issues
import { NextResponse } from 'next/server'
import { isAuthorizedForATS } from '@/lib/auth/ats-access'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  if (code) {
    // Dynamic import to avoid pulling server code into client bundles
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Get user after successful session exchange to determine redirect
      const { data: { user } } = await supabase.auth.getUser()
      
      // Smart redirect: ATS for authorized domains, board for others
      let defaultRedirect = '/board'
      if (user?.email && isAuthorizedForATS(user.email)) {
        defaultRedirect = '/ats'
      }
      
      // if "next" is in param, use it as the redirect URL, otherwise use smart default
      const next = searchParams.get('next') ?? defaultRedirect
      
      const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
