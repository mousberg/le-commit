# Use Ubuntu as base image
FROM ubuntu:22.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_VERSION=20

# Install system dependencies
RUN apt-get update && apt-get install -y \
    # Node.js and npm
    curl \
    # GraphicsMagick for PDF to image conversion
    graphicsmagick \
    # Alternative: ImageMagick (uncomment if preferred)
    # imagemagick \
    # Additional image processing libraries
    libvips-dev \
    # PDF processing dependencies
    poppler-utils \
    # Python for native module compilation
    python3 \
    python3-pip \
    build-essential \
    # Clean up
    && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - \
    && apt-get install -y nodejs

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install npm dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create directory for temporary images
RUN mkdir -p /app/temp_images

# Set proper permissions
RUN chmod -R 755 /app

# Expose port (if needed for API)
EXPOSE 3000

# Set default command
CMD ["node", "dist/example.js"]
