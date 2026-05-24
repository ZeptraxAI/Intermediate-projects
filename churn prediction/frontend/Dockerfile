FROM oven/bun:1.3-slim AS base

WORKDIR /app

# Accept API URL as build arg (Next.js bakes NEXT_PUBLIC_ vars at build time)
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Build the app
COPY . .
RUN bun run build

# Production image
FROM oven/bun:1.3-slim AS runner
WORKDIR /app

COPY --from=base /app/public ./public
COPY --from=base /app/.next ./.next
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./package.json

EXPOSE 3000

CMD ["bun", "run", "start"]
