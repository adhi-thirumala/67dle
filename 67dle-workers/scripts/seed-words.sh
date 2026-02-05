#!/usr/bin/env bash
set -euo pipefail

DB_NAME=${1:-67dle-words}
ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

if ! command -v wrangler >/dev/null 2>&1; then
	echo "wrangler not found. Install with: bun add -g wrangler" >&2
	exit 1
fi

if ! command -v python >/dev/null 2>&1; then
	echo "python not found. Install Python 3." >&2
	exit 1
fi

echo "Generating seed SQL..."
python "${ROOT_DIR}/scripts/build-word-seed.py"

echo "Applying schema..."
wrangler d1 execute "${DB_NAME}" --file "${ROOT_DIR}/sql/words.sql"

echo "Seeding words..."
wrangler d1 execute "${DB_NAME}" --file "${ROOT_DIR}/sql/seed_words.sql"

echo "Done. Seeded ${DB_NAME}."
