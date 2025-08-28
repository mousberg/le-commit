import { NextResponse } from 'next/server';
import { startProcessing, validateRequestBody } from '@/lib/processing';
import { processCvPdf, validateAndCleanCvData } from '@/lib/profile-pdf';
import { CvData } from '@/lib/interfaces/cv';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  console.log('🔥 [DEBUG] CV-PROCESS API CALLED - NEW CODE');
  
  // Validate request body
  const bodyValidation = validateRequestBody(request);
  if (bodyValidation) return bodyValidation;

  const body = await request.json();
  const { applicant_id, file_id } = body;

  if (!applicant_id) {
    return NextResponse.json(
      { error: 'applicant_id is required' },
      { status: 400 }
    );
  }

  // Use the reusable processing function
  return startProcessing(
    applicant_id,
    'cv_status',
    async (applicant) => {
      const supabase = createServiceRoleClient();
      let cvData: CvData | null = null;

      if (file_id) {
        // Get file information
        const { data: fileRecord, error: fileError } = await supabase
          .from('files')
          .select('*')
          .eq('id', file_id)
          .single();

        if (fileError || !fileRecord) {
          throw new Error('File not found');
        }

        // Download file from Supabase Storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from(fileRecord.storage_bucket)
          .download(fileRecord.storage_path);

        if (downloadError || !fileData) {
          throw new Error(`Failed to download file: ${downloadError?.message}`);
        }

        // Convert blob to buffer and save as temporary file
        const buffer = Buffer.from(await fileData.arrayBuffer());
        const tempFilePath = `/app/temp_images/cv_${applicant_id}_${Date.now()}.pdf`;

        // Write to temp file (processCvPdf expects file path)
        const fs = await import('fs');
        fs.writeFileSync(tempFilePath, buffer);

        // Process CV
        console.log(`📄 [DEBUG] Processing CV file for applicant ${applicant_id} - NEW CODE DEPLOYED`);
        const rawCvData = await processCvPdf(tempFilePath, true, `cv_${applicant_id}`);
        cvData = validateAndCleanCvData(rawCvData);

        // Clean up temp file
        fs.unlinkSync(tempFilePath);

      } else if (applicant.cv_data) {
        // CV data already exists, just validate it
        cvData = validateAndCleanCvData(applicant.cv_data);
      } else {
        throw new Error('No CV file or data available');
      }

      // Extract name and email from CV data and update applicant info
      if (cvData) {
        const name = `${cvData.firstName} ${cvData.lastName}`.trim() || applicant.name;
        const email = cvData.email || applicant.email;

        // Update name and email in addition to cv_data
        await supabase
          .from('applicants')
          .update({ name, email })
          .eq('id', applicant_id);
      }

      return cvData;
    },
    'CV'
  );
}
