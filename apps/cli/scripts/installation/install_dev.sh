#!/bin/bash
cd $(dirname $0)

if command -v volta &>/dev/null; then
    volta install "graphite-motion@../../"
else
    npm install --location=global ../../
fi
