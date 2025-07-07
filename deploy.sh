#!/bin/bash

# LeCommit Deployment Script
# This script builds, pushes, and deploys updates to your Vultr VPS

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

echo -e "${GREEN}🚀 Starting LeCommit deployment...${NC}"

# Step 1: Build the Docker image for AMD64
echo -e "${YELLOW}📦 Building Docker image for linux/amd64...${NC}"
docker buildx build --platform linux/amd64 -t ${REGISTRY_URL}/${IMAGE_NAME}:latest .

# Step 2: Push to Vultr Container Registry
echo -e "${YELLOW}⬆️  Pushing image to Vultr Container Registry...${NC}"
docker push ${REGISTRY_URL}/${IMAGE_NAME}:latest

# Step 3: Deploy to VPS
echo -e "${YELLOW}🔄 Deploying to VPS...${NC}"

# SSH into VPS and run deployment commands
ssh root@${VPS_IP} << 'ENDSSH'
set -e

echo "🔽 Pulling latest image..."
docker pull lhr.vultrcr.com/lecommit1/lecommit:latest

echo "🛑 Stopping old container..."
docker stop lecommit-app || true
docker rm lecommit-app || true

echo "🚀 Starting new container..."
docker run -d \
  --name lecommit-app \
  --restart unless-stopped \
  -p 80:3000 \
  --env-file /opt/lecommit/.env.local \
  lhr.vultrcr.com/lecommit1/lecommit:latest

echo "🧹 Cleaning up old images..."
docker image prune -f

echo "✅ Deployment complete! Checking status..."
docker ps | grep lecommit-app
ENDSSH

echo -e "${GREEN}✨ Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Your app is live at: http://${VPS_IP}${NC}"

# Optional: Check if the app is responding
echo -e "${YELLOW}🔍 Checking app status...${NC}"
if curl -s -o /dev/null -w "%{http_code}" http://${VPS_IP} | grep -q "200"; then
    echo -e "${GREEN}✅ App is responding correctly!${NC}"
else
    echo -e "${RED}⚠️  Warning: App might not be responding correctly. Check logs with:${NC}"
    echo -e "${RED}   ssh root@${VPS_IP} 'docker logs lecommit-app'${NC}"
fi 