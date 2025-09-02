# syntax=docker/dockerfile:1

# Base image with pnpm
FROM node:20-bookworm-slim AS base
ENV CI=true
RUN corepack enable
WORKDIR /app

# Development image (hot reload)
FROM base AS dev
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile
COPY . .
ENV HOST=0.0.0.0 PORT=5173
EXPOSE 5173
CMD ["pnpm", "run", "dev", "--", "--host", "0.0.0.0"]

# Build image
FROM base AS build
COPY package.json pnpm-lock.yaml* ./
# Remove the WASM Rollup override for production build
RUN cat package.json | \
    node -e "const pkg = JSON.parse(require('fs').readFileSync(0)); \
    delete pkg.pnpm.overrides['rollup']; \
    delete pkg.devDependencies['@rollup/wasm-node']; \
    console.log(JSON.stringify(pkg, null, 2))" > package.json.tmp && \
    mv package.json.tmp package.json && \
    pnpm install --no-frozen-lockfile
COPY . .
RUN pnpm run build

# Production runtime
FROM node:20-bookworm-slim AS prod
ENV NODE_ENV=production
RUN corepack enable
WORKDIR /app
COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./
# Install only production deps (adapter-node runtime)
RUN pnpm install --prod --no-frozen-lockfile
ENV PORT=3000 HOST=0.0.0.0
EXPOSE 3000
CMD ["node", "build/index.js"]
