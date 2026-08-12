FROM debian:bookworm-20260803-slim@sha256:abd67ffcfa541b485a3dff59865ab629aa048a6c613e639d36e7456b0b229241

RUN printf '%s\n' \
        'deb [check-valid-until=no] http://snapshot.debian.org/archive/debian/20260812T000000Z bookworm main' \
        'deb [check-valid-until=no] http://snapshot.debian.org/archive/debian/20260812T000000Z bookworm-updates main' \
        'deb [check-valid-until=no] http://snapshot.debian.org/archive/debian-security/20260812T000000Z bookworm-security main' \
        > /etc/apt/sources.list \
    && rm -f /etc/apt/sources.list.d/debian.sources

RUN apt-get -o Acquire::Check-Valid-Until=false update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        nginx \
        openssl \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /etc/nginx/ssl /var/www/html /run/nginx

COPY conf/nginx.conf /etc/nginx/sites-available/default
COPY tools/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 443

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
