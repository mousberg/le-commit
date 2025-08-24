/**
 * Score Calculation Utilities
 * 
 * Implements the tiered scoring system based on data completeness:
 * - Both LinkedIn + CV: 30 points (premium analysis eligible)
 * - LinkedIn only: 20 points 
 * - CV only: 15 points
 * - Neither: 10 points (minimal data)
 * 
 * The same score field is later enhanced with AI analysis results.
 */

import { CandidateDataStatus } from './interfaces/applicant';

/**
 * Calculate score based on data completeness
 */
export function calculateScore(candidate: CandidateDataStatus): number {
  const { hasLinkedIn, hasCV } = candidate;
  
  if (hasLinkedIn && hasCV) return 30;     // Both data sources
  if (hasLinkedIn && !hasCV) return 20;   // LinkedIn only  
  if (!hasLinkedIn && hasCV) return 15;   // CV only
  return 10;                              // Neither source
}

/**
 * Check if LinkedIn URL exists (simplified - just presence check)
 */
export function hasLinkedInUrl(linkedin_url: string | null): boolean {
  return !!linkedin_url && linkedin_url.trim() !== '';
}

/**
 * Check if CV file exists (from Ashby resume file handle)
 */
export function hasResumeFileHandle(resume_file_handle: unknown): boolean {
  return !!(resume_file_handle && 
           resume_file_handle !== null && 
           (typeof resume_file_handle === 'object' || typeof resume_file_handle === 'string'));
}

/**
 * Calculate score for an applicant based on their data (simplified - presence only)
 */
export function calculateApplicantScore(
  linkedin_url: string | null,
  resume_file_handle: unknown
): number {
  const candidateStatus: CandidateDataStatus = {
    hasLinkedIn: hasLinkedInUrl(linkedin_url),
    hasCV: hasResumeFileHandle(resume_file_handle)
  };
  
  return calculateScore(candidateStatus);
}

/**
 * Check if candidate is eligible for manual AI analysis (score >= 30)
 */
export function isEligibleForAIAnalysis(score: number): boolean {
  return score >= 30;
}

/**
 * Check if candidate should trigger automatic Ashby webhook (score >= 30)
 */
export function shouldTriggerAshbyWebhook(score: number): boolean {
  return score >= 30;
}

/**
 * Get filter options for ATS UI
 */
export const SCORE_FILTER_OPTIONS = [
  { label: 'Complete Data (30+)', value: 30, description: 'Both LinkedIn and CV available' },
  { label: 'LinkedIn Only (20+)', value: 20, description: 'LinkedIn profile available' },
  { label: 'CV Only (15+)', value: 15, description: 'CV document available' },
  { label: 'Any Data (10+)', value: 10, description: 'At least some data available' },
  { label: 'All Candidates', value: 0, description: 'Show all candidates' }
] as const;

/**
 * Default filter for ATS UI (show all candidates)
 */
export const DEFAULT_SCORE_FILTER = 0;

/**
 * Get score tier description
 */
export function getScoreTierDescription(score: number): string {
  if (score >= 30) return 'Complete Data (LinkedIn + CV)';
  if (score >= 20) return 'LinkedIn Only';
  if (score >= 15) return 'CV Only';
  if (score >= 10) return 'Minimal Data';
  return 'No Data';
}

/**
 * Get score tier color for UI display
 */
export function getScoreTierColor(score: number): string {
  if (score >= 30) return 'text-green-600 bg-green-100';
  if (score >= 20) return 'text-blue-600 bg-blue-100';
  if (score >= 15) return 'text-yellow-600 bg-yellow-100';
  if (score >= 10) return 'text-orange-600 bg-orange-100';
  return 'text-gray-600 bg-gray-100';
}