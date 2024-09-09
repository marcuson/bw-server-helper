FROM node:20-alpine AS build-stage

ARG TARGETARCH

WORKDIR /usr/src/app
COPY --chown=node:node package*.json ./
RUN npm ci -f
COPY --chown=node:node . .
RUN npm run build
RUN npm ci -f --omit=dev && npm cache clean --force
USER node

# ---

FROM node:20-alpine AS prod-stage

ARG TARGETARCH

ENV NODE_ENV=production
RUN apk update \
    && apk add --no-cache tini \
    && npm i -g @bitwarden/cli

COPY --chown=node:node --from=build-stage /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build-stage /usr/src/app/dist ./dist
USER node
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--", "node", "dist/src/main.js"]