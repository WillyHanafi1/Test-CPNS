#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
python3 scripts/ops/prepare_backup.py
for unit in ujian-backup.service ujian-backup.timer ujian-monitor.service ujian-monitor.timer; do
    install -m 644 "infra/systemd/$unit" "/etc/systemd/system/$unit"
done
systemctl daemon-reload
systemctl enable --now ujian-backup.timer ujian-monitor.timer
printf 'Backup and monitoring timers installed. Run backup-ujian.sh once to verify recovery artifacts.\n'
