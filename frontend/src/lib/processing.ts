import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// Type for processing status fields
export type ProcessingStatusField = 'cv_status' | 'li_status' | 'gh_status' | 'ai_status';

// Type for data fields corresponding to status fields
export type ProcessingDataField = 'cv_data' | 'li_data' | 'gh_data' | 'ai_data';

// Map status fields to their corresponding data fields
const statusToDataField: Record<ProcessingStatusField, ProcessingDataField> = {
  'cv_status': 'cv_data',
  'li_status': 'li_data', 
  'gh_status': 'gh_data',
  'ai_status': 'ai_data'
};

// Type for the processor function
export type ProcessorFunction<T = unknown> = (applicant: Record<string, unknown>) => Promise<T>;

// Result type for successful processing
export interface ProcessingResult<T = unknown> {
  success: true;
  applicant_id: string;
  data: T;
}

// Result type for processing conflicts/errors
export interface ProcessingError {
  success: false;
  error: string;
  applicant_id: string;
  status?: number;
}

/**
 * Handle processing conflicts when atomic update fails
 */
async function handleProcessingConflict(
  applicantId: string, 
  statusField: ProcessingStatusField
): Promise<NextResponse> {
  const supabase = createServiceRoleClient();
  
  const { data: applicant } = await supabase
    .from('applicants')
    .select('*')
    .eq('id', applicantId)
    .single();

  if (!applicant) {
    return NextResponse.json(
      { success: false, error: 'Applicant not found', applicant_id: applicantId },
      { status: 404 }
    );
  }

  const currentStatus = applicant[statusField];
  const dataField = statusToDataField[statusField];

  if (currentStatus === 'processing') {
    return NextResponse.json(
      { 
        success: false, 
        error: `${statusField.replace('_status', '')} processing already in progress`,
        applicant_id: applicantId 
      },
      { status: 409 }
    );
  }

  if (currentStatus === 'ready') {
    return NextResponse.json(
      { 
        success: true, 
        applicant_id: applicantId, 
        data: applicant[dataField] 
      },
      { status: 200 }
    );
  }

  return NextResponse.json(
    { success: false, error: 'Failed to start processing', applicant_id: applicantId },
    { status: 500 }
  );
}

/**
 * Validate request body for empty content
 */
export function validateRequestBody(request: Request): NextResponse | null {
  const contentLength = request.headers.get('content-length');
  if (!contentLength || contentLength === '0') {
    return NextResponse.json(
      { error: 'Empty request body' },
      { status: 400 }
    );
  }
  return null;
}

/**
 * Start processing with atomic status management
 * 
 * @param applicantId - The applicant ID to process
 * @param statusField - Which status field to update (cv_status, li_status, etc.)
 * @param processor - Function that performs the actual processing
 * @param processingName - Name for logging (e.g., 'GitHub', 'CV')
 * @returns NextResponse with processing result
 */
export async function startProcessing<T = unknown>(
  applicantId: string,
  statusField: ProcessingStatusField,
  processor: ProcessorFunction<T>,
  processingName: string
): Promise<NextResponse> {
  try {
    console.log(`🚀 Starting ${processingName} processing for applicant ${applicantId}`);

    const supabase = createServiceRoleClient();
    const dataField = statusToDataField[statusField];

    // Atomically set status to processing (prevents race conditions)
    const { data: applicant, error: updateError } = await supabase
      .from('applicants')
      .update({ [statusField]: 'processing' })
      .eq('id', applicantId)
      .neq(statusField, 'processing') // Only update if not already processing
      .select('*')
      .single();

    if (updateError || !applicant) {
      // Handle conflicts (already processing, not found, etc.)
      return await handleProcessingConflict(applicantId, statusField);
    }

    try {
      console.log(`⚡ Processing ${processingName} account for ${applicantId}`);

      // Run the actual processing
      const processedData = await processor(applicant);

      // Update applicant with processed data
      const { error: dataUpdateError } = await supabase
        .from('applicants')
        .update({
          [dataField]: processedData,
          [statusField]: 'ready'
        })
        .eq('id', applicantId);

      if (dataUpdateError) {
        throw new Error(`Failed to update applicant: ${dataUpdateError.message}`);
      }

      console.log(`✅ ${processingName} processing completed for applicant ${applicantId}`);

      return NextResponse.json({
        success: true,
        applicant_id: applicantId,
        [dataField]: processedData
      });

    } catch (processingError) {
      console.error(`❌ ${processingName} processing failed for applicant ${applicantId}:`, processingError);

      // Update status to error
      await supabase
        .from('applicants')
        .update({
          [statusField]: 'error',
          [dataField]: {
            error: processingError instanceof Error ? processingError.message : `${processingName} processing failed`,
            processed_at: new Date().toISOString()
          }
        })
        .eq('id', applicantId);

      return NextResponse.json({
        success: false,
        error: processingError instanceof Error ? processingError.message : `${processingName} processing failed`,
        applicant_id: applicantId
      }, { status: 500 });
    }

  } catch (error) {
    console.error(`${processingName} processing endpoint error:`, error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}