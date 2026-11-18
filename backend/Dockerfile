FROM node:26 AS builder

RUN mkdir -p /app/ && chown node:node /app
USER node
WORKDIR /app

COPY package.json .
COPY package-lock.json .

RUN npm ci --include=prod --include=dev

COPY --chown=node:node . .

RUN npm run build && npm prune --omit=dev && rm -rf src tsconfig.json tsconfig.app.json

FROM node:26-slim

USER node
WORKDIR /app

COPY --chown=node:node --from=builder /app .

ENV NODE_OPTIONS=--max-old-space-size-percentage=75
ENV NODE_ENV=production
ENV NODE_CONFIG_DIR=/app/config

RUN echo "{}" > /app/config/production.json

ENTRYPOINT [ "node", "dist/app.js" ]