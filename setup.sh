#!/usr/bin/env bash

# ==============================================================================
# WiraDev - Multi-Repository Setup Script
# ==============================================================================

set -e

echo "🚀 Initializing WiraDev ecosystem..."

# Check git
if ! command -v git &> /dev/null; then
    echo "❌ Error: git is required but not installed."
    exit 1
fi

echo "📦 Updating & synchronizing git submodules..."
git submodule sync --recursive
git submodule update --init --recursive

echo "✅ All submodules checked out successfully:"
echo "  - wiradev-fe     : Frontend Web App (Next.js/React/Tailwind)"
echo "  - wiradev-be     : Backend API (Node.js/Express/TypeScript)"
echo "  - wiradev-ai     : AI & Deep Learning Inference (Flask/Keras)"

echo ""
echo "💡 Next steps:"
echo "  1. To run all containerized services via Docker:"
echo "     docker compose up --build"
echo ""
echo "  2. Or navigate into any specific service directory to run locally:"
echo "     - cd wiradev-fe && pnpm install && pnpm run dev"
echo "     - cd wiradev-be && pnpm install && pnpm run dev"
echo "     - cd wiradev-ai && pip install -r requirements.txt && python app.py"
echo ""
echo "🎉 WiraDev environment is ready!"
