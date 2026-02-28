#!/usr/bin/env bash
set -e

BIN_DIR="$(cd "$(dirname "$0")/.." && pwd)/.bin"
TECTONIC="$BIN_DIR/tectonic"

# Skip download if binary already exists (local dev re-runs)
if [ -f "$TECTONIC" ]; then
  echo "✅ Tectonic already installed at $TECTONIC"
  exit 0
fi

# Pre-built static Linux binary (no TeX Live needed)
VERSION="0.15.0"
URL="https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%40${VERSION}/tectonic-${VERSION}-x86_64-unknown-linux-musl.tar.gz"

echo "⬇️  Downloading Tectonic ${VERSION} from GitHub..."
mkdir -p "$BIN_DIR"
TMPFILE=$(mktemp /tmp/tectonic.XXXXXX.tar.gz)

curl -fsSL "$URL" -o "$TMPFILE"
echo "📦 Extracting Tectonic..."
tar -xzf "$TMPFILE" -C "$BIN_DIR"
rm -f "$TMPFILE"

chmod +x "$TECTONIC"
echo "✅ Tectonic installed to $TECTONIC"

# Verification log for cloud environments
echo "🔍 Verifying Tectonic installation..."
if [ -f "$TECTONIC" ]; then
  VERSION_CHECK=$($TECTONIC --version)
  echo "🚀 Tectonic verification successful: $VERSION_CHECK"
else
  echo "❌ Tectonic installation failed: binary not found at $TECTONIC"
  exit 1
fi
