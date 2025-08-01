// Ashby to Applicants Data Mapping Service
// Maps data from ashby_candidates table to applicants table for unified processing

import { createClient } from '@/lib/supabase/server';
import type { Tables, TablesInsert } from '@/lib/database.types';

export type AshbyCandidate = Tables<'ashby_candidates'>;
export type Applicant = Tables<'applicants'>;
export type ApplicantInsert = TablesInsert<'applicants'>;

export interface MappingResult {
  success: boolean;
  applicantId?: string;
  error?: string;
  warnings?: string[];
}

export interface BulkMappingResult {
  success: boolean;
  results: Array<{
    ashbyId: string;
    applicantId?: string;
    error?: string;
    action: 'created' | 'updated' | 'skipped' | 'error';
  }>;
  summary: {
    created: number;
    updated: number;
    skipped: number;
    errors: number;
  };
}

/**
 * Maps an Ashby candidate to applicant data structure
 */
export function mapAshbyCandidateToApplicant(
  ashbyCandidate: AshbyCandidate,
  userId: string
): ApplicantInsert {
  // Extract primary email from emails array or use single email
  let primaryEmail = ashbyCandidate.email;
  if (!primaryEmail && ashbyCandidate.emails) {
    const emails = Array.isArray(ashbyCandidate.emails) 
      ? ashbyCandidate.emails 
      : JSON.parse(String(ashbyCandidate.emails));
    primaryEmail = emails[0];
  }

  // Extract primary phone from phone_numbers array or use single phone
  let primaryPhone = ashbyCandidate.phone || ashbyCandidate.phone_number;
  if (!primaryPhone && ashbyCandidate.phone_numbers) {
    const phones = Array.isArray(ashbyCandidate.phone_numbers) 
      ? ashbyCandidate.phone_numbers 
      : JSON.parse(String(ashbyCandidate.phone_numbers));
    primaryPhone = phones[0];
  }

  return {
    user_id: userId,
    name: ashbyCandidate.name,
    email: primaryEmail || '',
    phone: primaryPhone || null,
    linkedin_url: ashbyCandidate.linkedin_url || null,
    github_url: ashbyCandidate.github_url || null,
    status: 'imported_from_ashby',
    ashby_candidate_id: ashbyCandidate.ashby_id,
    ashby_sync_status: 'synced',
    ashby_last_synced_at: new Date().toISOString(),
    analysis: null, // Will be populated when analysis runs
  };
}

/**
 * Creates or updates an applicant from an Ashby candidate
 */
