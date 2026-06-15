#!/bin/bash
# Télécharge les embeddings fastText français pré-entraînés.
#
# Source : https://fasttext.cc/docs/en/crawl-vectors.html
# Fichier : cc.fr.300.vec (2M mots, 300 dimensions)
#
# Usage :
#   chmod +x scripts/download-embeddings.sh
#   ./scripts/download-embeddings.sh

set -euo pipefail

EMBEDDINGS_DIR="data/embeddings"
OUTPUT_FILE="${EMBEDDINGS_DIR}/cc.fr.300.vec"
URL="https://dl.fbaipublicfiles.com/fasttext/vectors-crawl/cc.fr.300.vec.gz"

mkdir -p "${EMBEDDINGS_DIR}"

if [ -f "${OUTPUT_FILE}" ]; then
  echo "✅ Fichier déjà présent : ${OUTPUT_FILE}"
  echo "   $(wc -l < "${OUTPUT_FILE}") lignes, $(du -h "${OUTPUT_FILE}" | cut -f1)"
  exit 0
fi

echo "📥 Téléchargement des embeddings fastText français..."
echo "   URL : ${URL}"
echo "   Destination : ${OUTPUT_FILE}.gz"
echo "   (Cette opération peut prendre plusieurs minutes)"

# Téléchargement
if command -v curl &> /dev/null; then
  curl -L -o "${OUTPUT_FILE}.gz" "${URL}"
elif command -v wget &> /dev/null; then
  wget -O "${OUTPUT_FILE}.gz" "${URL}"
else
  echo "❌ curl ou wget requis."
  exit 1
fi

echo "📦 Décompression..."
gunzip -f "${OUTPUT_FILE}.gz"

echo ""
echo "✅ Terminé !"
echo "   Fichier : ${OUTPUT_FILE}"
echo "   $(wc -l < "${OUTPUT_FILE}" | tr -d ' ') mots chargés"
echo ""
echo "   Pour utiliser :"
echo "   1. Redémarre l'application NestJS"
echo "   2. Les embeddings seront chargés automatiquement au démarrage"
