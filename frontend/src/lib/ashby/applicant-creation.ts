// Ashby Applicant Creation Utilities
// Implements simplified-ashby-processing-spec.md for pre-setting applicant statuses

export type ProcessingStatus = 'pending' | 'processing' | 'ready' | 'error' | 'not_provided' | 'skipped';

interface AshbyCandidate {
  linkedin_url?: string | null;
  github_url?: string | null;
  resume_file_handle?: Record<string, unknown> | string | null;
  base_score: number;
}

/**
 * Calculate base score for an Ashby candidate
 * Used during ashby_candidates table sync
 */
export function calculateBaseScore(
  linkedinUrl: string | null,
  resumeFileHandle: Record<string, unknown> | string | null
): number {
  const hasLinkedIn = Boolean(linkedinUrl);
  const hasResume = Boolean(resumeFileHandle);

  // Score calculation based on available data sources
  // Note: GitHub URL doesn't affect base score calculation per spec
  if (hasLinkedIn && hasResume) {
    return 30; // LinkedIn + CV - highest priority
  } else if (hasLinkedIn && !hasResume) {
    return 20; // LinkedIn only
  } else if (!hasLinkedIn && hasResume) {
    return 15; // CV only
  } else {
    return 10; // Neither - lowest priority
  }
}

/**
 * Determine initial processing status for applicant creation
 * Implements the spec logic for pre-setting statuses
 */
export function getInitialStatus(
  type: 'cv' | 'linkedin' | 'github',
  candidate: AshbyCandidate
): ProcessingStatus {
  // All statuses set to 'skipped' for low-score candidates
  if (candidate.base_score < 30) {
    return 'skipped';
  }
  
  // High-score candidates: 'pending' if data available, 'not_provided' if missing
  switch (type) {
    case 'cv':
      return candidate.resume_file_handle ? 'pending' : 'not_provided';
    case 'linkedin':
      return candidate.linkedin_url ? 'pending' : 'not_provided';
    case 'github':
      return candidate.github_url ? 'pending' : 'not_provided';
    default:
      return 'pending';
  }
}

/**
 * Create applicant data structure from Ashby candidate with pre-set statuses
 * This should be used when converting ashby_candidates to applicants
 */
export function createApplicantFromAshbyCandidate(
  ashbyCandidate: AshbyCandidate & {
    user_id: string;
    ashby_id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  }
) {
  return {
    user_id: ashbyCandidate.user_id,
    source: 'ashby' as const,
    name: ashbyCandidate.name,
    email: ashbyCandidate.email || null,
    phone: ashbyCandidate.phone || null,
    linkedin_url: ashbyCandidate.linkedin_url,
    github_url: ashbyCandidate.github_url,
    cv_file_id: null, // Will be populated when CV is processed
    score: ashbyCandidate.base_score,
    // Pre-set processing statuses based on base_score and available data
    cv_status: getInitialStatus('cv', ashbyCandidate),
    li_status: getInitialStatus('linkedin', ashbyCandidate),
    gh_status: getInitialStatus('github', ashbyCandidate),
    ai_status: ashbyCandidate.base_score >= 30 ? 'pending' as ProcessingStatus : 'skipped' as ProcessingStatus,
    // Link back to ashby_candidates record
    ashby_candidate_id: ashbyCandidate.ashby_id
  };
}