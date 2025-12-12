## Simple Dockerfile for NestJS API in pnpm monorepo
## Single stage build - install, build workspaces, run API

FROM node:20-alpine

RUN apk add --no-cache openssl

# Install pnpm via corepack
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

# Install all workspace dependencies according to pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

# Build shared libraries first, then pricing engine, then API (and its deps)
# This ensures packages/shared/dist and packages/pricing-engine/dist exist
RUN pnpm --filter @laser/shared build && \
    pnpm --filter @laser/pricing-engine build && \
    pnpm --filter ./apps/api... build

# Generate Prisma client for the whole monorepo from root schema
RUN DATABASE_URL="postgresql://laser:laser@db:5432/laser?schema=public" pnpm exec prisma generate --schema=./prisma/schema.prisma

# Fix nest build output structure: copy modules from dist/ to dist/apps/api/src/
# so relative imports work correctly at runtime
RUN cp -r /app/apps/api/dist/entitlements /app/apps/api/dist/apps/api/src/entitlements || true && \
    cp /app/apps/api/dist/app.globals.* /app/apps/api/dist/apps/api/src/ || true && \
    cp -r /app/apps/api/dist/production /app/apps/api/dist/apps/api/src/production || true && \
    cp -r /app/apps/api/dist/sales-channels /app/apps/api/dist/apps/api/src/sales-channels || true && \
    cp -r /app/apps/api/dist/template-products /app/apps/api/dist/apps/api/src/template-products || true && \
    cp -r /app/apps/api/dist/offcuts /app/apps/api/dist/apps/api/src/offcuts || true

# Manually wire workspace packages into node_modules so Node can resolve them at runtime
RUN mkdir -p /app/node_modules/@laser /app/apps/api/node_modules/@laser && \
    [ -e /app/node_modules/@laser/pricing-engine ] || ln -s /app/packages/pricing-engine /app/node_modules/@laser/pricing-engine && \
    [ -e /app/node_modules/@laser/shared ] || ln -s /app/packages/shared /app/node_modules/@laser/shared && \
    [ -e /app/apps/api/node_modules/@laser/pricing-engine ] || ln -s /app/packages/pricing-engine /app/apps/api/node_modules/@laser/pricing-engine && \
    [ -e /app/apps/api/node_modules/@laser/shared ] || ln -s /app/packages/shared /app/apps/api/node_modules/@laser/shared

# Debug: verify that workspace packages are built and linked
RUN echo "--- pricing-engine dist ---" && ls -la /app/packages/pricing-engine/dist || true && \
    echo "--- shared dist ---" && ls -la /app/packages/shared/dist || true && \
    echo "--- root @laser in node_modules ---" && ls -la /app/node_modules/@laser || echo "no /app/node_modules/@laser" && \
    echo "--- api @laser in node_modules ---" && ls -la /app/apps/api/node_modules/@laser || echo "no /app/apps/api/node_modules/@laser" && \
    echo "--- require.resolve('@laser/pricing-engine') ---" && node -p "require.resolve('@laser/pricing-engine')" || echo "require.resolve failed"

ENV NODE_ENV=production
EXPOSE 4000

# Run directly with node from /app root
WORKDIR /app
CMD ["node", "apps/api/dist/main.js"]
