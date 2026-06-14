#!/usr/bin/env bash
# Manage the outreach monitor as a macOS LaunchAgent so it runs 24/7 on its own —
# at login, restarted if it crashes, independent of any editor or terminal. It keeps
# retrying until Proton Bridge is up. Sending stays governed by SEND_ENABLED, so this
# is safe to run continuously (monitors + drafts; sends only when you enable it).
#
#   bash outreach/install_monitor.sh            # install + start
#   bash outreach/install_monitor.sh reload     # restart (pick up outreach/.env changes)
#   bash outreach/install_monitor.sh status     # show state + recent log
#   bash outreach/install_monitor.sh uninstall  # stop + remove
set -euo pipefail

LABEL="com.cancercure.outreach-monitor"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
PY="$(command -v python3)"
LOG_DIR="$REPO/outreach/.state"
GUI="gui/$(id -u)"
CMD="${1:-install}"

case "$CMD" in
  uninstall)
    launchctl bootout "$GUI/$LABEL" 2>/dev/null || launchctl unload -w "$PLIST" 2>/dev/null || true
    rm -f "$PLIST"; echo "Uninstalled $LABEL"; exit 0 ;;
  reload)
    launchctl kickstart -k "$GUI/$LABEL" 2>/dev/null \
      && echo "Reloaded $LABEL (re-read outreach/.env)" \
      || { echo "Not loaded yet — installing instead"; CMD=install; }
    [ "$CMD" = reload ] && exit 0 ;;
  status)
    launchctl print "$GUI/$LABEL" 2>/dev/null | grep -iE "state =|pid =" || echo "not loaded"
    echo "--- recent log ($LOG_DIR/monitor.log) ---"; tail -n 15 "$LOG_DIR/monitor.log" 2>/dev/null || true
    exit 0 ;;
esac

# install (default)
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

launchctl bootout "$GUI/$LABEL" 2>/dev/null || launchctl unload -w "$PLIST" 2>/dev/null || true
launchctl bootstrap "$GUI" "$PLIST" 2>/dev/null || launchctl load -w "$PLIST"
echo "Installed + started $LABEL"
echo "  plist: $PLIST"
echo "  logs:  $LOG_DIR/monitor.log"
echo "  reload after editing .env:  bash outreach/install_monitor.sh reload"
echo "  status:                     bash outreach/install_monitor.sh status"
echo "  stop:                       bash outreach/install_monitor.sh uninstall"
