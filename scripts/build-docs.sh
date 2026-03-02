#!/usr/bin/env bash
# Build MkDocs documentation and copy output into public/ so Vite includes it
# in the production bundle. Run this before `npm run build`.
#
# Usage:
#   ./scripts/build-docs.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MKDOCS_CFG="$REPO_ROOT/docs/mkdocs.yml"
DEST="$REPO_ROOT/public/docs/mavedb"

# Build MkDocs
echo "Building MkDocs documentation..."
mkdocs build -f "$MKDOCS_CFG"

# Copy build output to public/docs/mavedb/
echo "Copying docs to $DEST..."
rm -rf "$DEST"
cp -r "$REPO_ROOT/docs/site" "$DEST"

echo "Done. Documentation will be served at /docs/mavedb/."
