# Theming

Modes `light · dark · system · hc`, applied as `[data-theme]` on `<html>` by `core/theme-manager.js`,
persisted to `shared.theme.mode`, synced cross-tab. `system` resolves live via `prefers-color-scheme`.
Density `compact` (default) / `comfortable` as `[data-density]`. High-contrast targets WCAG-AAA and
honours `forced-colors`. Token files: `themes/tokens.css` (parent foundation + `@font-face` + DGO
component aliases), `theme.{light,dark,high-contrast}.css`, `subbrand.dgo.css`. Reduced-motion zeroes
durations. Cycle order: system → light → dark → hc (`platform:theme:cycle`).
