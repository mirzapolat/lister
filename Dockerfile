# syntax=docker/dockerfile:1
# Lister — multi-stage build. The frontend is compiled to a static bundle and
# served by the Node server, which also exposes the SMTP relay under /api.
# Lister is local-first (all data lives in the browser/IndexedDB), so there is
# no build-time config to inline — no VITE_* build args are needed.

# ---- Build stage: compile the frontend bundle ----------------------------
FROM node:20-alpine AS build
WORKDIR /app

# Install all deps (incl. dev) for the build.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Runtime stage: serve dist + relay via the Node server ---------------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

# Production deps only. tsx is a runtime dependency here because the server is
# executed directly from TypeScript (server/serve.ts).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server ./server
COPY --from=build /app/dist ./dist

USER node
EXPOSE 3000
CMD ["npm", "start"]
