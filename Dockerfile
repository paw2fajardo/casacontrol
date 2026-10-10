# syntax=docker/dockerfile:1

# =============================================================================
# Stage 1: Build stage
# =============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies (including devDependencies required for compilation)
COPY package*.json ./
RUN npm ci

# Copy TypeScript configuration and source code
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript source to dist/
RUN npm run build

# Copy public static assets
COPY public ./public

# =============================================================================
# Stage 2: Production stage
# =============================================================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

# Install production runtime dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled JavaScript and static assets from builder
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/public ./public

# Ensure non-root node user ownership
RUN chown -R node:node /app

# Switch to non-root user
USER node

# Expose dashboard web port
EXPOSE 3000

# Container healthcheck targeting the /healthz endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/healthz || exit 1

# Launch production server
CMD ["node", "dist/server.js"]
