#!/bin/bash

set -e

# Use local pm2 if available (installed via devDependency), fallback to global.
PM2_BIN="npx pm2"

# Keep PM2 data inside the repo to avoid permission issues on locked-down home dirs.
export PM2_HOME="${PM2_HOME:-$(pwd)/.pm2}"
mkdir -p "$PM2_HOME"

$PM2_BIN start ecosystem.config.cjs
$PM2_BIN save
