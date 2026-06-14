#!/usr/bin/env bash
# Install the outreach monitor as a macOS LaunchAgent so it runs 24/7 on its own —
# at login, restarted if it crashes, independent of any editor or terminal. It keeps
# retrying until Proton Bridge is up. Sending stays governed by SEND_ENABLED, so this
# is safe to run continuously (monitors + drafts; sends nothing until you enable it).
#
#   bash outreach/install_monitor.sh           # install + start
#   bash outreach/install_monitor.sh uninstall # stop + remove
set -euo pipefail

LABEL="com.cancercure.outreach-monitor"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
PY="$(command -v python3)"
LOG_DIR="$REPO/outreach/.state"

if [ "${1:-}" = "uninstall" ]; then
  launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || launchctl unload -w "$PLIST" 2>/dev/null || true
  rm -f "$PLIST"
  echo "Uninstalled $LABEL"
  exit 0
fi

mkdir -p "$HOME/Library/LaunchAgents" "$LOG_DIR"

cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$PY</string>
    <string>$REPO/outreach/monitor.py</string>
  </array>
  <key>WorkingDirectory</key><string>$REPO</string>
  <key>EnvironmentVariables</key>
  <dict><key>PYTHONUNBUFFERED</key><string>1</string></dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>30</integer>
  <key>StandardOutPath</key><string>$LOG_DIR/monitor.log</string>
  <key>StandardErrorPath</key><string>$LOG_DIR/monitor.log</string>
</dict>
</plist>
PLIST

# (Re)load.
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || launchctl unload -w "$PLIST" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST" 2>/dev/null || launchctl load -w "$PLIST"

echo "Installed + started $LABEL"
echo "  plist: $PLIST"
echo "  logs:  $LOG_DIR/monitor.log"
echo "  status: launchctl print gui/$(id -u)/$LABEL | grep -i state"
echo "  stop:   bash outreach/install_monitor.sh uninstall"
