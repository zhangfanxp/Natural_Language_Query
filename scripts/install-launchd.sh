#!/bin/sh
set -eu

APP_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
APP_HOME=${HOME:?请以部署该应用的 macOS 用户运行此脚本}
UID_VALUE=$(id -u)
LABEL_PREFIX="com.wren-system"
AGENT_DIR="$APP_HOME/Library/LaunchAgents"
LOG_DIR="$APP_ROOT/data/logs"
PYTHON="$APP_ROOT/python/.venv/bin/python"
UVICORN="$APP_ROOT/python/.venv/bin/uvicorn"
NEXT_CLI="$APP_ROOT/node_modules/next/dist/bin/next"
NODE=$(command -v node || true)
WEB_HOST=${WREN_WEB_HOST:-0.0.0.0}

if [ "$UID_VALUE" -eq 0 ]; then
  echo "请以应用所属的普通 macOS 用户运行，不要使用 sudo。" >&2
  exit 1
fi
if [ -z "$NODE" ] || [ ! -x "$PYTHON" ] || [ ! -x "$UVICORN" ] || [ ! -f "$NEXT_CLI" ]; then
  echo "未找到 Node.js 或项目依赖。先运行 scripts/install-mac.sh。" >&2
  exit 1
fi
if [ ! -f "$APP_ROOT/.next/BUILD_ID" ]; then
  echo "没有找到 Next.js 生产构建。请先运行 npm run build。" >&2
  exit 1
fi

mkdir -p "$APP_ROOT/data" "$AGENT_DIR" "$LOG_DIR"
chmod 700 "$APP_ROOT/data" "$LOG_DIR"

"$PYTHON" - "$APP_ROOT" "$APP_HOME" "$NODE" "$WEB_HOST" "$AGENT_DIR" "$LOG_DIR" <<'PY'
import os
import plistlib
import sys
from pathlib import Path

app_root = Path(sys.argv[1])
app_home = Path(sys.argv[2])
node = Path(sys.argv[3])
web_host = sys.argv[4]
agent_dir = Path(sys.argv[5])
log_dir = Path(sys.argv[6])
venv_bin = app_root / "python" / ".venv" / "bin"
path_parts = [str(node.parent), str(venv_bin), "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", "/usr/sbin", "/sbin"]
environment = {
    "HOME": str(app_home),
    "PATH": os.pathsep.join(dict.fromkeys(path_parts)),
    "NODE_ENV": "production",
    "WREN_HOME": str(app_root / "data" / "wren-home"),
}

jobs = [
    (
        "web",
        [str(node), str(app_root / "node_modules" / "next" / "dist" / "bin" / "next"), "start", "--hostname", web_host, "--port", "3000"],
        "wren-web.log",
    ),
    (
        "python",
        [str(app_root / "python" / ".venv" / "bin" / "uvicorn"), "service:app", "--app-dir", str(app_root / "python"), "--host", "127.0.0.1", "--port", "8765"],
        "wren-python.log",
    ),
]

for service, arguments, log_name in jobs:
    label = f"com.wren-system.{service}"
    plist = {
        "Label": label,
        "ProgramArguments": arguments,
        "WorkingDirectory": str(app_root),
        "EnvironmentVariables": environment,
        "RunAtLoad": True,
        "KeepAlive": True,
        "StandardOutPath": str(log_dir / log_name),
        "StandardErrorPath": str(log_dir / log_name),
    }
    target = agent_dir / f"{label}.plist"
    with target.open("wb") as output:
        plistlib.dump(plist, output, fmt=plistlib.FMT_XML, sort_keys=True)
    target.chmod(0o644)
PY

for service in web python; do
  LABEL="$LABEL_PREFIX.$service"
  PLIST="$AGENT_DIR/$LABEL.plist"
  launchctl bootout "gui/$UID_VALUE" "$PLIST" >/dev/null 2>&1 || true
  launchctl enable "gui/$UID_VALUE/$LABEL"
  launchctl bootstrap "gui/$UID_VALUE" "$PLIST"
  launchctl kickstart -k "gui/$UID_VALUE/$LABEL"
done

echo "生产服务已注册并启动：Next.js :3000（$WEB_HOST），Python/Wren 127.0.0.1:8765。"
echo "日志目录：$LOG_DIR"
echo "LaunchAgent 会在此用户登录后启动；公网部署请使用 HTTPS 反向代理。"
