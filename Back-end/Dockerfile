FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

# Copy prisma FIRST (cache bust v2)
COPY prisma ./prisma
COPY prisma.config.ts ./

# Install dependencies
RUN npm ci

# Copy rest of the code
COPY . .

# Build app
RUN npm run build

# Generate Prisma client AFTER schema exists
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

EXPOSE 3000

# Run migrations at startup + start app
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
