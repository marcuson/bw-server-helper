FROM node:20-alpine AS pnpm-base

ENV COREPACK_HOME=/opt/corepack
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /usr/src/app
COPY package.json ./
RUN corepack install && mkdir -p /pnpm && chown node:node /usr/src/app /pnpm

FROM pnpm-base AS build-stage

ARG TARGETARCH

USER node
WORKDIR /usr/src/app
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY --chown=node:node . .
RUN pnpm run build
RUN pnpm prune --prod

# ---

FROM pnpm-base AS prod-stage

ARG TARGETARCH

RUN apk update && apk add --no-cache tini
RUN pnpm add --global @bitwarden/cli && pnpm store prune
RUN mkdir -p /bwsh && chmod a+rwx /bwsh

WORKDIR /usr/src/app
USER node
ENV NODE_ENV=production
ENV BITWARDENCLI_APPDATA_DIR=/bwsh/bwcli

COPY --chown=node:node --from=build-stage /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build-stage /usr/src/app/dist ./dist
USER node
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--", "node", "dist/src/main.js"]
