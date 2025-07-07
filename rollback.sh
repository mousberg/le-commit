#!/bin/bash

# LeCommit Rollback Script
# Use this to quickly rollback to a previous version

set -e  # Exit on any error

# Configuration
VPS_IP="199.247.14.12"
REGISTRY_URL="lhr.vultrcr.com/lecommit1"
IMAGE_NAME="lecommit"
CONTAINER_NAME="lecommit-app"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${RED}⚠️  Starting LeCommit rollback...${NC}"

# Ask for confirmation
read -p "Are you sure you want to rollback? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Rollback cancelled."
    exit 1
fi

# SSH into VPS and run rollback commands
ssh root@${VPS_IP} << 'ENDSSH'
set -e

echo "📸 Current images available:"
docker images | grep lecommit

echo ""
echo "🛑 Stopping current container..."
docker stop lecommit-app || true
docker rm lecommit-app || true

echo "🔄 Starting previous container..."
# This will use the second-to-last image
IMAGE_ID=$(docker images lhr.vultrcr.com/lecommit1/lecommit --format "{{.ID}}" | sed -n '2p')

if [ -z "$IMAGE_ID" ]; then
    echo "❌ No previous image found to rollback to!"
    exit 1
fi

echo "Using image ID: $IMAGE_ID"
docker run -d \
  --name lecommit-app \
  --restart unless-stopped \
  -p 80:3000 \
  --env-file /opt/lecommit/.env.local \
  $IMAGE_ID

echo "✅ Rollback complete! Checking status..."
docker ps | grep lecommit-app
ENDSSH

echo -e "${GREEN}✅ Rollback completed!${NC}"
echo -e "${GREEN}🌐 Your app is live at: http://${VPS_IP}${NC}" 