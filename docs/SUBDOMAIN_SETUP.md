# Subdomain Setup Guide

This guide explains how to set up the subdomain structure for Unmask, where:
- `unmask.click` → Landing page with waitlist
- `app.unmask.click` → Main application

## Architecture Overview

```
├── unmask.click (Landing Page)
│   ├── Hero section
│   ├── Waitlist form
│   ├── Feature explanations
│   └── Testimonials
│
└── app.unmask.click (Main Application)
    ├── Dashboard (/app/board)
    ├── Call interface (/app/call)
    ├── Session management (/app/session)
    ├── Setup (/app/setup)
    └── Overlay (/app/overlay)
```

## File Structure

```
frontend/src/app/
├── landing/
│   ├── page.tsx          # Landing page with waitlist
│   └── layout.tsx        # Landing-specific layout
├── app/
│   ├── board/            # Main dashboard
│   ├── call/             # Call interface
│   ├── session/          # Session management
│   ├── setup/            # Setup wizard
│   ├── overlay/          # Interview overlay
│   ├── page.tsx          # App home redirect
│   └── layout.tsx        # App-specific layout
├── api/
│   └── waitlist/         # Waitlist API endpoint
├── middleware.ts         # Subdomain routing logic
└── next.config.ts        # Next.js configuration
```

## Local Development

### Testing Subdomain Routing

Since localhost doesn't support real subdomains, use query parameters:

```bash
# Landing page
http://localhost:3000?subdomain=www
http://localhost:3000?subdomain=null

# App subdomain
http://localhost:3000?subdomain=app
```

### Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Production Deployment

### DNS Configuration

Set up the following DNS records:

```
Type    Name    Value
A       @       YOUR_SERVER_IP
A       app     YOUR_SERVER_IP
CNAME   www     unmask.click
```

### Nginx Configuration

Add this to your Nginx config:

```nginx
# Landing page (unmask.click, www.unmask.click)
server {
    listen 80;
    server_name unmask.click www.unmask.click;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# App subdomain (app.unmask.click)
server {
    listen 80;
    server_name app.unmask.click;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### SSL Configuration

Use Let's Encrypt for SSL:

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificates for both domains
sudo certbot --nginx -d unmask.click -d www.unmask.click -d app.unmask.click
```

## Environment Variables

Create a `.env.local` file:

```env
# General
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://app.unmask.click
NEXT_PUBLIC_LANDING_URL=https://unmask.click

# API Keys (existing)
OPENAI_API_KEY=your_openai_key
GITHUB_TOKEN=your_github_token
# ... other existing env vars
```

## Middleware Logic

The middleware handles subdomain routing:

1. **Development**: Uses query parameters to simulate subdomains
2. **Production**: Detects actual subdomains from the host header
3. **Routing**:
   - `app.unmask.click` → Serves app routes normally
   - `unmask.click` / `www.unmask.click` → Rewrites to `/landing`

## API Endpoints

### Waitlist API

- **POST** `/api/waitlist`
  - Body: `{ email: string }`
  - Response: `{ message: string }` or `{ error: string }`

- **GET** `/api/waitlist`
  - Response: `{ count: number, entries: Array<{ email: string, timestamp: string }> }`

### Existing App APIs

All existing API routes remain unchanged:
- `/api/applicants`
- `/api/reference-call`
- `/api/get-transcript`
- `/api/summarize-transcript`

## Deployment Steps

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Update DNS records** to point both domains to your server

3. **Configure Nginx** with the provided configuration

4. **Set up SSL certificates** for both domains

5. **Start the application**:
   ```bash
   npm start
   ```

6. **Test both domains**:
   - `https://unmask.click` → Should show landing page
   - `https://app.unmask.click` → Should show app dashboard

## Monitoring

Monitor both domains:
- Landing page conversion rates
- App usage metrics
- Waitlist growth
- Error rates for both subdomains

## Troubleshooting

### Common Issues

1. **Subdomain not routing correctly**:
   - Check DNS propagation
   - Verify Nginx configuration
   - Check middleware logic

2. **SSL certificate issues**:
   - Ensure all domains are included in certificate
   - Check certificate renewal

3. **API calls failing**:
   - Verify environment variables
   - Check CORS settings if needed

### Debug Commands

```bash
# Check DNS resolution
nslookup unmask.click
nslookup app.unmask.click

# Test Nginx configuration
sudo nginx -t

# Check SSL certificate
openssl s_client -connect unmask.click:443
```