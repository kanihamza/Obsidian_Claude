# Brand

## Architecture — NITDA parent, DGO-forward
NITDA is the institutional **parent foundation**: its tokens populate `:root` under `@layer tokens`,
founded on the shared green identity (Deep Green `#05583B`, Smart Green `#17B255`). **DGO Digital Ops
is the prominent default identity**, activated at boot via `<html class="subbrand-dgo">`
(`Platform.Brand.activate('dgo')`, persisted to `localStorage[obsidian.brand]`). `subbrand.dgo.css`
(`@layer subbrand`) overrides only the tokens that differ — accent-forward Smart Green, Outfit-Black
display, intensified focus/orbit — never the full set.

## Endorsement (non-negotiable)
"An initiative of NITDA" appears in the header (top-right small-caps) and footer via
`brand.endorsement.nitda`. NITDA marks are never overridden by DGO.

## Signature motif
The infoweb / atomic-O orbit (Smart-Green ring + Deep-Green core) is the platform's recurring gesture:
the boot/route loader in `pf-app-shell`, fading on `platform:ready`.

## Fidelity locks
No colour literal resolves outside `themes/`. Fonts via `@font-face` from `/assets/fonts/` (self-hosted
Outfit; Verdana system fallback). Logos resolve through `Platform.Brand.currentLogo()` (theme-aware).
