# LeCommit Deployment Scripts

These scripts help you deploy, manage, and monitor your LeCommit application on Vultr.

## 🚀 Quick Start

First, make the scripts executable:
```bash
chmod +x deploy.sh rollback.sh check-status.sh
```

## 📜 Available Scripts

### 1. `deploy.sh` - Deploy Updates
Builds, pushes, and deploys your latest changes to the VPS.

```bash
./deploy.sh
```

**What it does:**
- ✅ Builds Docker image for AMD64 architecture
- ✅ Pushes to Vultr Container Registry
- ✅ Stops old container on VPS
- ✅ Starts new container with latest image
- ✅ Cleans up old images
- ✅ Verifies deployment success

### 2. `rollback.sh` - Emergency Rollback
Quickly revert to the previous version if something goes wrong.

```bash
./rollback.sh
```

**What it does:**
- ⚠️ Asks for confirmation
- 🔄 Rolls back to previous Docker image
- ✅ Restarts container with older version

### 3. `check-status.sh` - Monitor Status
Check if your app is running correctly and view logs.

```bash
./check-status.sh
```

**What it shows:**
- 🌐 HTTP response status
- 🐳 Container running status
- 📝 Recent log entries
- 💡 Helpful commands

## 🔧 Common Scenarios

### Deploying a new feature:
```bash
# 1. Make your code changes
# 2. Test locally with: cd frontend && npm run dev
# 3. Deploy to production:
./deploy.sh
```

### Something went wrong after deployment:
```bash
# 1. Check what's happening
./check-status.sh

# 2. If needed, rollback immediately
./rollback.sh
```

### Debugging issues:
```bash
# View live logs
ssh root@199.247.14.12 'docker logs -f lecommit-app'

# Check environment variables
ssh root@199.247.14.12 'docker exec lecommit-app env | sort'

# Restart container
ssh root@199.247.14.12 'docker restart lecommit-app'
```

## ⚠️ Important Notes

1. **Always test locally first** before deploying
2. **Keep multiple versions** - The rollback script needs at least 2 images
3. **Monitor after deployment** - Use `check-status.sh` to verify
4. **Update environment variables** on VPS at `/opt/lecommit/.env.local`

## 🔐 Prerequisites

- SSH access to your VPS
- Docker installed locally
- Logged into Vultr Container Registry:
  ```bash
  docker login https://lhr.vultrcr.com/lecommit1 \
    -u 02a85eb8-61b3-4916-b8c4-d4b8d879244c \
    -p gZ4DubSBGb4d9Qwskyi6mHe2GbEfzanJmQey
  ```

## 🆘 Troubleshooting

### "Permission denied" when running scripts
```bash
chmod +x deploy.sh rollback.sh check-status.sh
```

### "Host key verification failed"
You need to accept the VPS host key first:
```bash
ssh root@199.247.14.12
# Type 'yes' when prompted
```

### Container won't start
Check the logs and environment variables:
```bash
ssh root@199.247.14.12 'docker logs lecommit-app'
ssh root@199.247.14.12 'cat /opt/lecommit/.env.local'
``` 