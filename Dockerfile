# Build stage for API
FROM node:20-alpine AS api-builder

# Force cache invalidation
ARG CACHE_BUST=1

WORKDIR /app/apps/api

# Install API dependencies with dev tools for TypeScript build
COPY apps/api/package.json ./package.json
RUN npm install

# Build API
COPY apps/api/src ./src
COPY apps/api/tsconfig.json ./tsconfig.json
RUN npm run build

# Build stage for dashboard
FROM node:20-alpine AS dashboard-builder

# Force cache invalidation
ARG CACHE_BUST=1

WORKDIR /app/apps/dashboard

# Install dashboard dependencies
COPY apps/dashboard/package.json ./package.json
RUN npm install

# Build dashboard (static export)
COPY apps/dashboard ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

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

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir --upgrade yt-dlp

WORKDIR /app

# Install API runtime dependencies only
COPY apps/api/package.json apps/api/package.json
RUN cd apps/api && npm install --omit=dev

# Copy built application artifacts
COPY --from=api-builder /app/apps/api/dist ./apps/api/dist
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
# YouTube on cloud IPs: set YTDLP_COOKIES_FILE, or YTDLP_COOKIES_B64 / YTDLP_COOKIES_NETSCAPE (see config). Enable IPv6 egress in railway.json to try a different route.

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the API server
CMD ["node", "apps/api/dist/server.js"]
