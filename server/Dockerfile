# syntax=docker/dockerfile:1

# ---------- build ----------
FROM node:20-bookworm-slim AS deps
WORKDIR /app
# postgresql-client нужен для pg_dump/psql в utils/backup.js
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ postgresql-client \
    && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci

# ---------- runtime ----------
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# pg_dump/psql для бэкапов, tzdata для Europe/Minsk в cron-планировщике
RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-client tzdata \
    && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY . .

# server/backups — данные, монтируются волюмом в compose
RUN mkdir -p /app/backups

EXPOSE 7000
CMD ["node", "index.js"]
