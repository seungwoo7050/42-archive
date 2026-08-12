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
        default-mysql-client \
        libfcgi-bin \
        php8.2-cli \
        php8.2-curl \
        php8.2-fpm \
        php8.2-gd \
        php8.2-intl \
        php8.2-mbstring \
        php8.2-mysql \
        php8.2-xml \
        php8.2-zip \
    && rm -rf /var/lib/apt/lists/*

ENV WP_CLI_VERSION=2.11.0 \
    WORDPRESS_VERSION=6.7.7

RUN curl -fsSL \
        "https://github.com/wp-cli/wp-cli/releases/download/v${WP_CLI_VERSION}/wp-cli-${WP_CLI_VERSION}.phar" \
        -o /usr/local/bin/wp \
    && echo 'a39021ac809530ea607580dbf93afbc46ba02f86b6cffd03de4b126ca53079f6  /usr/local/bin/wp' \
        | sha256sum -c - \
    && chmod 0755 /usr/local/bin/wp \
    && curl -fsSL "https://wordpress.org/wordpress-${WORDPRESS_VERSION}.tar.gz" \
        -o /tmp/wordpress.tar.gz \
    && echo 'dadac21d0fd6f54f7c0565d8935d3e4baea5e649486ac6f40fe89792da498350  /tmp/wordpress.tar.gz' \
        | sha256sum -c - \
    && mkdir -p /usr/src/wordpress /run/php /var/www/html /var/www/config \
    && tar -xzf /tmp/wordpress.tar.gz --strip-components=1 -C /usr/src/wordpress \
    && rm /tmp/wordpress.tar.gz \
    && cd /usr/src/wordpress \
    && find . -type f ! -path './wp-content/*' -print0 \
        | sort -z \
        | xargs -0 sha256sum > /usr/src/wordpress-core.sha256 \
    && chown -R www-data:www-data \
        /usr/src/wordpress /run/php /var/www/html /var/www/config

WORKDIR /var/www/html

COPY conf/www.conf /etc/php/8.2/fpm/pool.d/www.conf
COPY tools/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 9000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["php-fpm8.2", "-F"]
