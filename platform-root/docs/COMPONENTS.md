# Components

Base: `PfBaseElement` (`shared/components/_base.js`). Shell-required (12) all emitted:
`pf-app-shell, pf-app-header, pf-app-nav, pf-app-footer, pf-breadcrumb, pf-side-panel, pf-skip-link,
pf-toast, pf-modal, pf-icon, pf-persona-switcher, pf-deprecation-banner`. Generic widgets (table,
stat cards, forms, diagnostics, badges) live in `styles/components.css` (`@layer components`) and are
produced by `shared/utils/render.js` so modules never re-implement them (§1.10). Icons are sprite-driven
(`pf-icon` → `/assets/icons/sprite.svg`); no icon-font CDN.
