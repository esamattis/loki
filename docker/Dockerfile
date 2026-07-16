FROM debian:bookworm-slim AS downloader

ARG TARGETARCH

RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates curl jq \
    && rm -rf /var/lib/apt/lists/*

RUN set -eux; \
    case "${TARGETARCH}" in \
        amd64|arm64) ;; \
        *) echo "Unsupported architecture: ${TARGETARCH}" >&2; exit 1 ;; \
    esac; \
    release="$(curl --fail --silent --show-error --location \
        https://api.github.com/repos/esamattis/loki/releases/latest)"; \
    url="$(printf '%s' "${release}" | jq --raw-output \
        --arg suffix "-linux-${TARGETARCH}.tar.gz" \
        '.assets[] | select(.name | endswith($suffix)) | .browser_download_url')"; \
    test -n "${url}"; \
    mkdir /download; \
    curl --fail --silent --show-error --location "${url}" \
        | tar --extract --gzip --directory /download; \
    chmod 0755 /download/loki

FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates libatomic1 libstdc++6 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --shell /usr/sbin/nologin loki \
    && install --directory --owner loki --group loki /var/lib/loki

COPY --from=downloader /download/loki /usr/local/bin/loki

USER loki
VOLUME ["/var/lib/loki"]
EXPOSE 8787

ENTRYPOINT ["/usr/local/bin/loki"]
CMD ["--host", "0.0.0.0", "--port", "8787", "--sqlite-dir", "/var/lib/loki", "--no-open"]
