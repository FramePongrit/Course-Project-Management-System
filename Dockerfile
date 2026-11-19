# CPMS production image: one container serves the Express API and the built React SPA.
# Adapted from the CPE 334 Lab 5 starter kit (single package.json instead of client/ + server/).
#
# - Build from the repo root:  docker build -t cpms .
# - Listens on $PORT (default 8080). Cloud Run injects PORT; deploy --port must match.
# - No secret is baked into the image; DATABASE_URL, JWT_SECRET, DEMO_USER_PASSWORD are
#   injected at runtime (docker compose locally, Secret Manager on Cloud Run).
# - prisma/ and the Prisma CLI + tsx stay in the image on purpose: the migration job runs
#   `npx prisma migrate deploy && npm run prisma:seed` from this same image.

# ---- Stage 1: install dependencies and build client + server -----------------
FROM node:22-alpine AS build
WORKDIR /app
# Prisma engines need openssl on alpine.
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

# ---- Stage 2: runtime --------------------------------------------------------
FROM node:22-alpine AS production
WORKDIR /app
RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV TZ=Asia/Bangkok
ENV PORT=8080

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

EXPOSE 8080
# Do not run as root.
USER node
# Exec form: node is PID 1 and receives SIGTERM from Cloud Run directly.
CMD ["node", "dist/index.js"]
