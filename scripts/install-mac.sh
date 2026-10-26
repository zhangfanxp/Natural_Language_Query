#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT_DIR"

PYTHON_BIN="${PYTHON_BIN:-}"
if [ -z "$PYTHON_BIN" ]; then
  for candidate in python3.12 python3.13 python3.11; do
    if command -v "$candidate" >/dev/null 2>&1; then
      PYTHON_BIN=$(command -v "$candidate")
      break
    fi
  done
fi

if [ -z "$PYTHON_BIN" ]; then
  echo "需要 Python 3.11、3.12 或 3.13。可通过 Homebrew 安装：brew install python@3.12" >&2
  exit 1
fi

echo "使用 Python：$PYTHON_BIN"
npm install
"$PYTHON_BIN" -m venv python/.venv
python/.venv/bin/python -m pip install --upgrade pip
python/.venv/bin/python -m pip install -r python/requirements.txt
echo "安装完成。运行 npm run dev:all 启动本地开发服务。"
