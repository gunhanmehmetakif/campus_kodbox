# syntax=docker/dockerfile:1

# 1) deps: install inside the image. `npm ci` runs on alpine (musl), so optional native
#    packages such as @node-rs/argon2 resolve to their musl binaries automatically.
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

# 2) build: Next standalone output + bundled migration (and one-off seed) scripts.
FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Inlined into the client bundle at build time.
ARG NEXT_PUBLIC_APP_NAME="Kodbox Campus"
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
# Both scripts are bundled. Only @node-rs/argon2 (native) stays external for seed.mjs: it is
# already in the standalone node_modules. seed.mjs also stubs `server-only` and `@next/env`
# (env comes from the container, not .env files).
RUN set -e; \
    echo 'export {}' > /tmp/empty.mjs; \
    echo 'export function loadEnvConfig() {}' > /tmp/next-env-stub.mjs; \
    npx esbuild scripts/migrate.ts --bundle --platform=node --format=esm --target=node22 --outfile=scripts/migrate.mjs; \
    npx esbuild src/db/seed/index.ts --bundle --platform=node --format=esm --target=node22 --external:@node-rs/argon2 \
      --alias:server-only=/tmp/empty.mjs --alias:@next/env=/tmp/next-env-stub.mjs --outfile=scripts/seed.mjs

# 3) runner: minimal image, non-root user.
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=build --chown=nextjs:nodejs /app/scripts/migrate.mjs /app/scripts/seed.mjs ./scripts/
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/saglik || exit 1
CMD ["sh", "-c", "node scripts/migrate.mjs && node server.js"]
