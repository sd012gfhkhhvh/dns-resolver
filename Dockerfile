# Stage 1: Build
FROM oven/bun:1.1.13-alpine AS builder

WORKDIR /app

# Skip husky install during Docker build (no git in container)
ENV HUSKY=0

COPY package.json bun.lockb ./
RUN bun install

COPY . .
RUN bun run build

# Stage 2: Production
FROM node:22-alpine

WORKDIR /app

COPY package.json bun.lockb ./
COPY scripts ./scripts
# Skip lifecycle scripts (prepare/husky) in production - not needed
RUN npm install --omit=dev --ignore-scripts

COPY --from=builder /app/dist ./dist

EXPOSE 2053/udp
EXPOSE 8080/tcp

CMD ["sh", "scripts/start-all.sh"]