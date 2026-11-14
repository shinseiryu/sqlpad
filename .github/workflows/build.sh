#!/usr/bin/env sh
set -x

apt-get update
apt-get install -y --no-install-recommends g++ make python3 python3-setuptools

# Node 25+ images no longer bundle Yarn
npm install -g yarn@1.22.19

bash -x scripts/build.sh

tar -cavf sqlpad.tar.gz -C server/public .
