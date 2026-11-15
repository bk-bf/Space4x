#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

node_bin=$(dirname "$(command -v node)")
host=${HOST:-$(tailscale ip -4 | head -n 1)}
port=${PORT:-8800}
dir="$HOME/.config/systemd/user"
mkdir -p "$dir"
for unit in space4x-serve.service space4x-update.service space4x-update.path; do
  sed -e "s|@ROOT@|$PWD|g" -e "s|@NODE_BIN@|$node_bin|g" -e "s|@HOST@|$host|g" -e "s|@PORT@|$port|g" \
    "deploy/$unit" > "$dir/$unit"
done
systemctl --user daemon-reload
systemctl --user enable space4x-serve.service space4x-update.path
systemctl --user restart space4x-serve.service space4x-update.path
