# Deployment Scripts

Automated deployment scripts for RefertoSicuro v2.

## 📁 Files

### `setup-staging-server.sh`

**Purpose**: Initial VPS server setup (run once)

**What it does**:

1. Updates system packages
2. Creates user 'stefano' with sudo (no password)
3. Copies SSH keys
4. Installs Docker & Docker Compose
5. Adds stefano to docker group
6. Configures firewall (UFW)
7. Creates deployment directories
8. Sets up Docker networks
9. Generates random secrets
10. Configures swap + SSH hardening

**Usage**:

```bash
./scripts/deployment/setup-staging-server.sh
```

**Requirements**:

- SSH key generated (`~/.ssh/refertosicuro_staging`)
- Root access to server
- `.env.staging` configured

---

### `deploy-staging.sh`

**Purpose**: Deploy application to staging (repeatable)

**What it does**:

1. Tests connection
2. Creates deployment package
3. Uploads to server
4. Stops existing containers
5. Builds Docker images
6. Starts all services
7. Runs health checks

**Usage**:

```bash
./scripts/deployment/deploy-staging.sh
```

**Requirements**:

- Server already set up (ran `setup-staging-server.sh`)
- SSH key configured
- `.env.staging` configured

---

## 🔐 Security

**Best Practices Implemented**:

- ✅ Dedicated non-root user (stefano) with sudo
- ✅ SSH key-based authentication only
- ✅ Root login disabled
- ✅ Password authentication disabled
- ✅ Firewall (UFW) with minimal ports
- ✅ Random generated secrets
- ✅ Docker group for stefano (no sudo needed for docker)

---

## 📝 Configuration

All deployment configuration is in `.env.staging`:

- Server IP and credentials
- Service ports
- Database passwords
- API keys

**⚠️ NEVER commit `.env.staging` to git!**

---

## 🚀 Quick Start

### First Time Setup

```bash
# 1. Generate SSH key
ssh-keygen -t ed25519 -f ~/.ssh/refertosicuro_staging -N "" -C "refertosicuro-staging"

# 2. Login to server and change password
ssh root@91.99.223.25
# Initial password: (provided by Hetzner via email)

# 3. Copy SSH key to root
ssh-copy-id -i ~/.ssh/refertosicuro_staging.pub root@91.99.223.25

# 4. Run setup script (automated)
./scripts/deployment/setup-staging-server.sh

# 5. Test access as stefano
ssh -i ~/.ssh/refertosicuro_staging stefano@91.99.223.25

# 6. Deploy application
./scripts/deployment/deploy-staging.sh
```

### Subsequent Deploys

```bash
# Just run deploy script
./scripts/deployment/deploy-staging.sh
```

---

## 🔧 Manual Operations

### View Logs

```bash
ssh -i ~/.ssh/refertosicuro_staging stefano@91.99.223.25

cd /opt/refertosicuro
docker compose -f docker-compose.staging.yml logs -f
```

### Restart Services

```bash
ssh -i ~/.ssh/refertosicuro_staging stefano@91.99.223.25

cd /opt/refertosicuro
docker compose -f docker-compose.staging.yml restart
```

### Check Status

```bash
ssh -i ~/.ssh/refertosicuro_staging stefano@91.99.223.25

docker compose -f docker-compose.staging.yml ps
docker stats
htop
```

---

## 📚 Documentation

Full documentation: `docs/devops/STAGING-SETUP.md`

---

**Last Updated**: 2025-11-22
