FROM node:26 AS builder

RUN mkdir -p /app/ && chown node:node /app
USER node
WORKDIR /app

COPY package.json .
COPY package-lock.json .

RUN npm ci --include=prod --include=dev

COPY --chown=node:node . .

RUN npm run build

FROM nginxinc/nginx-unprivileged:stable-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf

EXPOSE 8080
