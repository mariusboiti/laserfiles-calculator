# Simple Dockerfile for NestJS API in pnpm monorepo
# Single stage build - copies everything needed for runtime

FROM node:20-alpine

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

# Debug: verify packages exist
RUN ls -la /app/packages/pricing-engine/dist/ && \
    ls -la /app/node_modules/@laser/ && \
    cat /app/node_modules/@laser/pricing-engine/package.json

ENV NODE_ENV=production
EXPOSE 4000

# Run directly with node from /app root
WORKDIR /app
CMD ["node", "apps/api/dist/apps/api/src/main.js"]
