# GitHub Actions Deployment Setup

This guide will help you set up automated deployment to Vultr using GitHub Actions.

## Prerequisites

- Your repository must be on GitHub
- You need admin access to the repository
- You have a Vultr VPS and Container Registry set up

## Required GitHub Secrets

You need to add these secrets to your GitHub repository:

### 1. Go to Repository Settings
- Navigate to your repository on GitHub
- Click **Settings** → **Secrets and variables** → **Actions**
- Click **New repository secret** for each of the following:

### 2. Add these secrets:

#### `VULTR_REGISTRY_USERNAME`
- Your Vultr Container Registry username
- Usually your email address or username

#### `VULTR_REGISTRY_PASSWORD` 
- Your Vultr Container Registry password or API token
- Get this from Vultr Console → Container Registry → Registry Access

#### `VPS_HOST`
- Your VPS IP address
- Example: `199.247.14.12`

#### `VPS_SSH_KEY`
- Your private SSH key for accessing the VPS
- Generate with: `ssh-keygen -t ed25519 -C "github-actions"`
- Copy the **private key** (not the .pub file)
- Make sure the corresponding public key is in `/root/.ssh/authorized_keys` on your VPS

## How to get your SSH key:

### Generate a new SSH key pair (recommended):
```bash
ssh-keygen -t ed25519 -f ~/.ssh/github_actions_key -C "github-actions"
```

### Copy the private key:
```bash
cat ~/.ssh/github_actions_key
```
Copy this entire output to the `VPS_SSH_KEY` secret.

### Add the public key to your VPS:
```bash
ssh-copy-id -i ~/.ssh/github_actions_key.pub root@199.247.14.12
```

Or manually:
```bash
cat ~/.ssh/github_actions_key.pub | ssh root@199.247.14.12 'cat >> ~/.ssh/authorized_keys'
```

## Workflow Triggers

The deployment will run automatically when:
- ✅ **Push to main branch** - Automatic deployment
- ✅ **Manual trigger** - Go to Actions tab → Deploy to Vultr → Run workflow

## Testing the Setup

1. **Add all secrets** to your GitHub repository
2. **Commit and push** the workflow file to main branch
3. **Check Actions tab** to see if the deployment runs successfully
4. **Monitor logs** for any errors

## Workflow Features

- ✅ **Docker multi-platform builds** (AMD64 for VPS)
- ✅ **Build caching** for faster subsequent builds
- ✅ **Zero-downtime deployment** (stops old container, starts new one)
- ✅ **Health checks** after deployment
- ✅ **Cleanup** of old Docker images

## Security Notes

- SSH keys are encrypted in GitHub Secrets
- Only repository collaborators can trigger deployments
- All secrets are never logged or exposed in workflow output
- Consider using SSH key restrictions for additional security

## Troubleshooting

### Common Issues:

1. **"Permission denied (publickey)"**
   - Check that your public key is in `/root/.ssh/authorized_keys` on the VPS
   - Verify the private key is correctly copied to `VPS_SSH_KEY` secret

2. **"Authentication failed" for registry**
   - Verify `VULTR_REGISTRY_USERNAME` and `VULTR_REGISTRY_PASSWORD`
   - Check Vultr Console → Container Registry → Registry Access

3. **Docker pull fails**
   - Ensure your VPS can access the Vultr Container Registry
   - Check that the registry URL is correct

### Debug Commands:

Test SSH connection:
```bash
ssh -i ~/.ssh/github_actions_key root@199.247.14.12
```

Test Docker registry login:
```bash
docker login lhr.vultrcr.com
```

## Benefits over Manual Deployment

- ✅ **No manual passwords** - Uses SSH keys
- ✅ **Automatic triggers** - Deploys on git push
- ✅ **Build caching** - Faster builds
- ✅ **Consistent environment** - Same build process every time
- ✅ **Deployment history** - Track all deployments in Actions tab
- ✅ **Rollback capability** - Re-run previous successful deployments