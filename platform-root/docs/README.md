# DGO Digital Ops — Platform

Production multi-module web platform synthesised under MASTER DIRECTIVE OBSIDIAN v4.0 from
23 source SPAs, 16 Power Automate HTTP flows, and the NITDA + DGO design systems.

**Stack:** plain `.html`/`.css`/`.js`/`.json` — zero build, zero bundler, zero framework, zero CDN.
ES Modules + Custom Elements + CSS Cascade Layers. Self-hosted fonts. Local persona model (no auth).

## Run
Serve the platform root from any same-origin static host and open `/`. No build step:
```
python3 -m http.server 8080      # then visit http://localhost:8080
```
Copy the binary assets named in `FILE_MANIFEST_BINARY` (fonts, logos, icon sprite, favicons)
into `/assets/` before serving for full fidelity; the platform renders on fallbacks without them.

## Layout
`config/` runtime configuration · `core/` the `window.Platform` runtime · `themes/` tokens + modes +
DGO sub-brand · `styles/` cascade layers · `shared/` `PfBaseElement` + components + utils ·
`modules/` the 16 feature modules · `docs/` this documentation + Wire Tickets · `tests/` in-browser suite.

## Brand
NITDA is the institutional parent foundation; **DGO Digital Ops is the prominent default identity**,
activated at boot via `<html class="subbrand-dgo">`. The "An initiative of NITDA" endorsement is
mandatory in header and footer. See `BRAND.md`.

## Verify
Open `/tests/tests.html` (all green). Run `sha256sum -c BUILD_INTEGRITY.txt` from the root.
