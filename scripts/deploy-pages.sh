#!/usr/bin/env bash
# Build the game and publish it to the gh-pages branch (GitHub Pages).
# The licensed recording (assets/audio/licensed/, gitignored) is only included if present locally;
# only the 2:04 level edit is shipped — the full-length recording + its overlays are stripped.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=dist-pages
npx tsc --noEmit
npx vite build --outDir "$OUT" --emptyOutDir
rm -f "$OUT"/audio/licensed/jim_original.* ; rm -rf "$OUT"/audio/stems/jim_overlay
find "$OUT" -name '*.map' -delete
touch "$OUT/.nojekyll"
REMOTE=$(git remote get-url origin)
TMP=$(mktemp -d)
cp -R "$OUT"/. "$TMP"/
cd "$TMP"
git init -q -b gh-pages
git add -A
git commit -qm "Deploy $(date -u +%Y-%m-%dT%H:%MZ)"
git push -f -q "$REMOTE" gh-pages
rm -rf "$TMP"
echo "deployed to gh-pages"
