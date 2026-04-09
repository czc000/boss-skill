#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SKILLS_DIR="${CODEX_SKILLS_DIR:-${HOME}/.agents/skills}"
TARGET_DIR="${SKILLS_DIR}/boss-daily-followup"
SOURCE_SKILL="${REPO_ROOT}/skills/boss-daily-followup/SKILL.md"
TARGET_SKILL="${TARGET_DIR}/SKILL.md"

mkdir -p "${TARGET_DIR}"

sed "s|__BOSS_SKILL_ROOT__|${REPO_ROOT}|g" "${SOURCE_SKILL}" > "${TARGET_SKILL}"

cat <<EOF
Installed boss-daily-followup skill to:
  ${TARGET_SKILL}

Next steps:
1. Ensure opencli is installed:
   npm install -g @jackwener/opencli
2. Ensure the Browser Bridge extension is installed in Chrome/Chromium.
3. Verify from the host environment:
   opencli doctor
4. If needed, verify the daemon directly:
   curl -H 'X-OpenCLI: 1' http://127.0.0.1:19825/status
EOF
