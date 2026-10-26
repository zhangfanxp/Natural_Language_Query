#!/bin/sh
set -eu

APP_HOME=${HOME:?请以安装该应用的 macOS 用户运行此脚本}
UID_VALUE=$(id -u)
AGENT_DIR="$APP_HOME/Library/LaunchAgents"

if [ "$UID_VALUE" -eq 0 ]; then
  echo "请以应用所属的普通 macOS 用户运行，不要使用 sudo。" >&2
  exit 1
fi

for service in web python; do
  LABEL="com.wren-system.$service"
  PLIST="$AGENT_DIR/$LABEL.plist"
  launchctl bootout "gui/$UID_VALUE" "$PLIST" >/dev/null 2>&1 || true
  launchctl disable "gui/$UID_VALUE/$LABEL" >/dev/null 2>&1 || true
  rm -f "$PLIST"
done

echo "Next.js 与 Python/Wren LaunchAgent 已停止并移除。应用数据仍保留在项目的 data/ 目录。"
