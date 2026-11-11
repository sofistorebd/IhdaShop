# STORE template — production image (Coolify/VPS)
# Next.js standalone output → ছোট image, দ্রুত start

# ---- dependencies ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# build এ DB লাগে না — hasDb() false হলে seed ডেটায় prerender হয়,
# runtime এ আসল env থেকে DB ধরে
RUN npm run build

# ---- run ----
FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache postgresql-client
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
