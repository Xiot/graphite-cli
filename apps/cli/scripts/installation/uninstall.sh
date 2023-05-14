#!/bin/bash

if command -v volta &>/dev/null; then
    volta uninstall graphite-motion
else
  npm uninstall --location=global @withgraphite/graphite-cli
fi
