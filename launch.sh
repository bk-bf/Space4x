#!/usr/bin/env bash
set -uo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
UNIT=space4x-window
SOURCES=(src static src-tauri package.json pnpm-lock.yaml vite.config.ts tsconfig.json)

usage() {
  echo "usage: ./launch.sh [--dev] [--gallery] | --stop" >&2
  exit 2
}

stop() {
  systemctl --user stop "$UNIT" 2>/dev/null
  systemctl --user reset-failed "$UNIT" 2>/dev/null
}

dev=false
gallery=false
for arg in "$@"; do
  case "$arg" in
    --dev) dev=true ;;
    --gallery) gallery=true ;;
    --stop)
      [[ $# == 1 ]] || usage
      stop
      echo "Space4x stopped."
      exit 0
      ;;
    *) usage ;;
  esac
done

cd "$DIR" || exit 1

fingerprint() {
  {
    echo "gallery=$gallery"
    git ls-files -s -- "${SOURCES[@]}"
    git diff -- "${SOURCES[@]}"
    git ls-files -z --others --exclude-standard -- "${SOURCES[@]}" | xargs -0r sha256sum
  } | sha256sum | cut -d' ' -f1
}

free_port() {
  node -e "const s = require('net').createServer().listen(0, '127.0.0.1', () => { console.log(s.address().port); s.close(); })"
}

wait_for_page() {
  local since=$1 limit=$2
  printf '  waiting for the page '
  for _ in $(seq 1 "$limit"); do
    if journalctl --user -u "$UNIT" --since "@$since" -o cat 2>/dev/null | grep -q '^page info: loaded'; then
      echo "✓"
      return 0
    fi
    if ! systemctl --user is-active --quiet "$UNIT"; then
      echo ""
      echo "launch.sh: the window exited; journalctl --user -u $UNIT shows why" >&2
      return 1
    fi
    printf '.'
    sleep 1
  done
  echo ""
  echo "  no page yet; follow it with journalctl --user -u $UNIT -f"
}

stop

pnpm install --frozen-lockfile --silent || {
  echo "launch.sh: pnpm install failed" >&2
  exit 1
}

if $gallery; then
  label="Space4x gallery"
  frontend="VITE_SPACE4X_GALLERY=1 SPACE4X_OUT=build-gallery pnpm build"
  overrides='"identifier":"io.github.bkbf.space4x.gallery","productName":"Space4x gallery"'
  target="$DIR/src-tauri/target/gallery"
  binary="$target/release/space4x"
  dist='"frontendDist":"../build-gallery",'
else
  label="Space4x"
  frontend="pnpm build"
  overrides=""
  target="$DIR/src-tauri/target"
  binary="$target/release/space4x"
  dist=""
fi

env_args=(-p Environment="PATH=$PATH")
[[ -n ${SPACE4X_QUERY:-} ]] && env_args+=(-p Environment="SPACE4X_QUERY=$SPACE4X_QUERY")

if $dev; then
  port=$(free_port)
  vite="pnpm exec vite dev --host 127.0.0.1 --port $port --strictPort"
  $gallery && vite="VITE_SPACE4X_GALLERY=1 $vite"
  config="{${overrides:+$overrides,}\"build\":{\"devUrl\":\"http://127.0.0.1:$port\",\"beforeDevCommand\":\"$vite\"}}"
  echo "$label — dev mode: the vite dev server on port $port, reloading on every change"
  since=$(date +%s)
  systemd-run --user --quiet --collect --unit="$UNIT" --working-directory="$DIR" "${env_args[@]}" \
    -p Environment="CARGO_TARGET_DIR=$target" \
    -- pnpm exec tauri dev --config "$config" || exit 1
  echo "  the first start compiles the debug shell, which takes a few minutes"
  wait_for_page "$since" 900 || exit 1
else
  stamp="$target/release/.launch-fingerprint"
  want=$(fingerprint)
  if [[ -x $binary && $(cat "$stamp" 2>/dev/null) == "$want" ]]; then
    echo "$label — unchanged since the last build"
  else
    echo "$label — building…"
    config="{${overrides:+$overrides,}\"build\":{${dist}\"beforeBuildCommand\":\"$frontend\"}}"
    CARGO_TARGET_DIR="$target" pnpm exec tauri build --no-bundle --config "$config" || {
      echo "launch.sh: the build failed" >&2
      exit 1
    }
    echo "$want" > "$stamp"
  fi
  since=$(date +%s)
  systemd-run --user --quiet --collect --unit="$UNIT" --working-directory="$DIR" "${env_args[@]}" \
    -- "$binary" || exit 1
  wait_for_page "$since" 60 || exit 1
fi

echo ""
echo "  $label is in its own window (F11 for full screen); closing it stops the game."
echo "  Log: journalctl --user -u $UNIT -f · stop from here: ./launch.sh --stop"
