#!/usr/bin/env bash
# Regenera iconos y splash screens PWA desde public/icons/peumayen.svg
# usando pwa-asset-generator (vía npx, no hace falta instalarlo).
#
# Uso: npm run pwa:icons
# Requiere: bash, Node 18+, Chromium (pwa-asset-generator lo descarga).

set -euo pipefail

cd "$(dirname "$0")/.."

SRC="public/icons/peumayen.svg"
OUT="public/icons"
MANIFEST="public/manifest.json"

if [[ ! -f "$SRC" ]]; then
  echo "Fuente no encontrada: $SRC" >&2
  exit 1
fi

echo "→ Generando assets desde $SRC ..."

npx --yes pwa-asset-generator@latest "$SRC" "$OUT" \
  --manifest "$MANIFEST" \
  --icon-only \
  --favicon \
  --opaque false \
  --padding "10%" \
  --background "#ffffff" \
  --type "png"

echo "→ Regenerando con purpose=any y maskable …"

# Los iconos de Android que devuelve pwa-asset-generator son "any". Creamos
# una versión maskable aparte con padding extra para respetar safe area.
npx --yes pwa-asset-generator@latest "$SRC" "$OUT" \
  --icon-only \
  --type "png" \
  --opaque true \
  --background "#ffffff" \
  --padding "20%" \
  --maskable true

echo "✓ Assets regenerados en $OUT"
echo "  Revisa $MANIFEST — pwa-asset-generator puede haber añadido entradas duplicadas."
