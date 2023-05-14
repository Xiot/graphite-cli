#!/bin/bash
echo "Install Dev"
cd $(dirname $0)

if command -v volta &>/dev/null; then
    volta install gtl@../../
else
    npm install --location=global ../../
fi
