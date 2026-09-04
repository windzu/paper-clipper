#!/usr/bin/env bash
set -euo pipefail

repository_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
source_directory="$repository_root/store-assets/sources"
output_directory="$repository_root/store-assets"
chrome_binary=${CHROME_BINARY:-"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"}

if [[ ! -x "$chrome_binary" ]]; then
  printf 'Google Chrome was not found at %s\n' "$chrome_binary" >&2
  exit 1
fi

render() {
  local source_file=$1
  local output_file=$2
  local size=$3
  local temporary_profile
  local chrome_pid
  local screenshot_path="$output_directory/$output_file"
  temporary_profile=$(mktemp -d "${TMPDIR:-/tmp}/paper-clipper-render.XXXXXX")
  rm -f "$screenshot_path"

  "$chrome_binary" \
    --headless=new \
    --disable-gpu \
    --hide-scrollbars \
    --force-device-scale-factor=1 \
    --user-data-dir="$temporary_profile" \
    --window-size="$size" \
    --screenshot="$screenshot_path" \
    "file://$source_directory/$source_file" >/dev/null 2>&1 &
  chrome_pid=$!

  for _ in {1..200}; do
    if [[ -s "$screenshot_path" ]]; then
      break
    fi
    if ! kill -0 "$chrome_pid" 2>/dev/null; then
      break
    fi
    sleep 0.1
  done

  if kill -0 "$chrome_pid" 2>/dev/null; then
    kill "$chrome_pid" 2>/dev/null || true
  fi
  wait "$chrome_pid" 2>/dev/null || true

  rm -rf "$temporary_profile"
  if [[ ! -s "$screenshot_path" ]]; then
    printf 'Chrome did not render %s\n' "$source_file" >&2
    exit 1
  fi
  printf '%s\n' "$screenshot_path"
}

render promo-small.html promo-small-440x280.png 440,280
render promo-marquee.html promo-marquee-1400x560.png 1400,560
