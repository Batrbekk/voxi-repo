# Multi-stage build для Next.js
FROM node:20-alpine AS deps

# Установка зависимостей для сборки
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Копирование файлов зависимостей
COPY package*.json ./

# Установка зависимостей
RUN npm ci

# Builder stage
FROM node:20-alpine AS builder

WORKDIR /app

# Копирование зависимостей из deps stage
COPY --from=deps /app/node_modules ./node_modules

# Копирование исходного кода
COPY . .

# Отключение телеметрии Next.js
ENV NEXT_TELEMETRY_DISABLED=1

# Сборка приложения
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Отключение телеметрии Next.js
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Создание non-root пользователя
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Копирование необходимых файлов
COPY --from=builder /app/public ./public

# Копирование статических файлов Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Запуск приложения
CMD ["node", "server.js"]
