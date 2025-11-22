# Staging Environment Setup Guide

**Server**: refertosicuro-staging01 (Hetzner VPS)
**IP**: 91.99.223.25
**RAM**: 2GB
**OS**: Debian 12

---

## 🚀 Quick Start

### Step 1: First SSH Login & Password Change

```bash
# Connect for first time (will ask to change password)
ssh root@91.99.223.25
# Initial password: (provided by Hetzner via email)
# Set new strong password when prompted
```

### Step 2: Copy SSH Key

```bash
# Copy your SSH public key to root
ssh-copy-id -i ~/.ssh/refertosicuro_staging.pub root@91.99.223.25
# Enter the NEW root password you just set

# Test key-based login
ssh -i ~/.ssh/refertosicuro_staging root@91.99.223.25
```

### Step 3: Setup Server (Automated)

```bash
# Run automated setup script
./scripts/deployment/setup-staging-server.sh
```

This will automatically:

- ✅ Update system packages
- ✅ **Create user 'stefano' with sudo (no password required)**
- ✅ **Copy SSH key to stefano user**
- ✅ Install Docker & Docker Compose
- ✅ **Add stefano to docker group**
- ✅ Configure firewall (UFW)
- ✅ Create deployment directories
- ✅ Setup Docker networks
- ✅ Generate random secrets
- ✅ Configure 4GB swap space
- ✅ **SSH Hardening:**
  - ✅ Disable root login
  - ✅ Disable password authentication
  - ✅ Enable only SSH key authentication

**Duration**: ~5-10 minutes

**After this, you will ONLY be able to login as stefano with SSH key**

### Step 4: Test Access with Stefano User

```bash
# Test login as stefano (should work without password)
ssh -i ~/.ssh/refertosicuro_staging stefano@91.99.223.25

# Test sudo (should work without password)
sudo docker ps
sudo systemctl status docker
```

**⚠️ IMPORTANT**: Root login is now disabled. Always use stefano user.

### Step 5: Deploy Application

```bash
# Deploy to staging
./scripts/deployment/deploy-staging.sh
```

This will:

- ✅ Create deployment package
- ✅ Upload to server
- ✅ Build Docker images
- ✅ Start all services
- ✅ Run health checks

**Duration**: ~10-15 minutes (first time, includes image builds)

---

## 📋 Services & Ports

| Service              | Port  | URL                         |
| -------------------- | ----- | --------------------------- |
| Auth Service         | 8010  | <http://91.99.223.25:8010>  |
| Billing Service      | 8012  | <http://91.99.223.25:8012>  |
| Admin Service        | 8013  | <http://91.99.223.25:8013>  |
| Analytics Service    | 8014  | <http://91.99.223.25:8014>  |
| Notification Service | 8015  | <http://91.99.223.25:8015>  |
| Frontend             | 3000  | <http://91.99.223.25:3000>  |
| Grafana              | 3001  | <http://91.99.223.25:3001>  |
| RabbitMQ UI          | 15672 | <http://91.99.223.25:15672> |

---

## 🔧 Manual Commands

### View Logs

```bash
# SSH to server
ssh -i ~/.ssh/refertosicuro_staging root@91.99.223.25

# All services
cd /opt/refertosicuro
docker compose -f docker-compose.staging.yml logs -f

# Specific service
docker compose -f docker-compose.staging.yml logs -f auth-service
docker compose -f docker-compose.staging.yml logs -f frontend
```

### Restart Services

```bash
# All services
docker compose -f docker-compose.staging.yml restart

# Specific service
docker compose -f docker-compose.staging.yml restart auth-service
```

### Stop/Start

```bash
# Stop all
docker compose -f docker-compose.staging.yml down

# Start all
docker compose -f docker-compose.staging.yml up -d
```

### Check Status

```bash
docker compose -f docker-compose.staging.yml ps
docker compose -f docker-compose.staging.yml top
```

### Database Access

