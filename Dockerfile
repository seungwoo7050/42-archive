FROM node:24.18.0-bookworm-slim AS dependencies

RUN npm install --global npm@11.16.0
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS builder

ARG PORTFOLIO_CONTENT_MODE=template
ARG SITE_URL
ENV PORTFOLIO_CONTENT_MODE=$PORTFOLIO_CONTENT_MODE
ENV SITE_URL=$SITE_URL
COPY . .
RUN npm run build && npm run build:verify

FROM node:24.18.0-bookworm-slim AS runner

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3100
WORKDIR /app
USER node
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

EXPOSE 3100
CMD ["node", "server.js"]
