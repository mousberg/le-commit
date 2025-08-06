import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getAshbyApiKey } from '@/lib/ashby/server';
import { withApiMiddleware, type ApiHandlerContext } from '@/lib/middleware/apiWrapper';

async function handleResumeDownload(context: ApiHandlerContext) {
  const body = await context.request.json();
  const { fileHandle, candidateId } = body;

  if (!fileHandle) {
    return NextResponse.json(
      { error: 'fileHandle is required', success: false },
      { status: 400 }
    );
  }

  const supabase = createServiceRoleClient();
  const { user } = context;

  // Get user's API key
  const { data: userData } = await supabase
    .from('users')
    .select('ashby_api_key')
    .eq('id', user.id)
    .single();

  const apiKey = getAshbyApiKey(userData?.ashby_api_key);
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Ashby integration not configured', success: false },
      { status: 500 }
    );
  }

  // Import AshbyClient dynamically
  const { AshbyClient } = await import('@/lib/ashby/client');
  
  const ashbyClient = new AshbyClient({
    apiKey: apiKey
  });

  // Extract the actual file handle ID from the JSON object
  let actualFileHandle: string;
  if (typeof fileHandle === 'string') {
    actualFileHandle = fileHandle;
  } else if (typeof fileHandle === 'object' && fileHandle !== null) {
    const fileHandleObj = fileHandle as { id?: string; fileHandle?: string; handle?: string };
    actualFileHandle = fileHandleObj.handle || fileHandleObj.id || fileHandleObj.fileHandle || '';
    if (!actualFileHandle) {
      return NextResponse.json(
        { error: 'Invalid file handle format', success: false },
        { status: 400 }
      );
    }
  } else {
    return NextResponse.json(
      { error: 'Invalid file handle format', success: false },
      { status: 400 }
    );
  }

  try {
    // Get the download URL from Ashby
    const fileResponse = await ashbyClient.getResumeUrl(actualFileHandle);

    if (!fileResponse.success || !fileResponse.results?.url) {
      return NextResponse.json(
        { 
          error: fileResponse.error?.message || 'Failed to get resume URL', 
          success: false
        },
        { status: 500 }
      );
    }

    // Download the file from Ashby
    const downloadResponse = await fetch(fileResponse.results.url);
    
    if (!downloadResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to download resume from Ashby', success: false },
        { status: 500 }
      );
    }

    const fileBuffer = await downloadResponse.arrayBuffer();
    const contentType = downloadResponse.headers.get('content-type') || 'application/pdf';
    
    // Determine file extension
    let extension = '.pdf';
    if (contentType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
      extension = '.docx';
    } else if (contentType.includes('application/msword')) {
      extension = '.doc';
    }

    // Create filename
    const fileName = candidateId ? `resume_${candidateId}${extension}` : `resume${extension}`;

    // Return the file as a direct download
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('Resume download error:', error);
    return NextResponse.json(
      { error: 'Failed to download resume', success: false },
      { status: 500 }
    );
  }
}

export const POST = withApiMiddleware(handleResumeDownload);