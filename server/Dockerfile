FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci
RUN npx prisma generate

COPY . .

RUN npm run build

FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production

# Use the Prisma client generated in builder (avoids cache/regen issues)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
# Copy prisma CLI from builder for running migrations
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma

COPY --from=builder /app/dist ./dist

EXPOSE 3001

CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/app.js"]
