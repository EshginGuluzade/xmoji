#!/bin/bash
# Creates a ZIP file from dist/ for Chrome Web Store upload

cd "$(dirname "$0")/.." || exit 1

rm -f xmoji.zip
cd dist && zip -r ../xmoji.zip . -x "*.DS_Store"

echo "Created xmoji.zip"
