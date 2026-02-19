# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install build tools needed to compile better-sqlite3
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:22-alpine

ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app

# Create a non-root user to run the app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy compiled node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application source
COPY src/ ./src/
COPY public/ ./public/
COPY package.json ./

# Create the data directory and set ownership before switching user.
# The VOLUME instruction is intentionally omitted here — declaring it in
# the Dockerfile causes Docker to create the mount point after the chown,
# making the directory root-owned at runtime. The volume is declared in
# docker-compose.yml instead.
RUN mkdir -p /app/data && chown -R appuser:appgroup /app
ENV DB_PATH=/app/data/tasks.db
USER appuser

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/server.js"]
