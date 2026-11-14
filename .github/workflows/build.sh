#!/usr/bin/env sh
set -x

apt-get update
apt-get install -y --no-install-recommends g++ make python3 python3-setuptools

# Node 25+ images no longer bundle Corepack; install pnpm (see packageManager)
npm install -g pnpm@12.18.0

bash -x scripts/build.sh

tar -cavf sqlpad.tar.gz -C server/public .
