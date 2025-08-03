import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processCvPdf, validateAndCleanCvData } from '@/lib/profile-pdf';
import { CvData } from '@/lib/interfaces/cv';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { applicant_id, file_id } = body;

    if (!applicant_id) {
      return NextResponse.json(
        { error: 'applicant_id is required' },
        { status: 400 }
      );
    }

    console.log(`🔄 Starting CV processing for applicant ${applicant_id}`);

    // Get server-side Supabase client with service role
    const supabase = await createClient();

    // Get the applicant record
    const { data: applicant, error: applicantError } = await supabase
      .from('applicants')
      .select('*')
      .eq('id', applicant_id)
      .single();

    if (applicantError || !applicant) {
      console.error('Failed to get applicant:', applicantError);
      return NextResponse.json(
        { error: 'Applicant not found' },
        { status: 404 }
      );
    }

    // Update status to processing
    await supabase
      .from('applicants')
      .update({ cv_status: 'processing' })
      .eq('id', applicant_id);

    let cvData: CvData | null = null;

    try {
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
        const tempFilePath = `/tmp/cv_${applicant_id}_${Date.now()}.pdf`;
        
        // Write to temp file (processCvPdf expects file path)
        const fs = await import('fs');
        fs.writeFileSync(tempFilePath, buffer);

        // Process CV
        console.log(`📄 Processing CV file for applicant ${applicant_id}`);
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

      // Extract name and email from CV data
      let name = applicant.name;
      let email = applicant.email;

      if (cvData) {
        name = `${cvData.firstName} ${cvData.lastName}`.trim() || applicant.name;
        email = cvData.email || applicant.email;
      }

      // Update applicant with processed CV data
      const { error: updateError } = await supabase
        .from('applicants')
        .update({
          cv_data: cvData,
          cv_status: 'ready',
          name,
          email,
          status: 'processing' // Keep overall status as processing until all done
        })
        .eq('id', applicant_id);

      if (updateError) {
        throw new Error(`Failed to update applicant: ${updateError.message}`);
      }

      console.log(`✅ CV processing completed for applicant ${applicant_id}`);

      return NextResponse.json({
        success: true,
        applicant_id,
        cv_data: cvData
      });

    } catch (processingError) {
      console.error(`❌ CV processing failed for applicant ${applicant_id}:`, processingError);

      // Update status to error
      await supabase
        .from('applicants')
        .update({
          cv_status: 'error',
          cv_data: {
            error: processingError instanceof Error ? processingError.message : 'CV processing failed',
            processed_at: new Date().toISOString()
          }
        })
        .eq('id', applicant_id);

      return NextResponse.json({
        success: false,
        error: processingError instanceof Error ? processingError.message : 'CV processing failed',
        applicant_id
      }, { status: 500 });
    }

  } catch (error) {
    console.error('CV processing endpoint error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}