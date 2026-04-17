# ─────────────────────────────────────────────────────────────────────────────
#  CogniBase — Dockerfile
#  Multi-stage build for a lean production image
#  Phase 2: includes bcryptjs, OAuth env vars, and multi-user data volume
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Install dependencies ────────────────────────────────────────────
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --cache /tmp/npm-cache

# ── Stage 2: Build the Next.js app ───────────────────────────────────────────
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env vars (non-secret)
ARG NEXT_PUBLIC_BASE_URL=http://localhost:3000
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL

RUN npm run build

# ── Stage 3: Lean production runner ──────────────────────────────────────────
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Copy built output
COPY --from=builder /app/public          ./public
COPY --from=builder /app/.next           ./.next
COPY --from=builder /app/node_modules    ./node_modules
COPY --from=builder /app/package.json    ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs

# Data directory — mount a named volume here to persist:
#   data/rag.db        (SQLite: users, categories, documents, conversations, comments, audit_log, ...)
#   data/vectors/      (LanceDB vector store)
#   data/models/       (downloaded ONNX embedding model cache)
RUN mkdir -p /app/data/vectors /app/data/models && \
    chown -R nextjs:nodejs /app/data

# Log directory for PM2 / stdout
RUN mkdir -p /app/logs && chown nextjs:nodejs /app/logs

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/auth/me || exit 1

CMD ["npm", "start"]
