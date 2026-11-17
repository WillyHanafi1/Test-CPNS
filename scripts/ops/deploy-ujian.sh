#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
exec 9>/tmp/ujian-release.lock
flock -n 9 || { printf 'Another Ujian operation is running.\n' >&2; exit 1; }
compose() { bash scripts/ops/compose.sh "$@"; }
start_app() {
    python3 scripts/ops/preflight.py app || return
    compose config --quiet || return
    compose up -d --no-build --wait --wait-timeout 60 redis || return
    compose run --rm --no-deps backend python -m backend.ops.check_schema || return
    compose up -d --no-build --wait --wait-timeout 180 backend frontend gateway worker beat || return
    compose exec -T gateway wget -q -O /dev/null --header 'Host: tocpns.my.id' http://127.0.0.1:8080/health || return
    compose exec -T gateway wget -q -O /dev/null --header 'Host: tocpns.my.id' http://127.0.0.1:8080/ || return
}
release_tag() {
    local tag
    tag="$(sed -n 's/^RELEASE_TAG=//p' "$1")"
    printf '%s' "${tag:-prepared}"
}
cleanup_images() {
    local current previous repository images image tag
    current="$(release_tag .server-notes/images.env)"
    previous="$(release_tag .server-notes/images.previous.env)"
    for repository in ujian-backend ujian-frontend ujian-gateway; do
        images="$(docker image ls "$repository" --format '{{.Repository}}:{{.Tag}}')" || return
        while IFS= read -r image; do
            [[ -n "$image" ]] || continue
            tag="${image#*:}"
            [[ "$tag" == "$current" || "$tag" == "$previous" || "$tag" == '<none>' ]] && continue
            # No --force: images referenced by any container are also preserved.
            docker image rm "$image" || printf 'Kept image still in use: %s\n' "$image" >&2
        done <<< "$images"
    done
}
prune_build_cache() {
    # Only this application's dedicated builder, never the shared default builder.
    local help
    help="$(docker buildx prune --help)" || return
    if [[ "$help" == *--max-used-space* ]]; then
        docker buildx prune --builder ujian-ci --all --force --reserved-space 0 --max-used-space 512MB
    else
        docker buildx prune --builder ujian-ci --all --force --keep-storage 512MB
    fi
}
finish_release() {
    local result="$?" repository
    trap - EXIT
    set +e
    if (( result != 0 )); then
        printf 'Release failed; restoring the previous image manifest.\n' >&2
        if cp -p -- "$release_snapshot" .server-notes/images.env; then
            if (( release_switched )); then
                if start_app; then
                    printf 'Previous release recovered; deployment remains failed.\n' >&2
                else
                    printf 'Recovery failed; inspect containers and images.previous.env.\n' >&2
                fi
            fi
            if [[ -n "$release_candidate" ]]; then
                for repository in ujian-backend ujian-frontend ujian-gateway; do
                    docker image rm "$repository:$release_candidate" >/dev/null 2>&1
                done
            fi
        else
            printf 'Manifest restore failed. Recovery copy: %s\n' "$release_snapshot" >&2
            exit "$result"
        fi
    fi
    if (( release_builder_ready )); then
        prune_build_cache || printf 'Warning: builder cache cleanup failed.\n' >&2
        docker buildx stop ujian-ci || printf 'Warning: could not stop idle builder.\n' >&2
    fi
    rm -f -- "$release_snapshot"
    exit "$result"
}
case "${1:-help}" in
    release)
        expected="${2:-}"
        [[ "$expected" =~ ^[0-9a-f]{40}$ && "$(git rev-parse HEAD)" == "$expected" ]] || {
            printf 'Release requires the exact tested 40-character commit SHA.\n' >&2; exit 1;
        }
        python3 scripts/ops/preflight.py app
        # Use the running backend's existing connection before spending disk/RAM on builds.
        python3 scripts/ops/check-release-schema.py
        umask 077
        release_snapshot="$(mktemp .server-notes/images.release.XXXXXX)"
        cp -p -- .server-notes/images.env "$release_snapshot"
        release_switched=0
        release_builder_ready=0
        release_candidate=''
        trap finish_release EXIT
        if ! builder_info="$(docker buildx inspect ujian-ci 2>/dev/null)"; then
            docker buildx create --name ujian-ci --driver docker-container \
                --driver-opt default-load=true,memory=1536m \
                --buildkitd-config infra/buildkit/ujian-ci.toml
            builder_info="$(docker buildx inspect ujian-ci)"
        fi
        [[ "$builder_info" =~ Driver:[[:space:]]+docker-container($|[[:space:]]) ]] || {
            printf 'ujian-ci must be a dedicated docker-container builder.\n' >&2; exit 1;
        }
        release_builder_ready=1
        python3 scripts/ops/release-tag.py
        release_candidate="$(release_tag .server-notes/images.env)"
        compose config --quiet
        for service in backend frontend gateway; do compose build --builder ujian-ci "$service"; done
        # Check the candidate before replacing any running application container.
        compose run --rm --no-deps backend python -m backend.ops.check_schema
        release_switched=1
        start_app
        cp -p -- "$release_snapshot" .server-notes/images.previous.env
        cleanup_images || printf 'Warning: old image cleanup was incomplete.\n' >&2
        printf 'Release healthy: %s\n' "$release_candidate"
        ;;
    build)
        python3 scripts/ops/preflight.py build
        python3 scripts/ops/release-tag.py
        compose config --quiet
        # Serialize builds on the shared 4 GB server.
        for service in backend frontend gateway; do compose build "$service"; done
        ;;
    preview)
        python3 scripts/ops/preflight.py build
        compose up -d --no-build --wait --wait-timeout 120 frontend gateway
        ;;
    start)
        start_app
        ;;
    connect)
        # Bootstrap the connector before the dashboard's route setup step.
        # Does not create public DNS/hostname routes or start database consumers.
        python3 scripts/ops/preflight.py connector
        compose config --quiet
        compose --profile public up -d --no-build --wait --wait-timeout 180 tunnel
        ;;
    tunnel)
        python3 scripts/ops/preflight.py tunnel
        # Refuse to publish until application dependencies and schema are ready.
        compose run --rm --no-deps backend python -m backend.ops.check_schema
        compose exec -T backend python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8001/health',timeout=5)"
        compose --profile public up -d --no-build --wait --wait-timeout 120 tunnel
        ;;
    status)
        compose --profile public ps --all
        ;;
    *)
        printf 'Usage: bash scripts/ops/deploy-ujian.sh {release COMMIT_SHA|build|preview|start|connect|tunnel|status}\n'
        printf 'Migrations are intentionally manual after database backup and review.\n'
        exit 2
        ;;
esac
