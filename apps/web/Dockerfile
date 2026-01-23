# Multi-stage Dockerfile for Next.js web app (apps/web)
# Build with pnpm workspace from monorepo root

FROM node:22-bookworm-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Enable pnpm via corepack
ENV PNPM_HOME="/usr/local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# ------------------------
# Stage 1: install deps
# ------------------------
FROM base AS deps

# Workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./

# App and workspace package manifests (for better caching)
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/pricing-engine/package.json packages/pricing-engine/package.json

# Install all workspace dependencies (dev + prod)
RUN pnpm install --frozen-lockfile

# ------------------------
# Stage 2: build Web
# ------------------------
FROM deps AS build

ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Copy full source tree.
COPY . .

# Ensure public folder exists so later COPY never fails
RUN mkdir -p /app/apps/web/public

# Generate Prisma client before building
RUN pnpm prisma generate

# Build only the web app (Next.js)
RUN pnpm --filter ./apps/web... build

# ------------------------
# Stage 3: runtime image
# ------------------------
FROM node:22-bookworm-slim AS web

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV="production"
ENV PNPM_HOME="/usr/local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# We run the app from /app/apps/web
WORKDIR /app/apps/web

# Copy workspace node_modules and built Next app
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/web/node_modules ./node_modules
COPY --from=build /app/apps/web/.next ./.next
RUN mkdir -p ./public
COPY --from=build /app/apps/web/public ./public
COPY --from=build /app/apps/web/package.json ./package.json
COPY --from=build /app/apps/web/next.config.mjs ./next.config.mjs

# Expose Next.js default port
EXPOSE 3000

# Start Next.js in production mode
CMD ["node", "/app/apps/web/node_modules/next/dist/bin/next", "start", "-p", "3000"]
