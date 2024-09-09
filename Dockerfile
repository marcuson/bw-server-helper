# FROM docker

# ARG TARGETARCH

# # -- Install required system deps
# RUN apk add --no-cache bash curl
# RUN curl -1sLf \
#     'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.alpine.sh' \
#     | bash
# RUN apk update \
#     && apk upgrade --no-cache libcrypto3 libssl3 \
#     && apk add --no-cache infisical tini jq npm

# SHELL ["/bin/bash", "-c"]

# # NOTE: Use manual install instead of apk for plugin + default args feature
# RUN curl -o /usr/local/bin/gomplate -sSL \
#     https://github.com/hairyhenderson/gomplate/releases/download/v4.0.1/gomplate_linux-${TARGETARCH} \
#     && chmod 755 /usr/local/bin/gomplate

# # -- Get NPM deps
# COPY package*.json .
# RUN npm ci

# # -- Copy dev artifacts
# WORKDIR /infwatch
# COPY src .
# RUN chmod a+x ./utils/* ./entrypoint

# # -- Add bin
# ENV PATH="$PATH:/infwatch/bin"
# RUN mkdir -p /infwatch/bin

# WORKDIR /infwatch/bin
# RUN for f in "/infwatch/utils"/*.*; do ff=$(basename $f); ln -s $f "${ff%%.*}"; done

# # -- Prepare additional files and folders
# RUN mkdir -p /infwatch/tmp
# RUN mkdir -p /infwatch/tplref

# # -- Entrypoint
# WORKDIR /infwatch
# ENTRYPOINT ["/sbin/tini", "--", "/infwatch/entrypoint"]


# ------------

FROM node:20-alpine AS build-stage

ARG TARGETARCH

WORKDIR /usr/src/app
COPY --chown=node:node package*.json ./
RUN npm ci
COPY --chown=node:node . .
ENV NODE_ENV=production
RUN npm run build
RUN npm ci --only=production && npm cache clean --force

FROM node:20-alpine AS prod-stage

ARG TARGETARCH

RUN apk update \
    && apk add --no-cache tini
RUN npm i -g @bitwarden/cli

COPY --chown=node:node --from=build-stage /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build-stage /usr/src/app/dist ./dist
USER node
ENTRYPOINT ["/sbin/tini", "--", "node", "dist/src/main.js"]