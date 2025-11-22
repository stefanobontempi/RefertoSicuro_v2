#!/bin/bash
# ============================================
# Deploy to Staging - Hetzner VPS
# ============================================
# Usage: ./scripts/deployment/deploy-staging.sh
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Load config
if [ -f .env.staging ]; then
    source .env.staging
else
    echo -e "${RED}Error: .env.staging not found${NC}"
    exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}RefertoSicuro - Staging Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Target: $STAGING_HOST"
echo "Path: $DEPLOY_PATH"
echo ""

# Confirm deployment
read -p "Deploy to staging? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

# Test connection
echo -e "${YELLOW}[1/7] Testing connection...${NC}"
ssh -i ${STAGING_SSH_KEY} $STAGING_USER@$STAGING_HOST "echo 'Connection OK'" || {
    echo -e "${RED}Error: Cannot connect to server${NC}"
    exit 1
}
echo -e "${GREEN}✓ Connection OK${NC}"
echo ""

# Create deployment archive
echo -e "${YELLOW}[2/7] Creating deployment package...${NC}"
tar -czf /tmp/refertosicuro-staging.tar.gz \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='__pycache__' \
    --exclude='.pytest_cache' \
    --exclude='.venv' \
    --exclude='*.pyc' \
    --exclude='.env*' \
    --exclude='volumes' \
    docker-compose.staging.yml \
    services/ \
    frontend/ \
    scripts/vault/
echo -e "${GREEN}✓ Package created${NC}"
echo ""

# Upload to server
echo -e "${YELLOW}[3/7] Uploading to server...${NC}"
scp -i ${STAGING_SSH_KEY} /tmp/refertosicuro-staging.tar.gz $STAGING_USER@$STAGING_HOST:$DEPLOY_PATH/
rm /tmp/refertosicuro-staging.tar.gz
echo -e "${GREEN}✓ Upload complete${NC}"
echo ""

# Extract and prepare
echo -e "${YELLOW}[4/7] Extracting files...${NC}"
ssh -i ${STAGING_SSH_KEY} $STAGING_USER@$STAGING_HOST << ENDSSH
    cd $DEPLOY_PATH
    tar -xzf refertosicuro-staging.tar.gz
    rm refertosicuro-staging.tar.gz
    ls -la
ENDSSH
echo -e "${GREEN}✓ Files extracted${NC}"
echo ""

# Stop existing containers
echo -e "${YELLOW}[5/7] Stopping existing containers...${NC}"
ssh -i ${STAGING_SSH_KEY} $STAGING_USER@$STAGING_HOST << ENDSSH
    cd $DEPLOY_PATH
    docker compose -f docker-compose.staging.yml down || true
ENDSSH
echo -e "${GREEN}✓ Containers stopped${NC}"
echo ""

# Build and start services
echo -e "${YELLOW}[6/7] Building and starting services...${NC}"
ssh -i ${STAGING_SSH_KEY} $STAGING_USER@$STAGING_HOST << ENDSSH
    cd $DEPLOY_PATH

    # Load environment
    if [ -f .env ]; then
        export \$(cat .env | xargs)
    fi

    # Pull base images
    docker compose -f docker-compose.staging.yml pull postgres mongodb redis rabbitmq vault grafana

    # Build custom images
    docker compose -f docker-compose.staging.yml build --no-cache

    # Start services
    docker compose -f docker-compose.staging.yml up -d

    # Show status
    docker compose -f docker-compose.staging.yml ps
ENDSSH
echo -e "${GREEN}✓ Services started${NC}"
echo ""

# Health checks
echo -e "${YELLOW}[7/7] Running health checks...${NC}"
sleep 10

# Check auth service
if curl -s -o /dev/null -w "%{http_code}" http://$STAGING_HOST:8010/health | grep -q "200"; then
    echo -e "${GREEN}✓ Auth Service: OK${NC}"
else
    echo -e "${RED}✗ Auth Service: Failed${NC}"
fi

# Check billing service
if curl -s -o /dev/null -w "%{http_code}" http://$STAGING_HOST:8012/health | grep -q "200"; then
    echo -e "${GREEN}✓ Billing Service: OK${NC}"
else
    echo -e "${RED}✗ Billing Service: Failed${NC}"
fi

# Check frontend
if curl -s -o /dev/null -w "%{http_code}" http://$STAGING_HOST:3000 | grep -q "200"; then
    echo -e "${GREEN}✓ Frontend: OK${NC}"
else
    echo -e "${RED}✗ Frontend: Failed${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Access services:"
echo "  Auth Service:    http://$STAGING_HOST:8010"
echo "  Billing Service: http://$STAGING_HOST:8012"
echo "  Admin Service:   http://$STAGING_HOST:8013"
echo "  Frontend:        http://$STAGING_HOST:3000"
echo "  Grafana:         http://$STAGING_HOST:3001"
echo "  RabbitMQ UI:     http://$STAGING_HOST:15672"
echo ""
echo "View logs:"
echo "  ssh $STAGING_USER@$STAGING_HOST 'cd $DEPLOY_PATH && docker compose -f docker-compose.staging.yml logs -f'"
echo ""