export async function importAshbyCandidateToApplicants(
  ashbyCandidate: AshbyCandidate,
  userId: string,
  options: {
    updateExisting?: boolean;
    skipIfExists?: boolean;
  } = {}
): Promise<MappingResult> {
  const supabase = await createClient();
  const warnings: string[] = [];

  try {
    // Check if applicant already exists
    const existingResult = await supabase
      .from('applicants')
      .select('id, ashby_candidate_id')
      .eq('user_id', userId)
      .or(`ashby_candidate_id.eq.${ashbyCandidate.ashby_id},email.eq.${ashbyCandidate.email}`)
      .single();

    if (existingResult.data) {
      if (options.skipIfExists) {
        return {
          success: true,
          applicantId: existingResult.data.id,
          warnings: ['Applicant already exists, skipped']
        };
      }

      if (options.updateExisting) {
        // Update existing applicant
        const applicantData = mapAshbyCandidateToApplicant(ashbyCandidate, userId);
        const { data, error } = await supabase
          .from('applicants')
          .update({
            ...applicantData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingResult.data.id)
          .select('id')
          .single();

        if (error) {
          return { success: false, error: `Failed to update applicant: ${error.message}` };
        }

        // Update the link in ashby_candidates table
        await supabase
          .from('ashby_candidates')
          .update({ unmask_applicant_id: data.id })
          .eq('ashby_id', ashbyCandidate.ashby_id);

        return {
          success: true,
          applicantId: data.id,
          warnings: ['Updated existing applicant']
        };
      } else {
        return {
          success: false,
          error: 'Applicant already exists. Use updateExisting option to update.'
        };
      }
    }

    // Validate required data
    if (!ashbyCandidate.email && (!ashbyCandidate.emails || 
        (Array.isArray(ashbyCandidate.emails) && ashbyCandidate.emails.length === 0))) {
      return { success: false, error: 'No email address found for candidate' };
    }

    // Create new applicant
    const applicantData = mapAshbyCandidateToApplicant(ashbyCandidate, userId);
    const { data, error } = await supabase
      .from('applicants')
      .insert(applicantData)
      .select('id')
      .single();

    if (error) {
      return { success: false, error: `Failed to create applicant: ${error.message}` };
    }

    // Update the link in ashby_candidates table
    await supabase
      .from('ashby_candidates')
      .update({ unmask_applicant_id: data.id })
      .eq('ashby_id', ashbyCandidate.ashby_id);

    return {
      success: true,
      applicantId: data.id,
      warnings: warnings.length > 0 ? warnings : undefined
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Import multiple Ashby candidates to applicants table
 */
export async function bulkImportAshbyCandidates(
  ashbyIds: string[],
  userId: string,
  options: {
    updateExisting?: boolean;
    skipIfExists?: boolean;
  } = {}
): Promise<BulkMappingResult> {
  const supabase = await createClient();

  try {
    // Fetch all Ashby candidates
    const { data: ashbyCandidates, error: fetchError } = await supabase
      .from('ashby_candidates')
      .select('*')
      .eq('user_id', userId)
      .in('ashby_id', ashbyIds);

    if (fetchError) {
      throw new Error(`Failed to fetch Ashby candidates: ${fetchError.message}`);
    }

    const results: BulkMappingResult['results'] = [];
    const summary = { created: 0, updated: 0, skipped: 0, errors: 0 };

    for (const candidate of ashbyCandidates) {
      const result = await importAshbyCandidateToApplicants(candidate, userId, options);
      
      let action: 'created' | 'updated' | 'skipped' | 'error';
      if (!result.success) {
        action = 'error';
        summary.errors++;
      } else if (result.warnings?.some(w => w.includes('already exists'))) {
        action = 'skipped';
        summary.skipped++;
      } else if (result.warnings?.some(w => w.includes('Updated'))) {
        action = 'updated';
        summary.updated++;
      } else {
        action = 'created';
        summary.created++;
      }

      results.push({
        ashbyId: candidate.ashby_id,
        applicantId: result.applicantId,
        error: result.error,
        action
      });
    }

    return {
      success: summary.errors === 0,
      results,
      summary
    };

  } catch (error) {
    return {
      success: false,
      results: [],
      summary: { created: 0, updated: 0, skipped: 0, errors: ashbyIds.length }
    };
  }
}

/**
 * Get available Ashby candidates that haven't been imported yet
 */
export async function getUnimportedAshbyCandidates(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('ashby_candidates')
    .select(`
      ashby_id,
      name,
      email,
      linkedin_url,
      github_url,
      has_resume,
      job_title,
      application_status,
      created_at: ashby_created_at,
      unmask_applicant_id
    `)
    .eq('user_id', userId)
    .is('unmask_applicant_id', null)
    .order('ashby_created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch unimported candidates: ${error.message}`);
  }

  return data;
}

/**
 * Get Ashby candidates that are already linked to applicants
 */
export async function getLinkedAshbyCandidates(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('ashby_candidates')
    .select(`
      ashby_id,
      name,
      email,
      unmask_applicant_id,
      applicants!inner(
        id,
        name,
        status,
        created_at
      )
    `)
    .eq('user_id', userId)
    .not('unmask_applicant_id', 'is', null);

  if (error) {
    throw new Error(`Failed to fetch linked candidates: ${error.message}`);
  }

  return data;
}

/**
 * Sync applicant data back to Ashby candidate record
 */
export async function syncApplicantToAshbyCandidate(
  applicantId: string,
  userId: string
): Promise<MappingResult> {
  const supabase = await createClient();

  try {
    // Get applicant data
    const { data: applicant, error: applicantError } = await supabase
      .from('applicants')
      .select('*')
      .eq('id', applicantId)
      .eq('user_id', userId)
      .single();

    if (applicantError || !applicant) {
      return { success: false, error: 'Applicant not found' };
    }

    if (!applicant.ashby_candidate_id) {
      return { success: false, error: 'Applicant not linked to Ashby candidate' };
    }

    // Update Ashby candidate with latest applicant data
    const { error: updateError } = await supabase
      .from('ashby_candidates')
      .update({
        analysis_result: applicant.analysis,
        analysis_status: applicant.analysis ? 'completed' : 'pending',
        analysis_completed_at: applicant.analysis ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('ashby_id', applicant.ashby_candidate_id)
      .eq('user_id', userId);

    if (updateError) {
      return { success: false, error: `Failed to sync to Ashby: ${updateError.message}` };
    }

    return { success: true };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}