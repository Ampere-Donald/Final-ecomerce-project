FROM node:20-alpine AS builder

WORKDIR /app

# Force rebuild — v3 2026-03-21
COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

# Install dependencies
RUN npm ci

# Copy rest of the code
COPY . .

# Build app
RUN npm run build

# Generate Prisma client
RUN npx prisma generate

FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json ./

# Install only production deps
RUN npm ci --omit=dev

# Copy built files
COPY --from=builder /app/dist ./dist

# Copy Prisma files
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma.config.ts ./

# Copy startup script (ensures tables exist even if migrations fail)
COPY --from=builder /app/scripts ./scripts

EXPOSE 3000

# 1) ensure-schema creates missing tables/enum values directly via SQL
# 2) prisma migrate deploy is still attempted, but Railway can keep old applied
#    migrations that are no longer present locally; do not block startup on that
# 3) start the app
CMD ["sh", "-c", "node scripts/ensure-schema.js && (npx prisma migrate deploy || echo 'Prisma migrate deploy failed; continuing after ensure-schema') && node dist/src/main"]
