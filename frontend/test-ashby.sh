#!/bin/bash

# Ashby Integration Test Script
# This script provides easy commands to test the Ashby integration

echo "🧪 Ashby Integration Test Suite"
echo "================================"

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local file not found!"
    echo "Please copy .env.example to .env.local and configure your Ashby API key"
    exit 1
fi

# Source environment variables
source .env.local

# Check required environment variables
if [ -z "$ASHBY_API_KEY" ]; then
    echo "❌ ASHBY_API_KEY not set in .env.local"
    echo "Please add your Ashby API key to .env.local"
    exit 1
fi

echo "✅ Environment configured"
echo ""

# Function to run API test
test_api() {
    local limit=${1:-3}
    local include_resume=${2:-false}
    local create_applicants=${3:-false}
    
    echo "🔍 Testing API endpoint with limit=$limit, include_resume=$include_resume, create_applicants=$create_applicants"
    
    curl -s -X GET "http://localhost:3000/api/ashby/test?limit=$limit&include_resume=$include_resume&create_applicants=$create_applicants&test=true" \
        -H "Content-Type: application/json" | jq '.'
}

# Function to run direct script test
test_script() {
    echo "🔍 Running direct TypeScript test script"
    cd frontend && npm run test:ashby
}

# Function to test connection only
test_connection() {
    echo "🔍 Testing basic connection"
    
    curl -s -X POST "http://localhost:3000/api/ashby/test" \
        -H "Content-Type: application/json" \
        -d '{"action": "test_connection"}' | jq '.'
}

# Main menu
echo "Select test type:"
echo "1. Quick connection test"
echo "2. Fetch 3 candidates (API endpoint)"
echo "3. Fetch 5 candidates with resume info"
echo "4. Fetch and create applicants in Unmask"
echo "5. Run comprehensive script test"
echo "6. Custom test"
echo ""

read -p "Enter choice (1-6): " choice

case $choice in
    1)
        test_connection
        ;;
    2)
        test_api 3 false false
        ;;
    3)
        test_api 5 true false
        ;;
    4)
        echo "⚠️  This will create applicants in your database!"
        read -p "Are you sure? (y/N): " confirm
        if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
            test_api 3 false true
        else
            echo "Cancelled"
        fi
        ;;
    5)
        test_script
        ;;
    6)
        read -p "Enter limit (default 3): " custom_limit
        read -p "Include resume info? (y/N): " custom_resume
        read -p "Create applicants? (y/N): " custom_create
        
        limit=${custom_limit:-3}
        resume_flag="false"
        create_flag="false"
        
        if [ "$custom_resume" = "y" ] || [ "$custom_resume" = "Y" ]; then
            resume_flag="true"
        fi
        
        if [ "$custom_create" = "y" ] || [ "$custom_create" = "Y" ]; then
            create_flag="true"
        fi
        
        test_api $limit $resume_flag $create_flag
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "🎉 Test completed!"
echo ""
echo "Next steps:"
echo "1. Review the output above"
echo "2. Check your Ashby dashboard for any test tags/updates"
echo "3. If testing candidate creation, check the Unmask dashboard"
echo "4. Configure webhook URL in Ashby: http://your-domain.com/api/ashby/webhook"