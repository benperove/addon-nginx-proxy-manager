ARG BUILD_FROM=ghcr.io/hassio-addons/base:18.2.0
# hadolint ignore=DL3006
FROM ${BUILD_FROM}

# Required for webpack config of NPM with Node.js 22
ENV NODE_OPTIONS="--openssl-legacy-provider"

# Set shell
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Setup base
ARG NGINX_PROXY_MANAGER_VERSION="v2.15.0"
# hadolint ignore=DL3003,DL3013,DL3018,DL3042
RUN \
    apk update \
    && apk add --no-cache --upgrade libcrypto3 libssl3 musl \
    && apk add --no-cache --virtual .build-dependencies \
        build-base=0.5-r3 \
        git=2.49.1-r0 \
        libffi-dev=3.4.8-r0 \
        openssl-dev \
        python3-dev=3.12.13-r0 \
    \
    && apk add --no-cache \
        apache2-utils \
        certbot \
        libcap \
        logrotate \
        nginx-mod-stream \
        nginx \
        nodejs \
        npm \
        openssl \
        py3-pip \
        py3-setuptools \
        python3 \
        yarn \
    \
    && yarn global add modclean \
    \
    && curl -J -L -o /tmp/nginxproxymanager.tar.gz \
        "https://github.com/NginxProxyManager/nginx-proxy-manager/archive/${NGINX_PROXY_MANAGER_VERSION}.tar.gz" \
    && mkdir /app \
    && tar zxvf \
        /tmp/nginxproxymanager.tar.gz \
        --strip 1 -C /app \
    \
    && find /app -type f \( -name "*.js" -o -name "*.json" -o -name "*.conf" \) -exec sed -i 's|/data/|/config/|g' {} \; \
    && sed -i 's|/var/lib/nginx/cache|/tmp/nginx/cache|g' /app/docker/rootfs/etc/nginx/nginx.conf \
    && sed -i 's|. /opt/certbot/bin/activate && pip install --no-cache-dir |pip install --no-cache-dir |g' /app/backend/lib/certbot.js \
    && sed -i 's| && deactivate||g' /app/backend/lib/certbot.js \
    && node -e "const fs=require('fs');const p='/app/backend/lib/certbot.js';let s=fs.readFileSync(p,'utf8');const from=['\tplugin.version = plugin.version.replace(/{{certbot-version}}/g, process.env.CERTBOT_VERSION);','\tplugin.dependencies = plugin.dependencies.replace(/{{certbot-version}}/g, process.env.CERTBOT_VERSION);'].join('\\n');const to=['\tconst certbotVersion = process.env.CERTBOT_VERSION || \\\"\\\$(certbot --version 2>/dev/null | grep -Eo \\'[0-9](\\\\\\\\.[0-9]+)+\\' | head -1)\\\";','\tplugin.version = plugin.version.replace(/{{certbot-version}}/g, certbotVersion);','\tplugin.dependencies = plugin.dependencies.replace(/{{certbot-version}}/g, certbotVersion);'].join('\\n');if(!s.includes(from)) throw new Error('certbot.js patch source not found');fs.writeFileSync(p,s.replace(from,to));" \
    \
    && NPM_VER="${NGINX_PROXY_MANAGER_VERSION#v}" \
    && sed -i "s/\"version\": \"2.0.0\"/\"version\": \"${NPM_VER}\"/" /app/backend/package.json \
    && sed -i 's/update_available: internalRemoteVersion.compareVersions(currentVersion, latestVersion)/update_available: false/' /app/backend/internal/remote-version.js \
    && sed -i 's|jc21.com|NPM Fork|g' /app/frontend/src/components/SiteFooter.tsx \
    && sed -i 's|href="https://jc21.com"|href="https://github.com/benperove/addon-nginx-proxy-manager"|g' /app/frontend/src/components/SiteFooter.tsx \
    && sed -i 's|Theme by{" "}||g' /app/frontend/src/components/SiteFooter.tsx \
    && sed -i 's|<a href="https://tabler.io"[^>]*>Tabler</a>||g' /app/frontend/src/components/SiteFooter.tsx \
    \
    && cd /app/frontend \
    && yarn install --ignore-engines --network-timeout 100000 \
    && yarn locale-compile \
    && yarn build \
    && rm -rf node_modules \
    \
    && mkdir -p /opt/nginx-proxy-manager/frontend \
    && cp -r /app/frontend/dist/. /opt/nginx-proxy-manager/frontend/ \
    \
    && cd /app/backend \
    && yarn install \
    && rm -rf node_modules \
    && cp -r /app/backend/. /opt/nginx-proxy-manager/ \
    \
    && ( [ -d /app/global ] && cp -R /app/global/. /opt/nginx-proxy-manager/global/ || true ) \
    \
    && cd /opt/nginx-proxy-manager \
    && yarn install \
    && rm -rf /etc/services.d/frontend \
    && rm -rf /opt/nginx-proxy-manager/config \
    \
    && rm -f -r /etc/nginx \
    && cp -r /app/docker/rootfs/etc/nginx /etc/nginx \
    && rm -f /etc/nginx/conf.d/dev.conf \
    && mkdir -p /etc/nginx/modules \
    && echo 'load_module /usr/lib/nginx/modules/ngx_stream_module.so;' > /etc/nginx/modules/10_stream.conf \
    \
    && cp /app/docker/rootfs/etc/letsencrypt.ini /etc \
    && cp /app/docker/rootfs/etc/logrotate.d/nginx-proxy-manager /etc/logrotate.d \
    && sed -i 's/su npm npm/su root root/g' /etc/logrotate.d/nginx-proxy-manager \
    \
    && pip install --upgrade pip setuptools \
    && CERTBOT_VER=$(certbot --version 2>/dev/null | grep -Eo '[0-9](\.[0-9]+)+' | head -1) \
    && if [[ -n "${CERTBOT_VER}" ]]; then \
        echo "${CERTBOT_VER}" > /etc/certbot-version \
        && pip install --no-cache-dir "acme==${CERTBOT_VER}" "certbot-dns-cloudflare==${CERTBOT_VER}"; \
    else \
        pip install --no-cache-dir acme certbot-dns-cloudflare; \
    fi \
    \
    && sed -i "s#user npm;#user root;#" /etc/nginx/nginx.conf \
    && sed -i "s#root /app/frontend;#root /opt/nginx-proxy-manager/frontend;#" \
        /etc/nginx/conf.d/production.conf \
    && sed -i "s#table.string('id').notNull().primary();#table.string('id', 32).notNull().primary();#" \
        /opt/nginx-proxy-manager/migrations/20190227065017_settings.js \
    \
    && mkdir -p \
        /run/nginx \
    \
    && modclean \
        --path /opt/nginx-proxy-manager \
        --no-progress \
        --keep-empty \
        --run \
    \
    && yarn global remove modclean \
    && yarn cache clean \
    \
    && apk del --purge .build-dependencies \
    \
    && rm -f -r \
        /app \
        /etc/init.d/nginx \
        /etc/logrotate.d/nginx \
        /opt/nginx-proxy-manager/node_modules/bcrypt/build \
        /root/.cache \
        /root/.node-gyp \
        /tmp/.[!.]* \
        /tmp/* \
        /usr/lib/node_modules \
        /usr/local/share/.cache \
        /var/lib/nginx \
        /var/log/nginx \
        /var/tmp/nginx \
        /var/www

# Copy root filesystem
COPY rootfs /

# Build arguments
ARG BUILD_ARCH
ARG BUILD_DATE
ARG BUILD_DESCRIPTION
ARG BUILD_NAME
ARG BUILD_REF
ARG BUILD_REPOSITORY
ARG BUILD_VERSION

# Labels
LABEL \
    io.hass.name="${BUILD_NAME}" \
    io.hass.description="${BUILD_DESCRIPTION}" \
    io.hass.arch="${BUILD_ARCH}" \
    io.hass.type="addon" \
    io.hass.version=${BUILD_VERSION} \
    maintainer="Franck Nijhof <frenck@addons.community>" \
    org.opencontainers.image.title="${BUILD_NAME}" \
    org.opencontainers.image.description="${BUILD_DESCRIPTION}" \
    org.opencontainers.image.vendor="Home Assistant Community Add-ons" \
    org.opencontainers.image.authors="Franck Nijhof <frenck@addons.community>" \
    org.opencontainers.image.licenses="MIT" \
    org.opencontainers.image.url="https://addons.community" \
    org.opencontainers.image.source="https://github.com/${BUILD_REPOSITORY}" \
    org.opencontainers.image.documentation="https://github.com/${BUILD_REPOSITORY}/blob/main/README.md" \
    org.opencontainers.image.created=${BUILD_DATE} \
    org.opencontainers.image.revision=${BUILD_REF} \
    org.opencontainers.image.version=${BUILD_VERSION}
