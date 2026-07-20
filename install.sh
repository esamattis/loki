#!/usr/bin/env bash
set -euo pipefail

REPO="esamattis/loki"
INSTALL_DIR="${HOME}/.local/bin"
BINARY_NAME="loki"

function log() {
    printf '%s\n' "$*"
}

function fail() {
    printf 'error: %s\n' "$*" >&2
    exit 1
}

os="$(uname -s)"
arch="$(uname -m)"

case "${os}" in
    Linux) platform="linux" ;;
    Darwin) platform="macos" ;;
    *) fail "unsupported OS: ${os}" ;;
esac

case "${arch}" in
    x86_64 | amd64) architecture="amd64" ;;
    aarch64 | arm64) architecture="arm64" ;;
    *) fail "unsupported architecture: ${arch}" ;;
esac

if [[ "${platform}" == "macos" && "${architecture}" != "arm64" ]]; then
    fail "only macOS ARM64 binaries are available"
fi

if [[ "${platform}" == "linux" && "${architecture}" != "amd64" && "${architecture}" != "arm64" ]]; then
    fail "only Linux AMD64 and ARM64 binaries are available"
fi

log "Fetching latest Loki release..."
tag="$(
    curl --fail --silent --show-error --location \
        "https://api.github.com/repos/${REPO}/releases/latest" |
        sed -n 's/.*"tag_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' |
        head -n 1
)"
[[ -n "${tag}" ]] || fail "could not determine latest release tag"

filename="loki-${tag}-${platform}-${architecture}.tar.gz"
url="https://github.com/${REPO}/releases/download/${tag}/${filename}"
dest="${INSTALL_DIR}/${BINARY_NAME}"

tmpdir="$(mktemp -d)"
trap 'rm -rf "${tmpdir}"' EXIT

log "Downloading ${filename}..."
curl --fail --silent --show-error --location "${url}" --output "${tmpdir}/${filename}"

log "Extracting..."
tar --extract --gzip --file "${tmpdir}/${filename}" --directory "${tmpdir}"
[[ -f "${tmpdir}/${BINARY_NAME}" ]] || fail "archive did not contain ${BINARY_NAME}"

mkdir -p "${INSTALL_DIR}"
install -m 0755 "${tmpdir}/${BINARY_NAME}" "${dest}"

log "Installed Loki ${tag} to ${dest}"

case ":${PATH}:" in
    *":${INSTALL_DIR}:"*) ;;
    *)
        log "Note: ${INSTALL_DIR} is not in your PATH. Add it to run loki from any directory."
        ;;
esac
