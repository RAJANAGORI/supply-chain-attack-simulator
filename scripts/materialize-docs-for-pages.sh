#!/usr/bin/env bash
# Replace docs/ symlinks with real files under docs/_sources/ for guide.html fetch.
# Public doc folders are NOT published at docs/<section>/ — avoids raw .md URLs on GitHub Pages.
# Symlinks to ../documentation/ are NOT published by GitHub Pages (outside the site root).
#
# ⚠️  DEPLOY ONLY — do not run on a normal dev checkout. This relocates docs/<section>/
#     into docs/_sources/ and breaks local browsing until you `git restore docs/`.
#     CI runs this automatically (.github/workflows/pages.yml).
#
# Run before deploy: ./scripts/materialize-docs-for-pages.sh
set -euo pipefail

if [[ "${SCAS_MATERIALIZE_DOCS:-}" != "1" && -t 0 && -t 1 ]]; then
  echo "error: materialize-docs-for-pages.sh relocates docs/ into docs/_sources/ (deploy artifact)." >&2
  echo "       For local dev, edit documentation/ — do not run this script." >&2
  echo "       CI sets SCAS_MATERIALIZE_DOCS=1. To force: SCAS_MATERIALIZE_DOCS=1 $0" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOCS="$ROOT/docs"
SOURCES="$DOCS/_sources"

mkdir -p "$SOURCES"

copy_into_sources() {
  local name=$1
  local target=$2
  if [[ -d "$target" ]]; then
    rm -rf "$SOURCES/$name"
    cp -R "$target" "$SOURCES/$name"
  else
    cp "$target" "$SOURCES/$name"
  fi
  echo "materialized: docs/_sources/$name"
}

materialize_entry() {
  local name=$1
  local path="$DOCS/$name"
  [[ -L "$path" ]] || return 0
  local target
  target="$(python3 -c "import os; print(os.path.realpath(os.path.join('$DOCS', '$name')))")"
  rm "$path"
  copy_into_sources "$name" "$target"
}

relocate_if_present() {
  local name=$1
  local path="$DOCS/$name"
  [[ -e "$path" ]] || return 0
  [[ "$name" == "_sources" ]] && return 0
  if [[ -L "$path" ]]; then
    materialize_entry "$name"
    return 0
  fi
  if [[ -d "$path" ]] || [[ -f "$path" ]]; then
    copy_into_sources "$name" "$path"
    rm -rf "$path"
    echo "relocated: docs/$name -> docs/_sources/$name"
  fi
}

for entry in "$DOCS"/*; do
  [[ -L "$entry" ]] && materialize_entry "$(basename "$entry")"
done

for entry in getting-started platform reference learning-path modules scenario-guides guides; do
  relocate_if_present "$entry"
done

for entry in index.md DOCUMENTATION_INDEX.md; do
  relocate_if_present "$entry"
done

# Governance docs live at repo root (not as docs/ symlinks — avoids duplicate GitHub License tabs).
for name in LEGAL.md ATTRIBUTION.md AUTHORS.md DOCUMENTATION-CC-BY-NC-ND.md; do
  cp "$ROOT/$name" "$DOCS/$name"
  echo "materialized: docs/$name (from repo root)"
done

echo "Done. Markdown for guide.html lives under docs/_sources/ (not browsable as raw .md URLs)."

# Internal-only docs — never publish on the public site
rm -f "$SOURCES/reference/ROADMAP.md"
