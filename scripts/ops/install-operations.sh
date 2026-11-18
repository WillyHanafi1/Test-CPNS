#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
case "${1:-all}" in
    all|--monitor-only) ;;
    *) printf 'Usage: install-operations.sh [--monitor-only]\n' >&2; exit 2;;
esac
for unit in ujian-monitor.service ujian-monitor.timer; do
    install -m 644 "infra/systemd/$unit" "/etc/systemd/system/$unit"
done
systemctl daemon-reload
systemctl enable --now ujian-monitor.timer
systemctl start ujian-monitor.service
if [[ "${1:-all}" == --monitor-only ]]; then
    printf 'Monitoring active. Backup setup can be completed separately.\n'
    exit 0
fi
python3 scripts/ops/prepare_backup.py
# Retire the private compatibility unit once the corrected source is installed.
compatibility_unit=/etc/systemd/system/ujian-backup.service.d/operations-config.conf
if [[ -f "$compatibility_unit" ]] && grep -Fq '.server-notes/operations.override.yml' "$compatibility_unit"; then
    rm -f -- "$compatibility_unit"
fi
for unit in ujian-backup.service ujian-backup.timer; do
    install -m 644 "infra/systemd/$unit" "/etc/systemd/system/$unit"
done
systemctl daemon-reload
systemctl enable --now ujian-backup.timer
printf 'Backup and monitoring timers installed. Run backup-ujian.sh once to verify recovery artifacts.\n'
