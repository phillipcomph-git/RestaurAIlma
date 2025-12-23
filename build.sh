#!/bin/bash
set -e

# Build do Vite
npm run build

# Copiar pasta api para dist
mkdir -p dist/api
cp -r api/* dist/api/ 2>/dev/null || true

echo "Build completo!"
