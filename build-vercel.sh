#!/bin/bash
set -e

# Build do Vite
npm run build

# Criar pasta api em dist
mkdir -p dist/api

# Copiar server.js para dist/api/index.js
cp server.js dist/api/index.js

echo "✅ Build completo para Vercel!"
