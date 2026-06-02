# Personas

Local persona model (no authentication; UX + audit tagging only). Personas: `admin`, `executive`,
`general` (default). `core/persona-controller.js` reads/writes `shared.session.persona`
(persisted `localStorage[obsidian.persona]`), emits `platform:persona:changed` + `audit:persona-switch`,
exposes `current()/switch(id)/canSee(audience)`. `<pf-persona-switcher>` mounts in the header
(right-aligned). Switching is overt and re-filters nav and route access immediately.
