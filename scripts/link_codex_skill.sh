#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
skill_src="$repo_root/skills/paper-html-ingest"

if [[ ! -d "$skill_src" ]]; then
  echo "Skill source not found: $skill_src" >&2
  exit 1
fi

target_root="${1:-${CODEX_HOME:-$HOME/.codex}/skills}"
target="$target_root/paper-html-ingest"
mkdir -p "$target_root"

if [[ -L "$target" ]]; then
  rm "$target"
elif [[ -e "$target" ]]; then
  backup="$target.backup.$(date +%Y%m%d%H%M%S)"
  mv "$target" "$backup"
  echo "Backed up existing skill to: $backup"
fi

ln -s "$skill_src" "$target"
echo "Linked Codex skill: $target -> $skill_src"
echo "Restart Codex if you changed SKILL.md metadata or want the skill list refreshed."
