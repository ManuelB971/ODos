# ---------- Base PHP-FPM ----------
FROM php:8.2-fpm-alpine AS base

RUN apk add --no-cache \
        icu-dev \
        libpq-dev \
        libzip-dev \
        freetype-dev \
        libjpeg-turbo-dev \
        libpng-dev \
        zip \
        unzip \
        git \
        curl \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install \
        pdo_pgsql \
        pgsql \
        intl \
        zip \
        gd \
        opcache \
    && docker-php-ext-enable opcache

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

ENV COMPOSER_ALLOW_SUPERUSER=1 \
    COMPOSER_MEMORY_LIMIT=-1 \
    COMPOSER_PROCESS_TIMEOUT=600

WORKDIR /app

# Symfony reads env from Docker / env_file; PHP-FPM defaults to clear_env=yes which strips them from workers.
RUN printf '\n; Allow container env (Docker Compose env_file) to reach PHP workers\nclear_env = no\n' >> /usr/local/etc/php-fpm.d/www.conf

# ---------- Dev target (default) ----------
FROM base AS dev

RUN apk add --no-cache $PHPIZE_DEPS linux-headers \
    && pecl install xdebug \
    && docker-php-ext-enable xdebug

COPY composer.json composer.lock ./
# Do not pass --prefer-dist: it disables git source fallback when codeload.github.com
# returns HTTP 400 (common on VPS Docker builds / GitHub rate limits).
ARG COMPOSER_GITHUB_TOKEN=
RUN if [ -n "${COMPOSER_GITHUB_TOKEN}" ]; then \
        composer config --global github-oauth.github.com "${COMPOSER_GITHUB_TOKEN}"; \
    fi \
    && for attempt in 1 2 3; do \
        composer install --no-scripts --no-interaction --optimize-autoloader \
        && break; \
        if [ "${attempt}" -eq 3 ]; then exit 1; fi; \
        echo "composer install failed (attempt ${attempt}/3), retrying in 20s..."; \
        sleep 20; \
    done

COPY . .
RUN composer run-script post-install-cmd || true

RUN mkdir -p public/uploads/avatars public/uploads/activities \
    && mkdir -p var/cache var/log var/share \
    && chown -R www-data:www-data var public/uploads

EXPOSE 9000
CMD ["php-fpm"]

# ---------- Prod target ----------
FROM base AS prod

ENV APP_ENV=prod

COPY composer.json composer.lock ./
ARG COMPOSER_GITHUB_TOKEN=
RUN if [ -n "${COMPOSER_GITHUB_TOKEN}" ]; then \
        composer config --global github-oauth.github.com "${COMPOSER_GITHUB_TOKEN}"; \
    fi \
    && for attempt in 1 2 3; do \
        composer install --no-dev --no-scripts --no-interaction --optimize-autoloader \
        && break; \
        if [ "${attempt}" -eq 3 ]; then exit 1; fi; \
        echo "composer install failed (attempt ${attempt}/3), retrying in 20s..."; \
        sleep 20; \
    done

COPY . .
RUN composer run-script post-install-cmd || true \
    && composer dump-autoload --optimize --classmap-authoritative

RUN mkdir -p public/uploads/avatars public/uploads/activities \
    && mkdir -p var/cache var/log var/share \
    && chown -R www-data:www-data var public/uploads

EXPOSE 9000
CMD ["php-fpm"]
