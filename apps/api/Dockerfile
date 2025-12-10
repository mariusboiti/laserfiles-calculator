# Multi-stage Dockerfile for NestJS API (apps/api)
# Build with pnpm workspace from monorepo root
# Uses pnpm deploy for standalone production bundle

FROM node:20-alpine AS base

# Enable pnpm via corepack
ENV PNPM_HOME="/usr/local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# ------------------------
# Stage 1: install all deps
# ------------------------
FROM base AS deps

# Copy workspace manifests first (for layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json ./

# Copy all package.json files for workspace packages
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY apps/mobile/package.json ./apps/mobile/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/pricing-engine/package.json ./packages/pricing-engine/package.json

# Install all dependencies (dev + prod)
RUN pnpm install --frozen-lockfile

# ------------------------
# Stage 2: build everything
# ------------------------
FROM deps AS build

# Copy full source tree
COPY . .

# Build workspace packages first, then API
# The ... suffix builds all dependencies of apps/api
RUN pnpm --filter ./apps/api... build

# Deploy API with all its dependencies to a standalone folder
# This resolves workspace: links to actual packages
RUN pnpm --filter api deploy --prod /app/deployed

# ------------------------
# Stage 3: runtime image
# ------------------------
FROM node:20-alpine AS api

ENV NODE_ENV="production"
WORKDIR /app

# Copy the deployed standalone bundle (includes node_modules with resolved workspace deps)
COPY --from=build /app/deployed ./

# Copy Prisma schema/migrations if needed
COPY --from=build /app/prisma ./prisma

# Generate Prisma client in production image
RUN npx prisma generate

# Expose API port
EXPOSE 4000

# Start the API
# Note: pnpm deploy flattens the structure, so dist is at root level
CMD ["node", "dist/apps/api/src/main.js"]
