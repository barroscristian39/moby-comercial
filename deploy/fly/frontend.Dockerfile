FROM node:20-bookworm-slim AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NEXT_TELEMETRY_DISABLED="1"

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_API_ORIGIN
ENV NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL"
ENV NEXT_PUBLIC_API_ORIGIN="$NEXT_PUBLIC_API_ORIGIN"

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter @moby/shared build
RUN pnpm --filter frontend build

FROM node:20-bookworm-slim AS runner

ENV NODE_ENV="production"
ENV NEXT_TELEMETRY_DISABLED="1"
ENV HOSTNAME="0.0.0.0"
ENV PORT="3000"

WORKDIR /app

COPY --from=builder /app/apps/frontend/.next/standalone ./
COPY --from=builder /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public

EXPOSE 3000

CMD ["node", "apps/frontend/server.js"]
