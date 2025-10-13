# Stage 1: Build
FROM oven/bun:1.1.13-alpine AS builder

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install

COPY . .
RUN bun run build

# Stage 2: Production
FROM node:20.12.2-alpine3.19

WORKDIR /app

COPY package.json bun.lockb ./
COPY scripts ./scripts
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 2053/udp
EXPOSE 8080/tcp

CMD ["sh", "scripts/start-all.sh"]