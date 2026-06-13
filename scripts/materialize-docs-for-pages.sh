#!/usr/bin/env bash
# Replace docs/ symlinks with real files so GitHub Pages and static hosts can serve Markdown.
# Symlinks to ../documentation/ are NOT published by GitHub Pages (outside the site root).
# Run before deploy: ./scripts/materialize-docs-for-pages.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOCS="$ROOT/docs"

materialize_entry() {
  local name=$1
  local path="$DOCS/$name"
  [[ -L "$path" ]] || return 0
  local target
  target="$(python3 -c "import os; print(os.path.realpath(os.path.join('$DOCS', '$name')))")"
  rm "$path"
  if [[ -d "$target" ]]; then
    cp -R "$target" "$path"
  else
    cp "$target" "$path"
  fi
  echo "materialized: docs/$name"
}

for entry in "$DOCS"/*; do
  [[ -L "$entry" ]] && materialize_entry "$(basename "$entry")"
done

for entry in getting-started platform reference learning-path modules scenario-guides; do
  [[ -L "$DOCS/$entry" ]] && materialize_entry "$entry"
done

for entry in index.md DOCUMENTATION_INDEX.md; do
  [[ -L "$DOCS/$entry" ]] && materialize_entry "$entry"
done

# Governance docs live at repo root (not as docs/ symlinks — avoids duplicate GitHub License tabs).
for name in LEGAL.md ATTRIBUTION.md AUTHORS.md DOCUMENTATION-CC-BY-NC-ND.md; do
  cp "$ROOT/$name" "$DOCS/$name"
  echo "materialized: docs/$name (from repo root)"
done

echo "Done. docs/ markdown is ready for GitHub Pages / static hosting."
