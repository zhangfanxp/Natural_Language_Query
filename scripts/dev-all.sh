#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT_DIR"

if [ ! -x python/.venv/bin/uvicorn ]; then
  echo "未找到 Python Wren 服务环境。先运行：bash scripts/install-mac.sh" >&2
  exit 1
fi

export WREN_HOME="$ROOT_DIR/data/wren-home"
python/.venv/bin/uvicorn service:app --app-dir python --host 127.0.0.1 --port 8765 &
WREN_PID=$!
cleanup() {
  kill "$WREN_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM
npm run dev
