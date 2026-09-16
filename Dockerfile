FROM node:24.21.0-alpine AS pnpm-base

ENV COREPACK_HOME=/opt/corepack
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME/bin:$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /usr/src/app
COPY package.json ./
# pnpm 12 downloads its native binary on first use; initialize it before USER node.
RUN corepack install && pnpm --version && mkdir -p /pnpm && chown node:node /usr/src/app /pnpm

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

FROM node:24.21.0-alpine AS cli-stage

ARG TARGETARCH

RUN npm install --global @bitwarden/cli@2026.8.0 \
  && npm cache clean --force \
  && rm -rf /usr/local/lib/node_modules/npm \
            /usr/local/lib/node_modules/corepack \
            /usr/local/bin/npm \
            /usr/local/bin/npx \
  && find /usr/local/lib/node_modules/@bitwarden/cli -name '*.map' -delete

# ---

FROM alpine:3.24 AS prod-stage

ARG TARGETARCH

RUN apk add --no-cache ca-certificates libstdc++ tini \
  && adduser -D -u 1000 node \
  && mkdir -p /bwsh /usr/src/app \
  && chmod a+rwx /bwsh

COPY --from=cli-stage /usr/local/bin/node /usr/local/bin/node
COPY --from=cli-stage /usr/local/lib/node_modules/@bitwarden/cli /usr/local/lib/node_modules/@bitwarden/cli
RUN printf '%s\n' '#!/bin/sh' 'exec /usr/local/bin/node /usr/local/lib/node_modules/@bitwarden/cli/build/bw.js "$@"' > /usr/local/bin/bw \
  && chmod +x /usr/local/bin/bw

WORKDIR /usr/src/app
USER node
ENV NODE_ENV=production
ENV BITWARDENCLI_APPDATA_DIR=/bwsh/bwcli

COPY --chown=node:node --from=build-stage /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build-stage /usr/src/app/dist ./dist
USER node
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--", "node", "dist/src/main.js"]
