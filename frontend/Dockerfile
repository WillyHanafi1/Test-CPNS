# ==========================================
# Tahap 1: Install Dependencies (deps)
# ==========================================
ARG NODE_IMAGE=node:24-alpine
FROM ${NODE_IMAGE} AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# ==========================================
# Tahap 2: Build Aplikasi (builder)
# ==========================================
FROM ${NODE_IMAGE} AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG NEXT_PUBLIC_DOKU_CLIENT_ID
ARG NEXT_PUBLIC_DOKU_ENVIRONMENT=sandbox

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_DOKU_CLIENT_ID=$NEXT_PUBLIC_DOKU_CLIENT_ID
ENV NEXT_PUBLIC_DOKU_ENVIRONMENT=$NEXT_PUBLIC_DOKU_ENVIRONMENT
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS=--max-old-space-size=1024

RUN node scripts/check-math.mjs && npm run build

# ==========================================
# Tahap 3: Runner Server Production (runner)
# ==========================================
FROM ${NODE_IMAGE} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