```bash
# PostgreSQL
docker exec -it refertosicuro-postgres-staging psql -U refertosicuro_staging

# MongoDB
docker exec -it refertosicuro-mongodb-staging mongosh -u refertosicuro_staging

# Redis
docker exec -it refertosicuro-redis-staging redis-cli
```

---

## 🔐 Secrets Management

Secrets are auto-generated during setup and stored in:

```
/opt/refertosicuro/.env
```

To view current secrets:

```bash
ssh root@91.99.223.25 'cat /opt/refertosicuro/.env'
```

To regenerate (⚠️ **will break existing connections**):

```bash
ssh root@91.99.223.25 << 'EOF'
cd /opt/refertosicuro
openssl rand -base64 32 > .new_password
echo "New password: $(cat .new_password)"
EOF
```

---

## 📊 Monitoring

### Resource Usage

```bash
# CPU, Memory, Disk
ssh root@91.99.223.25 'htop'

# Docker stats
ssh root@91.99.223.25 'docker stats'

# Disk usage
ssh root@91.99.223.25 'df -h'

# Swap usage
ssh root@91.99.223.25 'free -h'
```

### Grafana Dashboard

Access: <http://91.99.223.25:3001>

- **User**: admin
- **Password**: Check `.env.staging` file

---

## 🛠️ Troubleshooting

### Service won't start

```bash
# Check logs
docker compose -f docker-compose.staging.yml logs service-name

# Check Docker daemon
systemctl status docker

# Restart Docker
systemctl restart docker
```

### Out of memory

```bash
# Check memory
free -h

# Clear Docker cache
docker system prune -a

# Check swap
swapon --show
```

### Can't connect to service

```bash
# Check firewall
ufw status

# Check if port is listening
netstat -tlnp | grep PORT

# Check service health
curl http://localhost:PORT/health
```

### Reset everything (⚠️ **DESTRUCTIVE**)

```bash
ssh root@91.99.223.25 << 'EOF'
cd /opt/refertosicuro
docker compose -f docker-compose.staging.yml down -v
docker system prune -a -f
rm -rf volumes/*
EOF

# Then re-deploy
./scripts/deployment/deploy-staging.sh
```

---

## 🔄 Updates & Redeploys

### Quick Redeploy (code changes only)

```bash
./scripts/deployment/deploy-staging.sh
```

### Full Rebuild (dependency changes)

```bash
ssh root@91.99.223.25 << 'EOF'
cd /opt/refertosicuro
docker compose -f docker-compose.staging.yml build --no-cache
docker compose -f docker-compose.staging.yml up -d
EOF
```

---

## 📝 Backup & Restore

### Manual Backup

```bash
ssh root@91.99.223.25 << 'EOF'
cd /opt/refertosicuro
mkdir -p backups
docker exec refertosicuro-postgres-staging pg_dumpall -U refertosicuro_staging > backups/postgres_$(date +%Y%m%d_%H%M%S).sql
tar -czf backups/volumes_$(date +%Y%m%d_%H%M%S).tar.gz volumes/
echo "Backup complete!"
ls -lh backups/
EOF
```

### Restore from Backup

```bash
# Copy backup file to server first
scp backup.sql root@91.99.223.25:/opt/refertosicuro/backups/

# Restore
ssh root@91.99.223.25 << 'EOF'
cd /opt/refertosicuro
docker exec -i refertosicuro-postgres-staging psql -U refertosicuro_staging < backups/backup.sql
EOF
```

---

## 🔒 Security Hardening

### Disable Password Authentication (after SSH key setup)

```bash
ssh root@91.99.223.25 << 'EOF'
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd
EOF
```

### Setup Fail2Ban

```bash
ssh root@91.99.223.25 << 'EOF'
apt-get install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban
EOF
```

### Auto-updates

```bash
ssh root@91.99.223.25 << 'EOF'
apt-get install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
EOF
```

---

## 📞 Support

**Issues?**

1. Check logs: `docker compose logs`
2. Check firewall: `ufw status`
3. Check resources: `free -h && df -h`
4. Contact DevOps team

---

**Last Updated**: 2025-11-22
**Version**: 1.0.0
