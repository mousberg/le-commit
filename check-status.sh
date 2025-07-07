#!/bin/bash

# LeCommit Status Check Script
# Use this to check app status and view logs

# Configuration
VPS_IP="199.247.14.12"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📊 LeCommit Status Check${NC}"
echo "================================"

# Check if app is responding
echo -e "${YELLOW}🌐 Checking app response...${NC}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://${VPS_IP})
if [ "$HTTP_STATUS" == "200" ]; then
    echo -e "${GREEN}✅ App is responding (HTTP $HTTP_STATUS)${NC}"
else
    echo -e "${RED}❌ App returned HTTP $HTTP_STATUS${NC}"
fi

echo ""
echo -e "${YELLOW}🐳 Container Status:${NC}"
ssh root@${VPS_IP} 'docker ps | grep -E "CONTAINER|lecommit" || echo "No LeCommit container running"'

echo ""
echo -e "${YELLOW}📝 Recent Logs (last 20 lines):${NC}"
ssh root@${VPS_IP} 'docker logs --tail 20 lecommit-app 2>&1 || echo "Could not fetch logs"'

echo ""
echo -e "${BLUE}💡 Useful commands:${NC}"
echo "  View all logs:        ssh root@${VPS_IP} 'docker logs lecommit-app'"
echo "  Follow logs:          ssh root@${VPS_IP} 'docker logs -f lecommit-app'"
echo "  Restart container:    ssh root@${VPS_IP} 'docker restart lecommit-app'"
echo "  View env vars:        ssh root@${VPS_IP} 'docker exec lecommit-app env | grep -E \"TWILIO|ELEVEN\"'" 