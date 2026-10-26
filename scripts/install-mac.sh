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

pkg_config_has_mysqlclient() {
  for package_name in mysqlclient mariadb libmariadb perconaserverclient; do
    if pkg-config --exists "$package_name" 2>/dev/null; then
      return 0
    fi
  done
  return 1
}

ensure_xcode_command_line_tools() {
  if ! xcode-select -p >/dev/null 2>&1; then
    echo "编译 mysqlclient 需要 Apple Command Line Tools。请先运行：xcode-select --install" >&2
    exit 1
  fi
}

ensure_mysqlclient_build_dependencies() {
  if command -v pkg-config >/dev/null 2>&1 && pkg_config_has_mysqlclient; then
    ensure_xcode_command_line_tools
    return
  fi

  if ! command -v brew >/dev/null 2>&1; then
    echo "安装 Wren 的 MySQL 连接器需要 pkg-config 和 MySQL client 开发文件。请安装 Homebrew 后执行：" >&2
    echo '  brew install pkg-config mysql-client' >&2
    echo '  export PKG_CONFIG_PATH="$(brew --prefix mysql-client)/lib/pkgconfig"' >&2
    exit 1
  fi

  HOMEBREW_PREFIX=$(brew --prefix)
  PATH="$HOMEBREW_PREFIX/bin:$HOMEBREW_PREFIX/sbin:$PATH"
  export PATH

  if ! command -v pkg-config >/dev/null 2>&1; then
    echo "安装 mysqlclient 编译工具：pkg-config"
    brew install pkg-config
  fi

  if ! pkg_config_has_mysqlclient; then
    echo "安装 mysqlclient 开发库：mysql-client"
    brew install mysql-client
    MYSQLCLIENT_PKGCONFIG_DIR="$(brew --prefix mysql-client)/lib/pkgconfig"
    PKG_CONFIG_PATH="$MYSQLCLIENT_PKGCONFIG_DIR${PKG_CONFIG_PATH:+:$PKG_CONFIG_PATH}"
    export PKG_CONFIG_PATH
  fi

  if ! pkg_config_has_mysqlclient; then
    echo "pkg-config 仍未找到 MySQL client 开发文件。请确认 mysql-client 已安装，并检查 PKG_CONFIG_PATH。" >&2
    echo "当前 PKG_CONFIG_PATH：${PKG_CONFIG_PATH:-<未设置>}" >&2
    exit 1
  fi

  ensure_xcode_command_line_tools
}

echo "使用 Python：$PYTHON_BIN"
ensure_mysqlclient_build_dependencies
npm install
"$PYTHON_BIN" -m venv python/.venv
python/.venv/bin/python -m pip install --upgrade pip
python/.venv/bin/python -m pip install -r python/requirements.txt
echo "安装完成。运行 npm run dev:all 启动本地开发服务。"
