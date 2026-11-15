#!/bin/sh
set -eu

DB_FILE="/app/${DB_PATH:-data/flame.db}"

if [ ! -s "$DB_FILE" ]; then
    echo "Descargando la base de datos desde $DB_URL"
    mkdir -p "$(dirname "$DB_FILE")"
    python -c "import sys, urllib.request; urllib.request.urlretrieve(sys.argv[1], sys.argv[2])" "$DB_URL" "$DB_FILE.part"
    mv "$DB_FILE.part" "$DB_FILE"
fi

exec "$@"
