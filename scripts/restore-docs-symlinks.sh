#!/usr/bin/env bash
# Restore docs/ content symlinks → documentation/ (dev checkout layout).
# Run after accidental ./scripts/materialize-docs-for-pages.sh on a local machine.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOCS="$ROOT/docs"

link_dir() {
  local name=$1
  local path="$DOCS/$name"
  if [[ -L "$path" ]]; then
    echo "skip (already symlink): docs/$name"
    return 0
  fi
  rm -rf "$path"
  ln -s "../documentation/$name" "$path"
  echo "symlink: docs/$name -> documentation/$name"
}

link_file() {
  local name=$1
  local path="$DOCS/$name"
  if [[ -L "$path" ]]; then
    echo "skip (already symlink): docs/$name"
    return 0
  fi
  rm -f "$path"
  ln -s "../documentation/index.md" "$path"
  echo "symlink: docs/$name -> documentation/index.md"
}

for entry in getting-started platform reference learning-path modules scenario-guides guides; do
  link_dir "$entry"
done

link_file index.md
link_file DOCUMENTATION_INDEX.md

rm -rf "$DOCS/_sources"
echo "Done. docs/ symlinks restored; removed docs/_sources/ if present."
