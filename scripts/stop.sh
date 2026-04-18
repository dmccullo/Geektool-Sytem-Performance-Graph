#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-26498}"
PIDS="$(lsof -t -iTCP:"${PORT}" -sTCP:LISTEN 2>/dev/null || true)"

if [[ -z "${PIDS}" ]]; then
  echo "No process listening on TCP port ${PORT}."
  exit 0
fi

echo "Stopping PID(s) on port ${PORT}: ${PIDS}"
kill ${PIDS}
echo "Done."
