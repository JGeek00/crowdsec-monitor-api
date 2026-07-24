#!/bin/bash
# Move all __tests__ directories from src/ to test/ preserving structure
set -e
cd "$(dirname "$0")"

find src -name "__tests__" -type d | sort | while IFS= read -r dir; do
  # dir = src/controllers/alerts/__tests__
  # target = test/controllers/alerts/__tests__
  rel="${dir#src/}"
  target="test/$rel"
  parent="$(dirname "$target")"
  mkdir -p "$parent"
  echo "Moving $dir -> $target"
  git mv "$dir" "$target"
done

echo "Don