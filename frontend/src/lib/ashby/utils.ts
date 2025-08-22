/**
 * Shared Ashby utilities (no React hooks)
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Get Ashby API key, prioritizing environment variable in development mode
 * @param userApiKey - API key from user's database record
 * @returns API key to use for Ashby requests
 */
export function getAshbyApiKey(userApiKey?: string | null): string | null {
  // In development mode, prioritize environment variable
  if (process.env.NODE_ENV === 'development' && process.env.ASHBY_API_KEY) {
    return process.env.ASHBY_API_KEY;
  }
  
  // Otherwise, use user's API key from database
  return userApiKey || null;
}

/**
 * Check if Ashby integration is configured for a user
 * @param userApiKey - API key from user's database record
 * @returns true if Ashby is configured
 */
export function isAshbyConfigured(userApiKey?: string | null): boolean {
  return !!getAshbyApiKey(userApiKey);
}

/**
 * Result type for Ashby ID lookup operations
 */
export interface AshbyLookupResult {
  success: boolean;
  ashbyId?: string;
  error?: string;
}

/**
 * Get Ashby candidate ID from applicant ID
 * Centralized function for consistent ashby_id lookups across all APIs
 * 
 * @param supabase - Supabase client instance
 * @param applicantId - The applicant ID to look up
 * @param userId - The user ID for security validation
 * @returns Promise with ashby_id or error
 */
export async function getAshbyIdFromApplicantId(
  supabase: SupabaseClient,
  applicantId: string,
  userId: string
): Promise<AshbyLookupResult> {
  try {
    // Validate inputs
    if (!applicantId || !userId) {
      return {
        success: false,
        error: 'Applicant ID and User ID are required'
      };
    }

    // Get ashby_id from applicant ID with security validation
    const { data: applicantData, error: applicantError } = await supabase
      .from('applicants')
      .select(`
        id,
        ashby_candidates!inner(
          ashby_id
        )
      `)
      .eq('id', applicantId)
      .eq('user_id', userId)
      .single();

    if (applicantError) {
      return {
        success: false,
        error: `Database error: ${applicantError.message}`
      };
    }

    if (!applicantData?.ashby_candidates?.[0]?.ashby_id) {
      return {
        success: false,
        error: 'Applicant not found or not linked to Ashby candidate'
      };
    }

    return {
      success: true,
      ashbyId: applicantData.ashby_candidates[0].ashby_id
    };

  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}