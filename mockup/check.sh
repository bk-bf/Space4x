#!/usr/bin/env bash
set -u
B=$(find ~/.cache/ms-playwright -name chrome-headless-shell -type f | sort | tail -1)
U=${URL:?set URL to the address the mockup is served at}
OUT=${1:-}
SIZE=${SIZE:-1440,900}
fail=0
for v in "" "arr=float" "sel=body:mars" "sel=contact:C-014" "zoom=3" "dock=events:left" "dock=events:right" "screen=economy" "screen=research" "screen=classes" "screen=classes&cls=lighthouse" "screen=colony" "screen=ground" "screen=commanders" "screen=intel" "screen=galaxy"; do
  n=${v:-default}; n=${n//[=&:,]/-}
  r=$("$B" --headless --no-sandbox --hide-scrollbars --window-size=$SIZE --virtual-time-budget=4000 --dump-dom "$U?check&$v" 2>/dev/null | tr '\n' '\r' | grep -o '<pre id="check">[^<]*' | sed 's/<pre id="check">//' | tr '\r' '\n')
  [ -z "$r" ] && r="FAIL no check output (script error?)"
  case "$r" in PASS*) printf 'PASS %s\n' "$n" ;; *) fail=1; printf '%s\n' "$r" | sed "s|^|[$n] |" ;; esac
  [ -n "$OUT" ] && "$B" --headless --no-sandbox --hide-scrollbars --window-size=$SIZE --virtual-time-budget=4000 --screenshot="$OUT/$n.png" "$U?$v" >/dev/null 2>&1
done
exit $fail
