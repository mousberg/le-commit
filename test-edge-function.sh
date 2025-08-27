#!/bin/bash

# Test script for the Ashby file processing edge function
# Run this after starting the edge function with: supabase functions serve

echo "🧪 Testing Ashby File Processing Edge Function"
echo "============================================="

# Test 1: Invalid request (missing parameters)
echo ""
echo "Test 1: Invalid request (missing candidateId)"
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/process-ashby-file' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU' \
  --header 'Content-Type: application/json' \
  --data '{"fileHandle":"test_handle","userId":"test_user_id"}'

echo ""
echo ""

# Test 2: Valid structure but fake data
echo "Test 2: Valid structure but fake data (should fail gracefully)"
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/process-ashby-file' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU' \
  --header 'Content-Type: application/json' \
  --data '{"candidateId":"fake_candidate","fileHandle":"fake_handle","userId":"fake_user_id"}'

echo ""
echo ""
echo "🔍 Check the edge function logs for detailed execution information"
echo "📊 Check Supabase Studio to see status updates in ashby_candidates table"
