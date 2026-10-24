#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE="$(command -v node || true)"
if [[ -z "$NODE" ]]; then
  echo "node is required" >&2
  exit 1
fi
if ! command -v systemctl >/dev/null 2>&1; then
  echo "systemd is required for the always-on installer" >&2
  exit 1
fi

UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
UNIT="$UNIT_DIR/42ndmind-live.service"
STATE="${MIND_STATE_PATH:-$HOME/.42ndmind/live-M.json}"
PORT="${MIND_PORT:-4242}"
HOST="${MIND_HOST:-127.0.0.1}"
mkdir -p "$UNIT_DIR" "$(dirname "$STATE")"
chmod 700 "$(dirname "$STATE")"

cat > "$UNIT" <<EOF
[Unit]
Description=42ndMind persistent one-M individual
After=network.target

[Service]
Type=simple
WorkingDirectory=$ROOT
ExecStart=$NODE $ROOT/agi/live-individual.js
Environment=MIND_STATE_PATH=$STATE
Environment=MIND_HOST=$HOST
Environment=MIND_PORT=$PORT
Restart=always
RestartSec=2
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=$(dirname "$STATE")

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now 42ndmind-live.service

echo "42ndMind live individual enabled."
echo "State: $STATE"
echo "Interface: http://$HOST:$PORT/"
echo "Status: systemctl --user status 42ndmind-live.service"
echo "For boot-before-login on a persistent Linux host, an administrator may enable user lingering separately."
