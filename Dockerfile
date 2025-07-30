# Use the official Node.js runtime as base image
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files from frontend directory
COPY frontend/package*.json ./
# Install dependencies
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY frontend/ .

# Accept build arguments
ARG OPENAI_API_KEY
ARG GROQ_API_KEY
ARG GITHUB_TOKEN
ARG ELEVENLABS_API_KEY
ARG ELEVENLABS_AGENT_ID
ARG ELEVENLABS_AGENT_PHONE_ID
ARG TWILIO_ACCOUNT_SID
ARG TWILIO_AUTH_TOKEN
ARG TWILIO_PHONE_NUMBER

# Set environment variables for build
ENV OPENAI_API_KEY=$OPENAI_API_KEY
ENV GROQ_API_KEY=$GROQ_API_KEY
ENV GITHUB_TOKEN=$GITHUB_TOKEN
ENV ELEVENLABS_API_KEY=$ELEVENLABS_API_KEY
ENV ELEVENLABS_AGENT_ID=$ELEVENLABS_AGENT_ID
ENV ELEVENLABS_AGENT_PHONE_ID=$ELEVENLABS_AGENT_PHONE_ID
ENV TWILIO_ACCOUNT_SID=$TWILIO_ACCOUNT_SID
ENV TWILIO_AUTH_TOKEN=$TWILIO_AUTH_TOKEN
ENV TWILIO_PHONE_NUMBER=$TWILIO_PHONE_NUMBER

# Build the Next.js app
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED 1

# Install GraphicsMagick and Ghostscript for PDF processing
RUN apk add --no-cache graphicsmagick ghostscript

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the public folder from frontend
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Create temp directory for CV processing and give nextjs user write permissions
RUN mkdir -p /app/temp_images && chown nextjs:nodejs /app/temp_images
RUN chmod 755 /app && chmod 755 /app/temp_images

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
# set hostname to localhost
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"] 