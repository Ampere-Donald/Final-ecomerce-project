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

# Copy release checks and the fail-closed migration startup.
COPY --from=builder /app/scripts ./scripts

EXPOSE 3000

CMD ["node", "scripts/start-preproduction.cjs"]
