# OBSIDIAN v4 — Platform Testing Guide

How to fully test the platform as it stands before moving to the closeout steps
(secret remediation, live verification). Testing is layered: **Layers 0–3 need no
credentials** and validate everything structurally and functionally on the seed
fabric; **Layer 4 needs the live SAS-signed flows** (the §0 secrets) and validates
the real backend. Run the layers in order; stop at the first failing layer.

```
L0 Static gate ──► L1 Unit suite ──► L2 Serve & boot ──► L3 Functional E2E ──► L4 Live integration
   (no creds)        (no creds)        (no creds)          (no creds, seed)       (needs §0 secrets)
```

---

## Prerequisites
- **Python 3** and **Node** (for the static gate) — `python3 --version`, `node --version`.
- A modern **browser** (Chromium/Firefox/Safari) with DevTools.
- Optional: the binary assets in `FILE_MANIFEST_BINARY` (fonts, logos, icon sprite,
  favicons) copied into `/assets/` for full visual fidelity. The platform renders on
  fallbacks without them, so they are not required to test behaviour.
- No build, no env vars, no package install. The platform runs the moment its root is served.

---

## Layer 0 — Static verification (one command)
Validates the engineering locks: ESM imports resolve, no CDN/framework, console purity,
hex lock, JSON validity, JS syntax, and static i18n keys.

```bash
cd platform-root
bash tools/verify.sh
```
Expected: every line `PASS` and final `STATIC VERIFICATION: PASS` (exit 0). Any `FAIL`
prints the offending files — fix before continuing.

Also confirm file integrity against the manifest:
```bash
sha256sum -c BUILD_INTEGRITY.txt        # expect: all OK
```
(Regenerate the manifest after any code change; a mismatch here just means the build moved on.)

---

## Layer 1 — Unit suite (in-browser, zero-dependency)
The suite covers the registry, i18n, and format core. It must be served (ESM), not opened
from `file://`.

1. Serve the root (see Layer 2 for the command).
2. Open `http://localhost:8080/tests/tests.html`.
3. Expected: a green `N/N passing` header with every line `PASS`. Any red `FAIL` line
   names the suite and assertion.

---

## Layer 2 — Serve & boot smoke test
```bash
cd platform-root
python3 -m http.server 8080
# visit http://localhost:8080
```
Pass criteria on first load:
- The DGO shell renders (header with the "An initiative of NITDA" endorsement, left nav,
  footer); no blank screen.
- DevTools **Console is clean** — no uncaught errors (only `core/log.js` output, if any).
- DevTools **Network** shows `view.html`/`styles.css` per module and a `FETCH_ALL` attempt.
  Because there are no live creds yet, that call fails and the platform **falls back to
  the live flows directly (URLs are embedded in `config/endpoints.config.js`). Confirm the fabric
  populates from `FETCH_ALL`; if a flow is unreachable, the lens shows its real empty/error state
  (there is no sample/seed data — this is a live platform).
- Layers 0–1 (static + unit) need no network; Layers 2–4 exercise the live flows directly.

> Must be served over **HTTP**, never `file://` — ES modules, `fetch` of views/seed, and the
> service worker all require an origin.

---

## Layer 3 — Functional end-to-end (manual, on seed data)
No credentials needed; everything below runs on the seed fabric. Walk each module via the nav.

### 3.1 Shell, navigation, deep-linking
- [ ] Every nav entry routes; the URL hash becomes `#/<module>`; the outlet swaps without reload.
- [ ] Refreshing on a deep route (e.g. `#/orchestrator`) restores that view.
- [ ] Deep-link focus: open `#/orchestrator/<referenceId>` (copy a Reference from any table) —
      the task list auto-selects and scrolls to that Reference.
- [ ] Skip-link (Tab on load) and keyboard nav work; `aria-live` outlet announces changes.

### 3.2 Lenses (read views over the fabric)
For `ops-hub`, `correspondence`, `approvals`, `comments`, `response-tracking`, `registry`,
`fasttrack`, `orchestrator`:
- [ ] Table populates from seed; filter bar narrows by query and status; the count updates.
- [ ] Selecting a row sets the active Reference and reveals **cross-links** ("Tasks (n)",
      "Emails (n)"…) that deep-link into the partner lens on the same Reference.
- [ ] CSV export downloads a file with the visible columns.
- [ ] `response-tracking` shows its 5 sub-views (All · Docs · Emails · Tasks · Pairs) and the
      doc↔email Pairs tab correlates by Reference.

### 3.3 Aggregators (rollups over the whole fabric)
For `home`, `executive`, `stats`, `assignment`, `reports`:
- [ ] KPI tiles show non-zero counts matching the seed; clicking a tile navigates to its lens.
- [ ] By-status breakdown renders.
- [ ] `assignment` shows workload-by-assignee bars, priority mix, and an overdue list;
      `executive` shows KPIs + priority mix + overdue + recent references.
