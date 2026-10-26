#!/usr/bin/env bash
# Thin wrapper around cli.mjs — requires Node.js ≥ 18.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
if ! command -v node >/dev/null 2>&1; then
  echo "Error: node not found. Install Node.js ≥ 18." >&2
  exit 1
fi
exec node "$ROOT/cli.mjs" "$@"
