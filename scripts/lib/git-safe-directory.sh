#!/usr/bin/env bash
# Source from deploy scripts: mark APP_DIR trusted for git (root vs deploy user ownership).
ensure_git_safe_directory() {
  local dir="${1:-}"
  if [[ -z "$dir" ]]; then
    echo "ensure_git_safe_directory: missing directory argument" >&2
    return 1
  fi
  dir="$(cd "$dir" && pwd)"
  if [[ ! -d "$dir/.git" ]]; then
    return 0
  fi
  if git -C "$dir" rev-parse HEAD >/dev/null 2>&1; then
    return 0
  fi
  echo "==> Git: mark safe.directory $dir (fix dubious ownership)"
  if git config --global --get-all safe.directory 2>/dev/null | grep -Fxq "$dir"; then
    return 0
  fi
  git config --global --add safe.directory "$dir"
}
