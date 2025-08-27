#!/bin/bash

# Simulate the trigger by manually calling the edge function 
# with data from actual candidates in the database

echo "🔄 Simulating Database Trigger → Edge Function Flow"
echo "================================================="

# First, get a real candidate from the database
echo "📊 Fetching candidate data from database..."

# You can run this in Supabase Studio to get candidate data:
echo "Run this query in Supabase Studio first:"
echo ""
echo "SELECT ashby_id, resume_file_handle, user_id"
echo "FROM ashby_candidates" 
echo "WHERE resume_file_handle IS NOT NULL"
echo "AND cv_file_id IS NULL"
echo "AND file_processing_status = 'pending'"
echo "LIMIT 1;"
echo ""

# Then use that data here:
read -p "Enter candidateId: " candidateId
read -p "Enter userId: " userId
read -p "Enter fileHandle (just the handle string): " fileHandle

echo ""
echo "🚀 Calling edge function with real data..."

curl -X POST 'http://127.0.0.1:54321/functions/v1/process-ashby-file' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU' \
  -H 'Content-Type: application/json' \
  -d "{
    \"candidateId\": \"$candidateId\",
    \"fileHandle\": {\"handle\": \"$fileHandle\"},
    \"userId\": \"$userId\",
    \"mode\": \"shared_file\"
  }"

echo ""
echo ""
echo "✅ Check the edge function logs for execution details"
echo "📊 Check Supabase Studio to verify status updates"
echo ""
echo "Expected flow:"
echo "1. Status: pending → processing"
echo "2. File download attempt from Ashby"
echo "3. Status: processing → completed (if successful) or failed (if error)"
