/**
 * API Middleware for ATS Access Control
 * Provides middleware functions to protect API routes
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAuthorizedForATS } from './ats-access';

/**
 * Middleware to check if the authenticated user is authorized for ATS access
 * Returns user if authorized, or NextResponse with error if not
 */
export async function withATSAuth(): Promise<{ user: { id: string; email?: string } } | NextResponse> {
  try {
    // Get authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', success: false },
        { status: 401 }
      );
    }

    // Check if user is authorized for ATS access
    if (!isAuthorizedForATS(user.email)) {
      return NextResponse.json(
        { 
          error: 'Access denied. ATS dashboard is restricted to authorized email domains.',
          success: false 
        },
        { status: 403 }
      );
    }

    return { user };
  } catch (error) {
    console.error('ATS auth middleware error:', error);
    return NextResponse.json(
      { error: 'Authentication failed', success: false },
      { status: 500 }
    );
  }
}