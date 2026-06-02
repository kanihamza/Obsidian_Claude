# Deployment

1. Serve the platform root from any same-origin static host (CORS is configured flow-side).
2. Copy binaries named in `FILE_MANIFEST_BINARY` into `/assets/`: Outfit woff2 (400/600/700/800),
   NITDA logos, DGO logo SVGs + `icons/sprite.svg`, DGO favicon + PWA icons (192/512).
3. Run `sha256sum -c BUILD_INTEGRITY.txt` from the root — all OK.
4. Open `/` (DGO shell renders, persona switcher functional, theme/brand persist) and `/tests/tests.html`
   (all green). The diagnostics module pings every active endpoint.
5. Service worker registers automatically (Advanced tier); PWA installable via `manifest.webmanifest`.

No build, environment variables, or edits are required — the project runs the moment its root is served.
