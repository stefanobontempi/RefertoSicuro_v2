#!/bin/bash
# ============================================
# Setup Staging Server - Hetzner VPS
# ============================================
# Usage: ./scripts/deployment/setup-staging-server.sh
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load staging config
if [ -f .env.staging ]; then
    source .env.staging
else
    echo -e "${RED}Error: .env.staging not found${NC}"
    exit 1
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}RefertoSicuro - Staging Server Setup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Server: $STAGING_HOST"
echo "User: $STAGING_USER"
echo ""

# Test SSH connection
echo -e "${YELLOW}[1/8] Testing SSH connection...${NC}"
ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no $STAGING_USER@$STAGING_HOST "echo 'SSH connection successful'" || {
    echo -e "${RED}Error: Cannot connect to server${NC}"
    exit 1
}
echo -e "${GREEN}✓ SSH connection OK${NC}"
echo ""

# Update system
echo -e "${YELLOW}[2/11] Updating system packages...${NC}"
ssh $STAGING_USER@$STAGING_HOST << 'ENDSSH'
    apt-get update
    apt-get upgrade -y
    apt-get install -y curl git vim htop sudo build-essential procps file
ENDSSH
echo -e "${GREEN}✓ System updated${NC}"
echo ""

# Create stefano user with sudo
echo -e "${YELLOW}[3/11] Creating user 'stefano' with sudo access...${NC}"
ssh $STAGING_USER@$STAGING_HOST << 'ENDSSH'
    # Create user
    useradd -m -s /bin/bash stefano

    # Add to sudo group
    usermod -aG sudo stefano

    # Enable sudo without password
    echo "stefano ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/stefano
    chmod 0440 /etc/sudoers.d/stefano

    # Create .ssh directory
    mkdir -p /home/stefano/.ssh
    chmod 700 /home/stefano/.ssh

    # Copy root's authorized_keys to stefano
    if [ -f /root/.ssh/authorized_keys ]; then
        cp /root/.ssh/authorized_keys /home/stefano/.ssh/
        chown -R stefano:stefano /home/stefano/.ssh
        chmod 600 /home/stefano/.ssh/authorized_keys
    fi

    echo "User stefano created with sudo access"
ENDSSH
echo -e "${GREEN}✓ User created${NC}"
echo ""

# Install Homebrew for stefano
echo -e "${YELLOW}[4/11] Installing Homebrew for stefano...${NC}"
ssh $STAGING_USER@$STAGING_HOST << 'ENDSSH'
    # Install Homebrew as stefano user
    su - stefano << 'STEFANO_EOF'
        NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

        # Add Homebrew to stefano's PATH
        echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.bashrc
        eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"

        # Verify installation
        brew --version
STEFANO_EOF
ENDSSH
echo -e "${GREEN}✓ Homebrew installed for stefano${NC}"
echo ""

# Install Claude Code
echo -e "${YELLOW}[5/11] Installing Claude Code...${NC}"
ssh $STAGING_USER@$STAGING_HOST << 'ENDSSH'
    su - stefano << 'STEFANO_EOF'
        eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
        brew install --cask claude-code || brew install claude-code
        claude --version || echo "Claude Code installed (CLI)"
STEFANO_EOF
ENDSSH
echo -e "${GREEN}✓ Claude Code installed${NC}"
echo ""

# Install Docker
echo -e "${YELLOW}[6/11] Installing Docker...${NC}"
ssh $STAGING_USER@$STAGING_HOST << 'ENDSSH'
    # Remove old versions
    apt-get remove -y docker docker-engine docker.io containerd runc || true

    # Install dependencies
    apt-get install -y ca-certificates curl gnupg lsb-release

    # Add Docker's official GPG key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    # Set up repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker Engine
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Add stefano to docker group
    usermod -aG docker stefano

    # Verify installation
    docker --version
    docker compose version
ENDSSH
echo -e "${GREEN}✓ Docker installed & stefano added to docker group${NC}"
echo ""

