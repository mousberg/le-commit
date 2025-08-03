# Supabase Storage Setup for Production

This guide covers setting up Supabase Storage for CV file management in production environments.

## 📦 Overview

The Unmask platform uses Supabase Storage to securely store and serve CV files. When candidates are imported from Ashby ATS, their CVs are downloaded and stored in Supabase for faster access and better control.

## 🚀 Production Setup

### 1. **Create Storage Bucket**

Navigate to your Supabase project dashboard → Storage → Create a new bucket:

- **Bucket name**: `candidate-cvs`
- **Public bucket**: ❌ (Keep it private)
- **File size limit**: `50MB`
- **Allowed MIME types**:
  ```
  application/pdf
  application/msword
  application/vnd.openxmlformats-officedocument.wordprocessingml.document
  text/plain
  ```

### 2. **Apply Database Migration**

Run this SQL in your production database (SQL Editor in Supabase):

```sql
-- Add storage path column to track stored CV files
ALTER TABLE ashby_candidates 
ADD COLUMN IF NOT EXISTS cv_storage_path text;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ashby_candidates_cv_storage_path 
ON ashby_candidates(cv_storage_path);

-- Comment to document the column
COMMENT ON COLUMN ashby_candidates.cv_storage_path IS 
'Path to stored CV file in Supabase Storage bucket candidate-cvs';
```

### 3. **Set Up Storage Policies**

In the Storage section → Policies tab, add these RLS policies for the `candidate-cvs` bucket:

#### **Insert Policy** - Users can upload CVs to their own folder
```sql
CREATE POLICY "Users can upload CVs to own folder" 
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (
  bucket_id = 'candidate-cvs' AND
  (auth.uid())::text = (string_to_array(name, '/'))[1]
);
```

#### **Select Policy** - Users can view/download their own CVs
```sql
CREATE POLICY "Users can view own CVs" 
ON storage.objects FOR SELECT TO authenticated 
USING (
  bucket_id = 'candidate-cvs' AND
  (auth.uid())::text = (string_to_array(name, '/'))[1]
);
```

#### **Update Policy** - Users can update/replace their own CVs
```sql
CREATE POLICY "Users can update own CVs" 
ON storage.objects FOR UPDATE TO authenticated 
USING (
  bucket_id = 'candidate-cvs' AND
  (auth.uid())::text = (string_to_array(name, '/'))[1]
);
```

#### **Delete Policy** - Users can delete their own CVs
```sql
CREATE POLICY "Users can delete own CVs" 
ON storage.objects FOR DELETE TO authenticated 
USING (
  bucket_id = 'candidate-cvs' AND
  (auth.uid())::text = (string_to_array(name, '/'))[1]
);
```

### 4. **Environment Variables**

Ensure your production server has these environment variables set:

```bash
# In /opt/lecommit/.env.local on VPS
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Ashby Integration (required for CV downloads)
ASHBY_API_KEY=your-ashby-api-key
```

### 5. **Deploy the Application**

After setting up storage, deploy the latest code:

```bash
./deploy.sh
```

## 🧪 Testing the Setup

### 1. **Test via Ashby Integration**

1. Navigate to `/ats` in your application
2. Click on a candidate with a CV
3. Click the CV button - it should:
   - First time: Download from Ashby → Store in Supabase → Open CV
   - Subsequent times: Open stored CV directly (faster)

### 2. **Verify Storage via Supabase Dashboard**

1. Go to Storage → `candidate-cvs` bucket
2. You should see folders organized by user ID:
   ```
   candidate-cvs/
   ├── {user-id-1}/
   │   ├── {candidate-id-1}/
   │   │   └── John_Doe_resume.pdf
   │   └── {candidate-id-2}/
   │       └── Jane_Smith_resume.pdf
   └── {user-id-2}/
       └── ...
   ```

### 3. **Check Storage Metrics**

Monitor storage usage in Supabase Dashboard → Storage → Usage tab

## 🔧 Troubleshooting

### **"Failed to store CV file" error**

1. Check storage bucket exists and policies are applied
2. Verify service role key is set in environment variables
3. Check Supabase Dashboard → Storage → Logs for errors

### **"Failed to generate download URL" error**

1. Ensure the file was uploaded successfully
2. Check RLS policies allow the user to select objects
3. Verify the storage path in database matches actual file location

### **CV downloads are slow**

This usually means CVs are being fetched from Ashby instead of storage:

1. Check if `cv_storage_path` is populated in database
2. Verify the stored file exists in storage bucket
3. Check API logs for any storage access errors

### **Storage quota exceeded**

1. Check current usage: Dashboard → Storage → Usage
2. Clean up old/unused files
3. Consider upgrading Supabase plan for more storage

## 🏠 Local Development

For local development with Supabase CLI:

1. **Start local Supabase**:
   ```bash
   cd frontend
   pnpm supabase start
   ```

2. **Apply migrations**:
   ```bash
   pnpm supabase migration up
   ```

3. **Storage URL**: `http://127.0.0.1:54321/storage/v1`

4. **Local files** are stored in: `./candidate-cvs/`

## 📊 Storage Architecture

```
User clicks CV button
         ↓
Check if CV in storage (cv_storage_path)
         ↓
    ┌────┴────┐
    │  Yes    │  No
    ↓         ↓
Get signed   Download from
URL from     Ashby API
storage      ↓
    ↓        Store in
    ↓        Supabase Storage
    ↓        ↓
    └────┬───┘
         ↓
   Return signed URL
         ↓
   Open CV in browser
```

## 🔐 Security Notes

- CVs are stored in private buckets with RLS policies
- Each user can only access CVs in their own folder
- Signed URLs expire after 1 hour
- File paths follow pattern: `{user_id}/{candidate_id}/{filename}`

## 📝 Maintenance

### **Regular Cleanup**

Remove orphaned files (CVs without matching database records):

```sql
-- Find storage paths in use
SELECT DISTINCT cv_storage_path 
FROM ashby_candidates 
WHERE cv_storage_path IS NOT NULL;
```

Then manually remove unused files from Storage dashboard.

### **Backup Considerations**

- Supabase automatically backs up your database (including cv_storage_path references)
- Storage files are persisted but consider external backups for critical data
- Use Supabase's point-in-time recovery for disaster recovery

---

For more information, see:
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [RLS Policies Guide](https://supabase.com/docs/guides/auth/row-level-security)