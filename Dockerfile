# S3 Migration Scheduler - Production Docker Build (Clean Install)
FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    make \
    g++ \
    sqlite3 \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Download MinIO client during build
RUN wget https://dl.min.io/client/mc/release/linux-amd64/mc -O /usr/local/bin/mc && \
    chmod +x /usr/local/bin/mc

# Copy package.json files first (for better Docker layer caching)
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install and build dependencies from scratch in Linux environment
RUN cd server && npm ci --omit=dev && npm cache clean --force
RUN cd client && npm ci && npm cache clean --force

# Copy and build frontend
COPY client/ ./client/
RUN cd client && npm run build

# Copy backend source
COPY server/ ./server/

# Create app user for security
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs

# Create data and logs directories
RUN mkdir -p /app/data /app/logs && \
    chown -R nodejs:nodejs /app

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

USER nodejs

WORKDIR /app/server

EXPOSE 5000

# Start the application
CMD ["npm", "start"]
