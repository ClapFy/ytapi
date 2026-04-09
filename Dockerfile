# Build stage for dashboard
FROM node:20-alpine AS dashboard-builder

WORKDIR /app

# Copy package files
COPY package.json turbo.json ./
COPY apps/dashboard/package.json apps/dashboard/
COPY packages/shared/package.json packages/shared/
COPY packages/shared/tsconfig.json packages/shared/

# Install dependencies
RUN npm install

# Copy source code
COPY packages/shared/src packages/shared/src
COPY apps/dashboard ./apps/dashboard

# Build shared package first
RUN cd packages/shared && npm run build

# Build dashboard (static export)
ENV NEXT_TELEMETRY_DISABLED=1
RUN cd apps/dashboard && npm run build

# Production stage
FROM python:3.11-slim

# Install Node.js 20
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    gnupg \
    ffmpeg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp
RUN pip install --no-cache-dir yt-dlp

WORKDIR /app

# Copy package files
COPY package.json turbo.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
COPY packages/shared/dist packages/shared/dist

# Install production dependencies only
RUN npm install --production

# Copy API source and build
COPY apps/api/src apps/api/src
COPY apps/api/tsconfig.json apps/api/
RUN cd apps/api && npm run build

# Copy built dashboard from builder stage
COPY --from=dashboard-builder /app/apps/dashboard/dist ./apps/dashboard/dist

# Create data directory for Railway volume
RUN mkdir -p /data

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/data
ENV YTDLP_PATH=yt-dlp

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the API server
CMD ["node", "apps/api/dist/server.js"]
