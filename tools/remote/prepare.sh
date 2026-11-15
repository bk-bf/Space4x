NODE_MAJOR=$(sed -n 's/.*"node": *">=\([0-9]*\)".*/\1/p' package.json | head -1)
SHIMS="$HOME/test-runs/bin"
export PATH="$SHIMS:$PATH"
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
export TMPDIR="$HOME/test-runs/tmp"
export SPACE4X_PREPARED=1
mkdir -p "$TMPDIR"

if [ "$(node -p 'process.versions.node.split(".")[0]')" -lt "$NODE_MAJOR" ]; then
  echo "[remote] node $(node -v) is older than the required $NODE_MAJOR" >&2
  exit 3
fi
if [ ! -x "$SHIMS/pnpm" ]; then
  mkdir -p "$SHIMS"
  corepack enable --install-directory "$SHIMS" pnpm
fi

LOCK_HASH=$(sha256sum pnpm-lock.yaml | cut -c1-64)
if [ ! -d node_modules ] || [ "$(cat .git/space4x-lock-hash 2>/dev/null)" != "$LOCK_HASH" ]; then
  pnpm install --frozen-lockfile --prefer-offline >&2
  pnpm exec playwright install chromium >&2
  echo "$LOCK_HASH" > .git/space4x-lock-hash
fi

export PATH="$PWD/node_modules/.bin:$PATH"
pnpm exec svelte-kit sync >&2
