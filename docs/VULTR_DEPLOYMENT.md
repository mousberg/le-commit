# Vultr Deployment Guide for LeCommit

This guide outlines different ways to deploy the LeCommit application on Vultr.

## Local Development vs Deployment

- **Local Development**: Run `npm run dev` in the `/frontend` directory
- **Deployment**: Use Docker to containerize the app for production deployment on Vultr

The Dockerfile in this repository is specifically for production deployment, not local development.

## Prerequisites

- Vultr account
- Docker installed locally
- Your environment variables ready (Twilio and ElevenLabs credentials)

## Option 1: Vultr Kubernetes Engine (VKE) - Recommended for Production

### 1. Create a Vultr Kubernetes Cluster

```bash
# Using Vultr CLI (install from https://github.com/vultr/vultr-cli)
vultr-cli kubernetes create \
  --label "lecommit-cluster" \
  --region "ewr" \
  --version "v1.30.2+1" \
  --node-pools "nodepool-label=default,plan=vc2-2c-4gb,node-quantity=2"
```

### 2. Build and Push Docker Image

```bash
# Build the Docker image
docker build -t your-dockerhub-username/lecommit:latest .

# Push to Docker Hub (or Vultr Container Registry)
docker push your-dockerhub-username/lecommit:latest
```

### 3. Create Kubernetes Deployment

Create `kubernetes/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lecommit
spec:
  replicas: 2
  selector:
    matchLabels:
      app: lecommit
  template:
    metadata:
      labels:
        app: lecommit
    spec:
      containers:
      - name: lecommit
        image: your-dockerhub-username/lecommit:latest
        ports:
        - containerPort: 3000
        envFrom:
        - secretRef:
            name: lecommit-secrets
---
apiVersion: v1
kind: Service
metadata:
  name: lecommit-service
spec:
  selector:
    app: lecommit
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

### 4. Create Secrets

```bash
kubectl create secret generic lecommit-secrets \
  --from-literal=TWILIO_ACCOUNT_SID=your_value \
  --from-literal=TWILIO_AUTH_TOKEN=your_value \
  --from-literal=TWILIO_PHONE_NUMBER=your_value \
  --from-literal=ELEVENLABS_API_KEY=your_value \
  --from-literal=ELEVENLABS_VOICE_ID=your_value \
  --from-literal=ELEVENLABS_AGENT_ID=your_value \
  --from-literal=ELEVENLABS_AGENT_PHONE_ID=your_value
```

### 5. Deploy

```bash
kubectl apply -f kubernetes/deployment.yaml
```

## Option 2: Vultr Compute Instance with Docker

### 1. Create a Vultr Instance

```bash
# Create an Ubuntu 22.04 instance
vultr-cli instance create \
  --region ewr \
  --plan vc2-1c-2gb \
  --os 387 \
  --label lecommit-app
```

### 2. SSH into the Instance

```bash
ssh root@your-instance-ip
```

### 3. Install Docker

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

### 4. Deploy the Application

```bash
# Clone your repository
git clone https://github.com/your-username/le-commit.git
cd le-commit

# Create .env file
cat > frontend/.env.local << EOF
TWILIO_ACCOUNT_SID=your_value
TWILIO_AUTH_TOKEN=your_value
TWILIO_PHONE_NUMBER=your_value
ELEVENLABS_API_KEY=your_value
ELEVENLABS_VOICE_ID=your_value
ELEVENLABS_AGENT_ID=your_value
ELEVENLABS_AGENT_PHONE_ID=your_value
EOF

# Build and run
docker build -t lecommit .
docker run -d \
  --name lecommit \
  --restart unless-stopped \
  -p 80:3000 \
  --env-file frontend/.env.local \
  lecommit
```

## Option 3: Vultr App Platform (Serverless)

### 1. Prepare for Deployment

Create `app.yaml`:

```yaml
name: lecommit
region: ewr
services:
  - name: web
    github:
      repo: your-username/le-commit
      branch: main
      deploy_on_push: true
    build_command: cd frontend && npm ci && npm run build
    run_command: cd frontend && npm start
    environment_slug: node-js
    instance_count: 1
    instance_size_slug: basic-xxs
    routes:
      - path: /
    envs:
      - key: NODE_ENV
        value: production
      - key: TWILIO_ACCOUNT_SID
        type: SECRET
      - key: TWILIO_AUTH_TOKEN
        type: SECRET
      # Add other environment variables...
```

### 2. Deploy using Vultr CLI

```bash
vultr-cli apps create --file app.yaml
```

## Option 4: Using GitHub Actions for CI/CD

Create `.github/workflows/deploy-vultr.yml`:

```yaml
name: Deploy to Vultr

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: docker build -t ${{ secrets.DOCKER_REGISTRY }}/lecommit:${{ github.sha }} .
      
      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push ${{ secrets.DOCKER_REGISTRY }}/lecommit:${{ github.sha }}
      
      - name: Deploy to Vultr
        run: |
          # Update Kubernetes deployment or trigger webhook
          # Based on your chosen deployment method
```

## SSL/TLS Configuration

For production, set up SSL using:
- Vultr Load Balancer with Let's Encrypt
- Nginx reverse proxy with Certbot
- Cloudflare proxy (if using their DNS)

## Monitoring

Consider setting up:
- Vultr Monitoring for system metrics
- Application logs using `docker logs` or Kubernetes logs
- Health checks endpoint in your Next.js app

## Scaling

- **VKE**: Adjust replica count in deployment.yaml
- **Compute Instance**: Use Vultr Load Balancer with multiple instances
- **App Platform**: Adjust instance_count in app.yaml

## Cost Optimization

- Start with a small instance ($6/month)
- Use Vultr's snapshot feature for backups
- Consider Reserved Instances for long-term deployments 