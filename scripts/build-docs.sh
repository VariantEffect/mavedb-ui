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

# --- GA4GH GKS vignettes (standalone preview site, served at /docs/gks-vignettes/) ---
# Built from its own dir so its `base_path: ["."]` snippet config resolves the
# starter-kit-style includes; same toolchain (mkdocs-material) as the main docs.
GKS_DIR="$REPO_ROOT/docs-gks-vignettes"
GKS_DEST="$REPO_ROOT/public/docs/gks-vignettes"
echo "Building GKS vignettes documentation..."
( cd "$GKS_DIR" && mkdocs build )
echo "Copying GKS vignettes to $GKS_DEST..."
rm -rf "$GKS_DEST"
cp -r "$GKS_DIR/site" "$GKS_DEST"

echo "Done. Documentation will be served at /docs/mavedb/ and /docs/gks-vignettes/."
