# Need to remote into this image and debug some flow? 
# docker run -it --rm node:26-slim /bin/bash
FROM node:26-slim AS build
RUN apt-get update && apt-get install -y \
    python3 make g++ python3-dev  \
    && rm -rf /var/lib/apt/lists/*
# RUN npm config set python /usr/bin/python3

WORKDIR /sqlpad

# Copy only the package manifests first so the dependency install layer
# is cached until dependencies change.
# The repo is a pnpm workspace: server/ (API + built front end),
# client/ (web front end) and docs/ (not needed here).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY docs/package.json ./docs/

# Node 25+ images no longer bundle Corepack; install the pnpm version
# pinned in the root package.json `packageManager` field.
RUN npm install -g pnpm@12.18.0

RUN pnpm install --frozen-lockfile --filter sqlpad --filter sqlpad-front-end

# Copy rest of the project into docker
COPY . .

# Build front-end and copy files into server public dir
RUN pnpm --filter sqlpad-front-end build && \
    rm -rf server/public && \
    mkdir server/public && \
    cp -r client/build/* server/public

# Self-contained production copy of the server (prod deps only,
# files selected by server/.npmignore)
RUN pnpm --filter sqlpad deploy --prod /deploy

# Start another stage with a fresh node
# Copy the deployed server (node modules + front end build)
FROM node:26-slim AS bundle

# Create a directory for the hooks
RUN mkdir -p /etc/docker-entrypoint.d \
    && apt-get update && apt-get install -y wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/app
COPY --from=build /sqlpad/docker-entrypoint /
COPY --from=build /deploy .

ENV NODE_ENV=production
ENV SQLPAD_DB_PATH=/var/lib/sqlpad
ENV SQLPAD_PORT=3000
EXPOSE 3000
ENTRYPOINT ["/docker-entrypoint"]

# Things to think about for future docker builds
# Perhaps add a healthcheck?
# Should nginx be used to front sqlpad? << No. you can always add an LB/nginx on top of this with compose or other tools when needed.

RUN ["chmod", "+x", "/docker-entrypoint"]
WORKDIR /var/lib/sqlpad
