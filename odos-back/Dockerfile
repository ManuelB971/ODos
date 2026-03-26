# ---------- Base PHP-FPM ----------
FROM php:8.2-fpm-alpine AS base

RUN apk add --no-cache \
        icu-dev \
        libpq-dev \
        libzip-dev \
        zip \
        unzip \
        git \
        curl \
    && docker-php-ext-install \
        pdo_pgsql \
        pgsql \
        intl \
        zip \
        opcache \
    && docker-php-ext-enable opcache

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# ---------- Dev target (default) ----------
FROM base AS dev

COPY composer.json composer.lock ./
RUN composer install --no-scripts --no-interaction --prefer-dist

COPY . .
RUN composer run-script post-install-cmd || true

RUN mkdir -p var/cache var/log var/share \
    && chown -R www-data:www-data var

EXPOSE 9000
CMD ["php-fpm"]

# ---------- Prod target ----------
FROM base AS prod

ENV APP_ENV=prod

COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-interaction --prefer-dist --optimize-autoloader

COPY . .
RUN composer run-script post-install-cmd || true \
    && composer dump-autoload --optimize --classmap-authoritative

RUN mkdir -p var/cache var/log var/share \
    && chown -R www-data:www-data var

EXPOSE 9000
CMD ["php-fpm"]
