#!/usr/bin/env bash
set -euo pipefail

repository_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
output_directory=${1:-"$repository_root/dist"}
extension_version=$(jq -er '.version' "$repository_root/manifest.json")
archive_path="$output_directory/paper-clipper-$extension_version.zip"
staging_directory=$(mktemp -d "${TMPDIR:-/tmp}/paper-clipper-package.XXXXXX")

cleanup() {
  rm -rf "$staging_directory"
}
trap cleanup EXIT

mkdir -p "$output_directory"

runtime_paths=(
  manifest.json
  background
  icons
  options
  parsers
  popup
  shared
  templates
)

for runtime_path in "${runtime_paths[@]}"; do
  cp -R "$repository_root/$runtime_path" "$staging_directory/"
done

find "$staging_directory" -name '.DS_Store' -delete

rm -f "$archive_path"
(
  cd "$staging_directory"
  zip -q -r "$archive_path" .
)

unzip -tq "$archive_path" >/dev/null
printf '%s\n' "$archive_path"
