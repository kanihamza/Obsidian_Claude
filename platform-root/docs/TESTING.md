# OBSIDIAN v4.0 — Testing & Verification Guide

OBSIDIAN has no build step, so verification is done directly against the source with three layers:

1. **Static gate** — `tools/verify.sh` (12 checks + an optional browser smoke).
2. **Boot smoke** — `tools/boot-smoke.mjs` (every module registers cleanly in Node).
3. **Browser smoke** — `tools/ui-smoke.mjs` (real-browser, Playwright; mocks the PA flows).

> **Static green ≠ delivered.** A green gate plus `ui-smoke` is the shipping bar; a user browser
> walkthrough is the final proof of "delivered" (CLAUDE.md §11.8).

---

## 1. Static gate — `tools/verify.sh`

```bash
cd platform-root
bash tools/verify.sh            # must end with: STATIC VERIFICATION: PASS
```

The 12 checks:

| # | Check | What it enforces |
|---|---|---|
| 1 | `imports` | No unresolved imports in the ESM graph (no broken/circular imports). |
| 2 | `named-exports` | Every imported name is actually exported by its module. |
| 3 | `no-CDN` | No external `https://` script / font / style references anywhere. |
| 4 | `console-purity` | Only `core/log.js` calls `console.*`; everything else uses `Log.*`. |
| 5 | `hex-lock` | Literal hex colours only in `themes/` (and brand assets); everywhere else uses `var(--token)`. |
| 6 | `json-valid` | Every JSON config parses. |
| 7 | `js-syntax` | Every `.js` passes `node --check`. |
| 8 | `i18n-static-keys` | Static `data-i18n` attributes resolve in `en.json`. |
| 9 | `placeholder-scan` | No `lorem / sample / seed / demo / placeholder` strings (advisory). |
| 10 | `embedded-url-scan` | No embedded URLs outside `config/endpoints.config.js`. |
| 11 | `i18n-runtime-keys` | Every literal `t('...')` key in JS resolves in `en.json`. |
| 12 | `boot-smoke` | Every module registers cleanly (runs `tools/boot-smoke.mjs`). |

`ui-smoke` is listed too but **SKIPPED** unless `RUN_UI_SMOKE=1` is set (it needs a browser).

### Reading failures
Each check prints the offending files/keys. Common cases:
- **`i18n-runtime-keys` FAIL** → a `t('x.y')` key is missing from `config/i18n/en.json`. Add it.
- **`hex-lock` FAIL** → a literal hex colour leaked into a component/style; replace with a token.
- **`named-exports` / `imports` FAIL** → an import name/path is wrong (e.g. importing `EventBus` when the
  module exports `Bus`, or `i18n` when it exports `I18n`).

---

## 2. Boot smoke — `tools/boot-smoke.mjs`

```bash
node tools/boot-smoke.mjs       # BOOT SMOKE: PASS — 19 modules registered
```

Loads every module in a minimal Node DOM shim and asserts:
- all 19 modules import and register without error,
- the expected module count (19),
- the 6-phase nav groups are populated for the admin persona,
- hidden-but-routable modules (e.g. `comments`) remain registered.

Update the hardcoded id list in this file when adding/removing a module.

---

## 3. Browser smoke — `tools/ui-smoke.mjs`

A real-browser harness (Playwright/Chromium) that boots the app against a local static server, switches to
the admin persona, and runs **assertions across every surface**. PA flows are mocked by intercepting requests
to `powerplatform.com` and returning canned envelopes, so no live endpoints are touched.

```bash
RUN_UI_SMOKE=1 node tools/ui-smoke.mjs     # ends with: --- RESULT ---  N passed, 0 failed
# or via the gate:
RUN_UI_SMOKE=1 bash tools/verify.sh
```

What it covers (current suite: **170 assertions**):
- **Per-surface render** of all 19 surfaces with **zero console errors**.
- **Theme matrix** (light / dark / high-contrast) + **dark-contrast scan** (no near-invisible text).
- **Responsive sweeps** — tablet + phone (390px) — assert no horizontal overflow on data-heavy surfaces.
- **Reduced-motion** render pass.
- **Deep interaction checks** per surface, e.g.:
  - ops-hub: routing scope toggle, bulk select → bulk-assignment handoff, **Prepare Meeting Pack** and
    **Set reminder** dynamic-action contracts (preview → confirm → flow fires).
  - reports: Management Report + **Send Report Email** (`dispatchEmail` contract).
  - correspondence/registry triage: acknowledge → preview → confirmed flow via Dynamic Global Actions.
  - **dispatch + D-5 redirect:** `#/assignment/*` redirects to `#/executive`; the dispatch queue lists an
    approved reference; recipient resolves from the live directory; preview + confirm; the `dispatch`
    contract fires; the state machine advances `dispatch-pending → in-flight → dispatched`.

### Mocking model
`mockBody(action)` returns the canned envelope per `action`; `paCalls[]` captures every intercepted request
body so assertions can verify the exact contract envelope a UI action dispatched.

---

## 4. Engine unit checks (Node, no browser)

The pure engines are directly testable with `node --input-type=module`. Examples used during development:

```bash
# SLA working-time (WAT Mon–Fri 08:00–16:00, holidays excluded)
node --input-type=module -e '
  import { workingMinutesBetween, SLA } from "./core/sla.js";
  console.log(workingMinutesBetween(Date.parse("2026-06-19T14:00:00Z"), Date.parse("2026-06-22T08:00:00Z"))); // 120
  console.log(SLA.evaluate("2026-06-22T07:00:00Z","P1", Date.parse("2026-06-22T13:00:00Z")).breached);        // true
'

# Sequential reviewer engine (token advances only on verified approval at N)
node --input-type=module -e '
  import { Reviewers } from "./shared/utils/reviewers.js";
  const c=[{sequence:1,userId:"A",targetEmail:"x"},{sequence:2,userId:"B",targetEmail:"y"}];
  console.log(Reviewers.advance(c,2,"approve").ok);            // false (not active position)
  console.log(Reviewers.advance(c,1,"approve").active.sequence); // 2
'
```

The fabric's directorate isolation can be checked end-to-end by ingesting records with a stub
`globalThis.Platform = { Persona, Context:{ directorate:()=>"all" } }` and asserting `Entities.all('document')`
hides isolated-directorate records for a non-elevated persona and reveals them for `executive`.

---

## 5. Fabric ingest smoke (manual)

After any change to `core/entity-store.js`, verify ingest against a real `FETCH_ALL` response (if available
at `/tmp/real-response.json`):

```bash
echo '{"type":"module"}' > package.json
node --input-type=module -e '
  import { Entities } from "./core/entity-store.js";
  import { readFileSync } from "node:fs";
  globalThis.fetch = async () => ({ ok:true, status:200,
    headers:{ forEach:(cb)=>cb("application/json","content-type") },
    text: async () => readFileSync("/tmp/real-response.json","utf8") });
  await Entities.bootstrap(true);
  console.log("counts:", Entities.counts());
'
rm -f package.json
```

---

## 6. Pre-ship checklist

1. `bash tools/verify.sh` → `STATIC VERIFICATION: PASS`.
2. `RUN_UI_SMOKE=1 node tools/ui-smoke.mjs` → `N passed, 0 failed`.
3. New i18n keys added to `en.json`; new modules added to `modules/index.js` + `tools/boot-smoke.mjs`.
4. New components registered in `shared/components/index.js`.
5. User browser walkthrough of any new/changed surface (the only proof of "delivered").
