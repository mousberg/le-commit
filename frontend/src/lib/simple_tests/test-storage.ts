import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testStorage() {
  console.log('Testing Supabase Storage...');
  console.log('Supabase URL:', supabaseUrl);
  
  try {
    // List existing buckets
    console.log('\n1. Listing buckets...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      return;
    }
    
    console.log('Available buckets:', buckets);
    
    // Test file upload
    console.log('\n2. Testing file upload...');
    const testContent = 'This is a test CV file content';
    const fileName = `test/test_cv_${Date.now()}.txt`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('candidate-cvs')
      .upload(fileName, new Blob([testContent], { type: 'text/plain' }), {
        contentType: 'text/plain',
        upsert: true
      });
    
    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return;
    }
    
    console.log('File uploaded successfully:', uploadData);
    
    // List files in the bucket
    console.log('\n3. Listing files in bucket...');
    const { data: files, error: listError } = await supabase.storage
      .from('candidate-cvs')
      .list('test', {
        limit: 10
      });
    
    if (listError) {
      console.error('Error listing files:', listError);
    } else {
      console.log('Files in bucket:', files);
    }
    
    // Generate signed URL
    console.log('\n4. Generating signed URL...');
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('candidate-cvs')
      .createSignedUrl(uploadData.path, 3600); // 1 hour expiry
    
    if (signedUrlError) {
      console.error('Error creating signed URL:', signedUrlError);
    } else {
      console.log('Signed URL:', signedUrlData.signedUrl);
    }
    
    // Download file
    console.log('\n5. Downloading file...');
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('candidate-cvs')
      .download(uploadData.path);
    
    if (downloadError) {
      console.error('Error downloading file:', downloadError);
    } else {
      const text = await downloadData.text();
      console.log('Downloaded content:', text);
    }
    
    // Clean up - delete test file
    console.log('\n6. Cleaning up test file...');
    const { error: deleteError } = await supabase.storage
      .from('candidate-cvs')
      .remove([uploadData.path]);
    
    if (deleteError) {
      console.error('Error deleting file:', deleteError);
    } else {
      console.log('Test file deleted successfully');
    }
    
    console.log('\n✅ Storage test completed successfully!');
    
  } catch (error) {
    console.error('Unexpected error during storage test:', error);
  }
}

// Run the test
testStorage();