# Configure firewall
echo -e "${YELLOW}[7/11] Configuring firewall...${NC}"
ssh $STAGING_USER@$STAGING_HOST << 'ENDSSH'
    # Install UFW
    apt-get install -y ufw

    # Default policies
    ufw default deny incoming
    ufw default allow outgoing

    # Allow SSH
    ufw allow 22/tcp

    # Allow HTTP/HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp

    # Allow microservices ports (8010-8020)
    ufw allow 8010:8020/tcp

    # Allow frontend
    ufw allow 3000/tcp

    # Allow monitoring (Grafana)
    ufw allow 3001/tcp

    # Enable firewall
    ufw --force enable
    ufw status
ENDSSH
echo -e "${GREEN}✓ Firewall configured${NC}"
echo ""

# Create deployment directory
echo -e "${YELLOW}[8/11] Creating deployment directory...${NC}"
ssh $STAGING_USER@$STAGING_HOST << ENDSSH
    mkdir -p $DEPLOY_PATH
    mkdir -p $DEPLOY_PATH/volumes
    mkdir -p $DEPLOY_PATH/backups
    mkdir -p $DEPLOY_PATH/logs

    ls -la $DEPLOY_PATH
ENDSSH
echo -e "${GREEN}✓ Directories created${NC}"
echo ""

# Setup Docker networks
echo -e "${YELLOW}[9/11] Creating Docker networks...${NC}"
ssh $STAGING_USER@$STAGING_HOST << 'ENDSSH'
    docker network create refertosicuro-network || true
ENDSSH
echo -e "${GREEN}✓ Docker networks ready${NC}"
echo ""

# Generate secrets
echo -e "${YELLOW}[10/11] Generating staging secrets...${NC}"
ssh $STAGING_USER@$STAGING_HOST << ENDSSH
    # Generate random passwords
    DB_PASSWORD=\$(openssl rand -base64 32)
    MONGO_PASSWORD=\$(openssl rand -base64 32)
    REDIS_PASSWORD=\$(openssl rand -base64 32)
    RABBITMQ_PASSWORD=\$(openssl rand -base64 32)
    VAULT_TOKEN=\$(openssl rand -base64 32)

    # Save to .env file
    cat > $DEPLOY_PATH/.env << EOF
# Auto-generated secrets - $(date)
POSTGRES_PASSWORD=\$DB_PASSWORD
MONGODB_PASSWORD=\$MONGO_PASSWORD
REDIS_PASSWORD=\$REDIS_PASSWORD
RABBITMQ_PASSWORD=\$RABBITMQ_PASSWORD
VAULT_TOKEN=\$VAULT_TOKEN
EOF

    echo "Secrets generated and saved to $DEPLOY_PATH/.env"
ENDSSH
echo -e "${GREEN}✓ Secrets generated${NC}"
echo ""

# Configure swap (important for 2GB RAM server)
echo -e "${YELLOW}[11/11] Configuring swap + SSH hardening...${NC}"
ssh $STAGING_USER@$STAGING_HOST << 'ENDSSH'
    # Create 4GB swap file
    fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1G count=4
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile

    # Make swap permanent
    echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab

    # Optimize swappiness for server
    echo 'vm.swappiness=10' | tee -a /etc/sysctl.conf
    sysctl -p

    # SSH Hardening
    # Disable root login
    sed -i 's/^PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config

    # Disable password authentication (only key-based)
    sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
    sed -i 's/^#*ChallengeResponseAuthentication.*/ChallengeResponseAuthentication no/' /etc/ssh/sshd_config

    # Enable public key authentication
    sed -i 's/^#*PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config

    # Restart SSH to apply changes
    systemctl restart sshd

    echo "SSH hardened: root login disabled, password auth disabled"

    # Verify swap
    free -h
ENDSSH
echo -e "${GREEN}✓ Swap configured & SSH hardened${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Staging server setup complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Deploy application: ./scripts/deployment/deploy-staging.sh"
echo "2. Access services at: http://$STAGING_HOST:PORT"
echo ""
echo "Important files on server:"
echo "  - Application: $DEPLOY_PATH"
echo "  - Secrets: $DEPLOY_PATH/.env"
echo "  - Logs: $DEPLOY_PATH/logs"
echo "  - Backups: $DEPLOY_PATH/backups"
echo ""
