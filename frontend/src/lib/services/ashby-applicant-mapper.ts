// Ashby to Applicants Data Mapping Service - DISABLED FOR NEW ARCHITECTURE
// TODO: Re-implement Ashby integration with new event-driven architecture

/* eslint-disable @typescript-eslint/no-unused-vars */
import { Applicant } from '@/lib/interfaces/applicant';

// Placeholder types for build compatibility
export type AshbyCandidate = Record<string, unknown>;
export type ApplicantInsert = Partial<Applicant>;

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
    success: boolean;
    applicantId?: string;
    error?: string;
    warnings?: string[];
  }>;
  totalProcessed: number;
  successCount: number;
  errorCount: number;
}

/**
 * STUBBED - Maps an Ashby candidate to our applicants table structure
 * TODO: Re-implement with new event-driven architecture
 */
function mapAshbyToApplicant(_ashbyCandidate: AshbyCandidate, userId: string): ApplicantInsert {
  return {
    user_id: userId,
    name: 'Ashby Import - TODO',
    email: '',
    status: 'uploading'
  };
}

/**
 * STUBBED - Creates or updates an applicant from an Ashby candidate
 * TODO: Re-implement with new event-driven architecture
 */
export async function importAshbyCandidateToApplicants(
  _ashbyCandidate: AshbyCandidate,
  _userId: string,
  _options: {
    updateExisting?: boolean;
    skipIfExists?: boolean;
  } = {}
): Promise<MappingResult> {
  return {
    success: false,
    error: 'Ashby integration disabled - TODO: Re-implement with new architecture'
  };
}

/**
 * STUBBED - Bulk imports multiple Ashby candidates
 * TODO: Re-implement with new event-driven architecture
 */
export async function bulkImportAshbyCandidates(
  ashbyCandidates: AshbyCandidate[],
  _userId: string,
  _options: {
    updateExisting?: boolean;
    skipIfExists?: boolean;
    batchSize?: number;
  } = {}
): Promise<BulkMappingResult> {
  return {
    success: false,
    results: [],
    totalProcessed: 0,
    successCount: 0,
    errorCount: ashbyCandidates.length
  };
}

/**
 * STUBBED - Gets mapping statistics for a user
 * TODO: Re-implement with new event-driven architecture
 */
export async function getMappingStats(_userId: string): Promise<{
  totalAshbyCandidates: number;
  totalApplicants: number;
  syncedApplicants: number;
  pendingSync: number;
  lastSyncDate?: string;
}> {
  return {
    totalAshbyCandidates: 0,
    totalApplicants: 0,
    syncedApplicants: 0,
    pendingSync: 0
  };
}

// Add missing exports that are imported elsewhere
export async function getLinkedAshbyCandidates(_userId: string): Promise<AshbyCandidate[]> {
  return [];
}

export async function getUnimportedAshbyCandidates(_userId: string): Promise<AshbyCandidate[]> {
  return [];
}