# Simple Dockerfile for NestJS API in pnpm monorepo
# Keeps full workspace structure for reliable module resolution

FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy everything needed for install and build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json ./
COPY apps/api ./apps/api
COPY apps/web/package.json ./apps/web/package.json
COPY apps/mobile/package.json ./apps/mobile/package.json
COPY packages ./packages
COPY prisma ./prisma

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build workspace packages and API
RUN pnpm --filter ./apps/api... build

# Generate Prisma client
RUN pnpm --filter api exec prisma generate

# ----------------------------
# Production image
# ----------------------------
FROM node:20-alpine AS production

WORKDIR /app

# Copy the entire built workspace (simple and reliable)
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/pricing-engine/dist ./packages/pricing-engine/dist
COPY --from=builder /app/packages/pricing-engine/package.json ./packages/pricing-engine/package.json
COPY --from=builder /app/prisma ./prisma

ENV NODE_ENV=production
EXPOSE 4000

# Run directly with node - no pnpm needed at runtime
CMD ["node", "apps/api/dist/apps/api/src/main.js"]
