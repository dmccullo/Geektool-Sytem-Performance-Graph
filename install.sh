#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Geektool-Sytem-Performance-Graph setup"
echo "Project directory: $ROOT_DIR"

if [[ "$OSTYPE" != darwin* ]]; then
  echo "This project is intended for macOS (GeekTool + macOS metrics)."
  exit 1
fi

if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew is required but not found."
  echo "Install Homebrew from https://brew.sh and re-run this script."
  exit 1
fi

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Installing Node.js (includes npm) with Homebrew..."
  brew install node
fi

if ! command -v osx-cpu-temp >/dev/null 2>&1; then
  echo "Installing optional CPU temperature helper..."
  brew install osx-cpu-temp
else
  echo "osx-cpu-temp already installed."
fi

echo "Installing npm dependencies..."
cd "$ROOT_DIR"
npm install

echo
echo "Setup complete."
echo "Start server with: npm start"
echo "GeekTool Web URL:   http://127.0.0.1:26498"