- [ ] `reports`/`assignment` CSV export works.

### 3.4 Write paths (the two action lenses) — execution-safety
**`single-item-ops`:**
- [ ] Pick a document (or type a Reference) + choose an assignee/category/priority.
- [ ] Submitting opens a **mandatory confirm modal** summarising the action; cancelling writes nothing.
- [ ] Confirming calls `SINGLE_ASSIGNMENT`; on the seeded/offline path it resolves gracefully and
      **upserts a task** — verify it now appears in `orchestrator` and the `assignment` workload.

**`bulk-assignment`:**
- [ ] Multi-select documents (filter + select-all); the selected count updates and the submit
      button enables only with ≥1 selected.
- [ ] Submit → **danger confirm modal** with the count + parameters; cancelling writes nothing.
- [ ] Confirming calls `BULK_ASSIGNMENT`; the result panel shows created/notified/failed and the
      selected items become Assigned tasks visible across lenses.

### 3.5 Cross-cutting
- [ ] **Theme**: switch light / dark / high-contrast — persists across reload.
- [ ] **Brand**: DGO sub-brand is the default; the NITDA endorsement is always present.
- [ ] **Persona switcher**: changing persona gates module visibility by `audience`.
- [ ] **i18n**: no raw keys (e.g. `module.x.title`) appear in the UI — all render as text.
- [ ] **Offline/PWA**: with the tab open, stop the server and navigate — the service worker
      serves the shell; the app stays usable on cached seed data. Confirm it is installable
      via `manifest.webmanifest` (Advanced tier).

---

## Layer 4 — Live integration (requires the §0 SAS secrets)
Only after secret remediation (signatures injected at runtime, keys rotated). This validates
the real Power Automate backend.

### 4.1 Endpoint health via the Diagnostics module
- Open `#/diagnostics` (admin persona). It pings **all 14 active endpoints** and reports
  endpoint · method · status · latency · timestamp · data-presence · error per row.
- Pass: active flows return `ok` with sane latency; the **3 reserved** endpoints correctly
  return `notImplemented` (501); no `parse`/`network` kinds on active flows.

### 4.2 Envelope + contract conformance
- Confirm `core/api.js` normalises both envelopes: v1 (`ok`/`status.http`) and v4 (`success`/
  `statusCode`). A live `ok:true` with a warning in `errors[]` must still resolve `ok`.
- For each family: `FETCH_ALL` (F1), collection GETs, `BULK_ASSIGNMENT` (F3), `SINGLE_ASSIGNMENT`
  (F2), `REFERENCE_DATA` lookups — verify the response `data` matches the contract docs.

### 4.3 Close the §3 residual — capture a live FETCH_ALL
- Trigger a real `FETCH_ALL`; capture the response `data`.
- Confirm its collection keys are exactly `{references, documents, tasks, emails, approvals,
  comments, activities}` — i.e. they match `entity-store.ingest()`. If a key differs, add a
  mapping in `ingest()`'s `NAME` table and record it in `CONTRACT-CONFORMANCE.md`.
- Re-run Layer 3 with `seeded === false` to confirm every lens/aggregator works on **live** data.

### 4.4 Live write verification
- Run one real `single-item-ops` and one `bulk-assignment` against a test Reference; confirm the
  task is created server-side, notifications fire, and `data.failed` is empty.

---

## Acceptance gate (before moving on)
| Gate | Layer | Blocking for |
|------|-------|--------------|
| Static `verify.sh` PASS + `sha256sum -c` OK | L0 | any commit |
| Unit suite all green | L1 | any commit |
| Boots + seeds offline, clean console | L2 | demo / review |
| All 17 modules pass the L3 checklist on seed | L3 | sign-off as feature-complete |
| Secrets remediated, then L4 all green incl. FETCH_ALL capture | L4 | production / external sharing |

Recommended order forward: complete **L0–L3 now** (no secrets needed) to certify the build
functionally; then do the **§0 secret remediation**; then **L4** to certify against the live
backend. L0–L3 failing anywhere is a build bug; L4 failing is an integration/credential issue.

---

## Troubleshooting
- **Blank page / module import errors** → you opened `file://`; serve over HTTP instead.
- **Stale UI after edits** → the service worker cached assets; hard-reload or unregister the SW
  in DevTools → Application.
- **Raw i18n keys in UI** → a missing key; `tools/verify.sh` flags static ones, dynamic ones show
  at runtime — add to `config/i18n/en.json`.
- **Everything empty** → `FETCH_ALL` failed *and* `seed.json` failed to load; check the Network tab.
- **Missing fonts/logos** → binary assets not copied into `/assets/`; cosmetic only, fallbacks apply.
