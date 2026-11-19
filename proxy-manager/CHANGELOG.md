# Changelog

All notable changes to this Home Assistant add-on are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
add-on versioning aligns with upstream [Nginx Proxy Manager](https://github.com/NginxProxyManager/nginx-proxy-manager)
releases bundled in the image.

## [2.17.1] - 2026-11-19

### Changed

- Bump bundled upstream Nginx Proxy Manager to [v2.17.1](https://github.com/NginxProxyManager/nginx-proxy-manager/releases/tag/v2.17.1).

## [2.17.0] - 2026-11-13

### Changed

- Bump bundled upstream Nginx Proxy Manager to [v2.17.0](https://github.com/NginxProxyManager/nginx-proxy-manager/releases/tag/v2.17.0).

### Fixed

- Bake admin UI `production.conf` at build time (same pattern as 2.15.1) so the web UI on port 81 works reliably.

## [2.16.0] - 2026-09-25

### Changed

- Bump bundled upstream Nginx Proxy Manager to [v2.16.0](https://github.com/NginxProxyManager/nginx-proxy-manager/releases/tag/v2.16.0).
- DNS credential normalization for Cloudflare; CI/deploy workflow updates.

### Fixed

- Admin UI on port 81 — `production.conf` baked at build (carried forward in 2.17.0).

## [2.15.1] - 2026-06-03

### Changed

- Bump bundled upstream Nginx Proxy Manager to [v2.15.1](https://github.com/NginxProxyManager/nginx-proxy-manager/releases/tag/v2.15.1) (includes upstream fixes for Lua v5.1.5 base and internal nginx config over-mounting).

### Fixed

- Certbot plugin install no longer uses `acme==undefined` when `CERTBOT_VERSION` is unset.
- Boot loop from `/bin/sh: deactivate: not found` during Certbot plugin installation.
- Cloudflare DNS certificate renewals: normalized credential files from the database instead of brittle shell `echo`, with refresh on DNS renew.

## [2.15.0] - 2026-06-01

### Changed

- Bump bundled upstream Nginx Proxy Manager to [v2.15.0](https://github.com/NginxProxyManager/nginx-proxy-manager/releases/tag/v2.15.0).

### Fixed

- Same Certbot / Cloudflare DNS fixes as documented in 2.15.1 (first release on this fork line).

[2.17.1]: https://github.com/benperove/addon-nginx-proxy-manager/releases/tag/v2.17.1
[2.17.0]: https://github.com/benperove/addon-nginx-proxy-manager/releases/tag/v2.17.0
[2.16.0]: https://github.com/benperove/addon-nginx-proxy-manager/releases/tag/v2.16.0
[2.15.1]: https://github.com/benperove/addon-nginx-proxy-manager/releases/tag/v2.15.1
[2.15.0]: https://github.com/benperove/addon-nginx-proxy-manager/releases/tag/v2.15.0