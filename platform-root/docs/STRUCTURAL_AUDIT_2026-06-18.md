# ARCHITECTURE & STRUCTURAL AUDIT REPORT

**Subject:** OBSIDIAN v4.0 platform (`platform-root/`) — the unified SPA hub
**Repository:** `kanihamza/Obsidian_Claude` · branch `claude/determined-carson-kzjb0u`
**HEAD at audit:** `f0d89ea` ("Rewrite ARCHITECTURE/COMPONENTS/TESTING docs to match the real platform")
**Audit date:** 2026-06-18
**Auditor role:** Principal Software Architect / Systems Auditor
**Method:** Evidence-based static audit of the implemented code, configuration, and tooling. Every finding is traceable to a file/line. Certainty markers: [Confirmed Fact] / [Probable Inference] / [Observed Risk] / [Unresolved Ambiguity].

---

## 1. Executive Summary

### High-Level Architectural Assessment

OBSIDIAN v4.0 is a **dependency-free, zero-build, modular-monolith single-page application** (native ES modules, Web Components, CSS cascade layers) that integrates with **15 Power Automate HTTP-trigger flows** as its sole backend. It consolidates ~20 legacy single-file HTML SPAs into one platform organized around a 6-phase correspondence lifecycle.

The **engineering quality of the core runtime is genuinely high** and materially ahead of what the project's own handoff brief (`CLAUDE.md`) claims. The mandated security/data corrections from the Phase-2 defect register are, in fact, implemented:

- `core/entity-store.js` is a properly **sealed lexical-closure data fabric** with frozen defensive-copy readers, a phase-gated canonical state machine (`transitionStatus`), and the Closure-Gate / Atomic-Archive / No-Orphan / dedup contracts. [Confirmed Fact]
- `core/api.js` is a single, robust `fetch()` chokepoint: a normalized, never-rejecting result object, v1/v4 envelope handling, tolerance for the real Power Automate artefacts (double-stringified / concatenated JSON), a machine-readable error taxonomy, per-call timeouts, in-flight de-duplication, and idempotency. [Confirmed Fact]
- Endpoint configuration is **fully centralized** by key; **no module hardcodes a URL**, **no inter-module imports** exist, and **no module reaches the sealed fabric directly**. [Confirmed Fact]
- Build hygiene holds: **zero external dependencies**, console access confined to `core/log.js`, token-only styling. [Confirmed Fact]

The risk concentration is therefore **not** in the core engine. It is in three places: (1) **security posture** — live SAS-signed flow credentials are committed to source control and the platform has no authentication and no transport/security headers; (2) **operational readiness** — no CI, console-only observability, near-zero automated unit coverage; and (3) **governance/change-resilience** — the self-declared "authoritative" documentation is pervasively out of sync with the code, and the controls meant to catch drift (integrity manifest, routes validator, placeholder scan) are stale, deleted, or advisory-only.

### Overall Architectural Risk Posture

**MODERATE-to-HIGH, with one CRITICAL exposure.** As a piece of software architecture the platform is coherent, internally consistent, and maintainable. As a *production-deployed system handling government correspondence* it is **not yet operationally safe**: a single committed file exposes live credentials to all corporate data and write paths, and there is no automated gate, telemetry, or test safety net to detect regressions or abuse. Several of the most severe items are *explicitly accepted design decisions* (embedded flow URLs per BRD FR-015; OTP disabled per FR-036) — this audit records them as risks regardless of intent, per the no-soft-pedaling mandate, and notes their governance status.

### Key Quantitative Summary of Findings

| Severity | Count | Primary Impact Area(s) |
| :--- | :--- | :--- |
| Critical | 1 | Security (secret exposure → data + write-path compromise) |
| High | 5 | Security (authN, transport hardening), Reliability/Observability, CI/CD, Governance |
| Moderate | 14 | Integration resilience, Data/state, Deployability, Maintainability, Security hardening |
| Low | 10 | Documentation, Structure, Tooling, Dead code |

---

## 2. Audit Scope & Evaluation Basis

### Evidence Base
- **Platform runtime:** `platform-root/index.html`, `core/*` (30 files), `shared/components/*` (22 web components), `shared/utils/*` (9 utils), `modules/*` (19 modules), `config/*` (incl. `endpoints.config.js`, `personas.config.js`, `routes.config.js`, `nav.config.js`, `dynamic-actions.config.js`), `styles/*`, `themes/*`.
- **Service workers:** `sw.js`, `service-worker.js`.
- **Tooling & tests:** `tools/verify.sh`, `tools/boot-smoke.mjs`, `tools/ui-smoke.mjs`, `tools/deploy-s0-s1-a11.sh`, `tests/runner.js`, `tests/suites/*`.
- **Consolidation tooling (repo root):** `spa-extract.mjs`, `spa-actions.mjs`, `spa-reconcile.mjs`, `spa-verdict.mjs`, `dynamic_global_actions_schema.json`, `spa-manifests/*`.
- **Governance docs:** `CLAUDE.md`, `BUILD_INTEGRITY.txt`, `docs/*` (ARCHITECTURE, PROJECT_STATUS, PHASE4_PROGRESS, MASTER_PLAN, SECRETS, SPA_PARITY_*, contracts/*).
- **Repository metadata:** git history of `config/endpoints.config.js`, branch/HEAD state, absence of `.github/`, `.gitignore`, `package.json`.
- **Method:** direct reads of all critical-path files plus targeted ripgrep sweeps (fetch/console/external-URL/secret/innerHTML), cross-checked by four parallel evidence-gathering passes.

### Inherent Constraints & Exclusions
- **Runtime behavior was not executed.** This is a static audit; findings about UI/flow behavior are [Probable Inference] unless the code is unambiguous.
- **The Power Automate flows themselves are out of scope** (server-side logic, their auth model, their data stores). The platform delegates *all* real authorization to these flows; their adequacy cannot be assessed from this repo. This is a material exclusion given Finding SEC-02.
- **Repository visibility (public vs private) could not be definitively determined** from inside the execution environment (`origin` is a local proxy). Finding SEC-01's severity is justified independently of visibility (secrets in history, no `.gitignore`, clone/deploy proliferation).
- **Live data shape** is inferred from normalization code and smoke-test fixtures, not observed.

---

## 3. Implemented Architecture & Structural Blueprint

### Core Design Pattern Analysis
A **client-side modular monolith** with a **mediator/registry** core and **direct-to-backend (no tier) integration**:

- **Composition root:** `index.html:43-49` imports `core/platform.js` (establishes the `window.Platform` namespace), then `shared/components/index.js`, then `modules/index.js`, then calls `boot()`. There is no bundler or transpiler. [Confirmed Fact]
- **Mediator:** all cross-module collaboration is indirect, via the `globalThis.Platform.*` namespace, a publish/subscribe `Bus`, and shared `Context`/`State`. **No module imports another module** (verified: zero `from '../<module>/...'` matches). [Confirmed Fact]
- **Data fabric:** a single in-memory, Reference-keyed store hydrated once from `FETCH_ALL`, sealed in an IIFE (`core/entity-store.js:25` `sealFabric()`); every lens reads the same frozen objects through a gated facade. [Confirmed Fact]
- **Integration:** the frontend calls Power Automate flows **directly** (`core/api.js:287`), no proxy/intermediary — matching the stated "live-direct" directive and BRD FR-011/FR-014.

### Application Layers & Logical Boundaries
| Layer | Implementation | Boundary integrity |
| :--- | :--- | :--- |
| Presentation | `shared/components/*` (Web Components, `pf-*`), module `view.html` + `styles.css` | Strong — components extend `PfBaseElement` |
| Application/modules | `modules/*` extend `BaseModule` (`Modules.register`) | Strong — uniform; zero inter-module coupling |
| Domain/engine | `core/entity-store.js` (fabric + state machine), `core/sla.js`, `core/reviewers` | Strong — sealed; sole status mutator |
| Service/integration | `core/base-service.js` (endpoint factory), `core/api.js` (sole `fetch`) | Mostly strong — three benign `fetch` leaks (see ARCH-03); dispatch bypasses BaseService (INT-05) |
| Config | `config/*` (endpoints, personas, routes, nav, dynamic-actions, i18n) | Strong centralization |

### Inferred Component Interaction Model (text)
```
index.html
  └─ core/platform.js  ──establishes──>  window.Platform { API, Entities, Bus, State,
       Context, Persona, Router, Nav, UI, Log, SLA, Actions, Lookups, I18n, Theme, ... }
  └─ boot.js
       ├─ I18n.load → Theme/Brand/Persona.init → Nav.init → Router.init   (shell renders, non-blocking)
       ├─ Entities.bootstrap()  ──BaseService('FETCH_ALL')──> API.callAPI ──fetch()──> PA flow
       │        └─ ingest → admit (normalize, derive directorate, dedup, quarantine) → sealed _store/_byRef
       └─ navigator.serviceWorker.register('../service-worker.js')

Module (e.g. bulk-assignment)
   extends BaseModule → onVisible → reads Platform.Entities.* (scoped, frozen)
        → writes via module service = BaseService.endpoint('BULK_ASSIGNMENT') → API.callAPI → PA flow
        → status changes via Platform.Entities.transitionStatus()  (phase gate + authority + audit)
        → emits Bus 'entity:*'/'audit:*'  → other lenses + audit-log react

Endpoint-less actions (dispatch, reminders, meeting-pack …)
   → Platform.Actions.emit(...) → DYNAMIC_GLOBAL_ACTIONS flow  (central action registry)
```

---

## 4. Detailed Findings by Domain

> Full records are given for all Critical/High and key Moderate findings. Remaining Moderate and all Low findings are recorded compactly in §4.I.

### A. Security Architecture

#### SEC-01 — Live Power Automate SAS credentials committed to source control
- **Severity:** CRITICAL
- **Affected:** `config/endpoints.config.js` (all 15 endpoints); git history; absence of `.gitignore`.
- **Evidence:** `endpoints.config.js:19-22` builds every URL as `…/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=<SAS>`; 15 distinct 32-hex workflow IDs each with its own literal `sig=` token (e.g. `:33`, `:91` `FETCH_ALL`, `:72/:78` `OTP_GENERATE`/`OTP_VERIFY`, `:100` `BULK_ASSIGNMENT`) — tokens redacted in this report. The file is git-tracked with history across many commits (`1803180`, `2fa4bb3`, …). No `.gitignore` exists anywhere in the repo. [Confirmed Fact]
- **Description:** The SAS `sig` is the **only** credential protecting each flow. Possession of these URLs grants full, unauthenticated invocation rights. They are committed in the working tree *and in history*, so rotation of the working copy does not erase exposure. `docs/SECRETS.md:24-25` acknowledges the risk but prescribes only reactive, manual rotation "on any suspected exposure" — there is no scheduled rotation, no secret store, no scanning gate.
- **Architectural & Operational Impact:** Anyone who can read the repo (or any cloned/deployed copy, of which the static site ships these tokens to every browser regardless) can call `FETCH_ALL` to exfiltrate **all** correspondence across all directorates, call `BULK_ASSIGNMENT`/`SINGLE_ASSIGNMENT`/`EMAIL_RELATED_TASK` to forge/mutate workflow state, and call `OTP_GENERATE`/`OTP_VERIFY`. This **nullifies the entire client-side directorate-isolation model** (see SEC-02/SEC-03), which by the platform's own admission (`CLAUDE.md` §5.3) protects only the UI.
- **Risk of Inaction:** Bulk data breach of government correspondence and unauthorized workflow manipulation; non-repudiation loss; regulatory exposure.
- **Compounding Factors:** No `.gitignore` (SEC-01b); no secret-scanning CI (INFRA-01); no CSP so any XSS leaks the tokens client-side (SEC-04/SEC-05); secrets also shipped to every client by design (the static bundle contains them). NB: embedding URLs in the frontend is **mandated by BRD FR-015 / BRULE-005** and is an accepted current-phase decision — but committing live signatures to VCS with no `.gitignore` and no rotation discipline is the avoidable amplifier.

#### SEC-02 — No authentication; persona/identity is free, unverified client-side selection
- **Severity:** HIGH
- **Affected:** `core/persona-controller.js`, `config/personas.config.js`, `core/context.js`, `core/api.js`, `modules/settings/*`.
- **Evidence:** `persona-controller.js:1` "local persona (UX + audit only, no auth)"; `:17-23` `switch(id)` sets persona with **no credential check**; the user's own directorate derives from a self-set localStorage profile (`:60-65`). `api.js:217-218` states the admin endpoint-override gate "is **defence-in-depth, not a security boundary**". [Confirmed Fact]
- **Description:** Every persona-keyed control is selectable by the client at will. A user can self-elevate to `admin`/`executive` and to any directorate. This makes the admin-only endpoint **override** (`api.js:214-226`) reachable by anyone — they can redirect any of the 15 SAS endpoints to an attacker-controlled URL (data interception) — and makes the directorate read-filter advisory.
- **Architectural & Operational Impact:** The platform has **no access control of its own**; it delegates 100% of authorization to the PA flows. Given SEC-01, those flows are callable by anyone holding the leaked SAS. The net effective access control over corporate data is therefore approximately *none*.
- **Risk of Inaction:** Privilege escalation within the UI; endpoint redirection/interception; complete bypass of the documented "five defensive layers."
- **Compounding Factors:** SEC-01 (leaked SAS), SEC-03 (unsealed setter), SEC-04 (no CSP). The isolation engine is well-built but load-bearing on an authentication layer that does not exist in this repo.

#### SEC-04 — No Content-Security-Policy and no transport/security headers at any layer
- **Severity:** HIGH
- **Affected:** `index.html`, deployment (no header config files exist).
- **Evidence:** No `Content-Security-Policy` / `http-equiv` meta in `index.html` (the only `http-equiv` references are the email-HTML sanitizer stripping it from untrusted content, `pf-sandboxed-iframe.js:16-17`). No `_headers`, `web.config`, `.htaccess`, `netlify.toml`, `vercel.json`, nginx conf, or `Dockerfile` anywhere (find returned none). `docs/DEPLOYMENT.md` describes serving the static root from "any static host" with no header guidance. [Confirmed Fact]
- **Description:** The app embeds credentials in JS (SEC-01) and renders untrusted third-party email HTML, yet ships no CSP, `X-Frame-Options`, `Referrer-Policy`, or HSTS. There is no defense-in-depth against script injection or clickjacking.
- **Architectural & Operational Impact:** A single successful XSS (see SEC-05) escalates directly to theft of all SAS tokens and full flow abuse, with no CSP to constrain script origins or exfiltration. Absence of `X-Frame-Options`/`frame-ancestors` allows clickjacking of the assignment/dispatch actions.
- **Risk of Inaction:** XSS → credential theft → full backend compromise; UI-redress attacks on privileged actions.
- **Compounding Factors:** SEC-01, SEC-05, no CI to add header tests.

#### SEC-05 — Unescaped `innerHTML` sinks for record-derived content (stored-XSS vector)
- **Severity:** MODERATE
- **Affected:** `shared/components/pf-attachment.js`; `shared/utils/dom.js` (generic `html:` escape hatch); minor: `pf-comment-thread.js`, `pf-app-header.js`, `pf-app-nav.js`.
- **Evidence:** `pf-attachment.js:89` `const name = a.name || a.fileName || a.title || 'file';` then `:95` `chip.innerHTML = \`<span>${iconFor(kind)} ${name}</span>…\`` — the attachment **filename**, sourced from upstream email/flow data, is interpolated into HTML **unescaped**. `dom.js:6` `else if (k === 'html') node.innerHTML = v;` is a widely-used raw-HTML hatch. [Confirmed Fact / Observed Risk]
- **Description:** A crafted attachment filename containing markup executes when the attachment chip renders. Most user-text paths *are* escaped (`pf-comment-thread` uses `_escHtml` + `.textContent`), and the email **body** is safely handled (SEC-05 mitigant below), so the attachment-filename path is the sharpest concrete sink.
- **Architectural & Operational Impact:** Stored XSS reachable from inbound email content; combined with SEC-04 (no CSP) and SEC-01 (in-page tokens) it is a credential-theft chain.
- **Risk of Inaction:** Account/session-independent data theft; backend compromise via leaked tokens.
- **Compounding Factors:** SEC-01, SEC-04. **Mitigant:** `pf-sandboxed-iframe.js:97` renders email bodies in an iframe with `sandbox` set and **no `allow-scripts`/`allow-same-origin`**, plus a regex sanitizer (`:16-19`) — the body path is hardened (the regex sanitizer alone is weaker than a DOM-based purifier, but the script-less sandbox makes execution infeasible). [Probable Inference]

#### SEC-03 — "Sealed" directorate setter is convention-only; reviewer/closure authority evaluators absent
- **Severity:** MODERATE
- **Affected:** `core/context.js`, `core/persona-controller.js`, `core/entity-store.js`.
- **Evidence:** `context.js:15` `let _directorate='all'` (closure-private) + `:45` read-only getter — but `:49-57` `setDirectorate(id)` is a **public method**; the seal stops property assignment, not invocation; the safeguard is the comment "internal only … never from UI." `persona-controller.js` implements `canSeeRecord` (`:88-97`) but **does not implement `canReview`/`canClose`**; `entity-store.js:355-359` only invokes those "if they exist," so transition authority falls back to coarse tier checks (`REQUIRED_TIER`), leaving reviewer-designation (F-7) and closure-authority (G-7) unenforced. [Confirmed Fact]
- **Architectural & Operational Impact:** Any code path (or console user) can invoke `setDirectorate` to widen scope; fine-grained "only the designated reviewer/assigner may approve/close" rules are not enforced client-side (only persona *tier*).
- **Risk of Inaction:** Scope widening and unauthorized approve/close actions within the UI (and, via SEC-01/02, server-side too unless the flows enforce it).
- **Compounding Factors:** SEC-02 (no auth makes "internal only" meaningless).

#### SEC-06 — OTP second factor disabled for live write paths (compliant component is dead code)
- **Severity:** MODERATE
- **Affected:** `shared/components/pf-otp-modal.js`, `modules/bulk-assignment/*`, `modules/single-item-ops/*`, `config/endpoints.config.js` (`OTP_GENERATE`/`OTP_VERIFY`).
- **Evidence:** `pf-otp-modal.js` was correctly rebuilt as a stateless **server-side** PA-handshake (`:1`, `:13` "plaintext code is NEVER … compared client-side") and is registered (`shared/components/index.js:20`), but **no module calls `PfOtpModal.require()`** — it is dead code. `bulk-assignment/index.js:7` "No OTP (the SPA has none)"; no OTP token appears in `single-item-ops`. The disablement is **tracked** in `docs/PROJECT_STATUS.md` and `CLAUDE.md` §8-K. [Confirmed Fact]
- **Architectural & Operational Impact:** Bulk/single assignment writes have no second factor. The B-1 paradox is fixed at the component level but unused; meanwhile the live `OTP_GENERATE`/`OTP_VERIFY` SAS endpoints sit exposed (SEC-01) and unused.
- **Risk of Inaction:** No step-up authorization on high-impact bulk operations. **Conformance note:** this *matches* BRD FR-036 (OTP disabled as a tracked temporary exception); the audit records it because re-enablement is a stated closure criterion (FR-038) and the exposed-but-unused endpoints are an attack surface.
- **Compounding Factors:** SEC-01 (OTP endpoints leaked), GOV-01 (docs disagree on whether OTP is required).

### B. Reliability & Operational Readiness

#### REL-01 — Observability is console-only with no remote sink
- **Severity:** HIGH
- **Affected:** `core/log.js`, `core/audit-log.js`, `core/idempotency.js`, `modules/diagnostics/*`.
- **Evidence:** `log.js:14-17` writes solely to `console.*`; the only retention is an **in-memory** ring buffer (`:6` `RING_MAX 500`) that is **not persisted**. No `fetch`/`beacon`/remote endpoint for logs. Audit log (cap 1000) and request log (cap 500) persist only to `localStorage`. Diagnostics surfaces are **manual/in-browser only** (`modules/diagnostics/index.js`). [Confirmed Fact]
- **Architectural & Operational Impact:** A production failure on a user's tablet is invisible to operators unless that user opens Diagnostics and exports JSON. There is no central aggregation, alerting, or post-hoc forensics across users.
- **Risk of Inaction:** Outages and data issues go undetected and undiagnosable; MTTR is unbounded; no audit trail survives a cleared browser.
- **Compounding Factors:** INFRA-01 (no CI/monitoring), REL-04 (the "last raw response" incident surface is dead code).

#### REL-02 — No automatic retry, backoff, or circuit breaker
- **Severity:** MODERATE
- **Affected:** `core/api.js`, `core/error-router.js`, `core/entity-store.js`.
- **Evidence:** `api.js:286-330` performs a single `await fetch`; on failure returns a normalized error — no retry loop/backoff. `retry-after` is parsed (`:184`) but only feeds toast duration (`error-router.js:60-61`); `Bus.emit('rate:limited')` (`error-router.js:50`) has **no subscriber**; `retryable:true` flags (`:17-25`) are advisory metadata nothing reads. `entity-store.js` bootstrap does not retry a failed `FETCH_ALL` (`:428,449`). [Confirmed Fact]
- **Architectural & Operational Impact:** Transient network/PA throttling surfaces directly to the user; recovery is entirely manual (banner/header "retry" buttons). For a mobile-tablet target on variable connectivity this is fragile.
- **Risk of Inaction:** Avoidable user-visible failures and abandoned operations under transient faults.
- **Compounding Factors:** REL-05 (no health probe), INT-03 (in-flight de-dup can even block a manual retry while one call is outstanding).

#### REL-03 — Near-zero automated unit coverage; the existing suite is stale
- **Severity:** MODERATE
- **Affected:** `tests/suites/*`, `tools/ui-smoke.mjs`, CI (absent).
- **Evidence:** 3 browser suites (`format`, `i18n`, `registry`), ~12 assertions total, run only via `tests/tests.html`. `registry.test.js:24/31` asserts **17** modules; the platform has **19** (`boot-smoke.mjs` `expected = 19`) — the suite would fail. **Zero** unit tests cover `api.js`, `entity-store.js` transitions/scope filter, `sla.js`, `idempotency.js`, or security filters. The substantive suite is Playwright `ui-smoke.mjs` (~100+ checks) but it is **opt-in** (`verify.sh:157` off by default) and depends on Playwright via a hardcoded absolute path with no `package.json`. [Confirmed Fact]
- **Architectural & Operational Impact:** The highest-risk code (directorate isolation, idempotency, SLA math, API error handling) has no fast regression guard; the one runnable unit suite is already red.
- **Risk of Inaction:** Silent regressions in security/financial-equivalent logic; false confidence from a green-by-neglect suite.
- **Compounding Factors:** INFRA-01 (nothing runs tests automatically).

### C. Infrastructure & Deployment

#### INFRA-01 — No CI/CD; all gates are manual
- **Severity:** HIGH
- **Affected:** repository root (no `.github/`), `tools/verify.sh`, `tools/*-smoke`.
- **Evidence:** No `.github/`, `.gitlab-ci`, `.circleci`, `Jenkinsfile`, or `*.yml` pipeline anywhere. No `package.json`. `verify.sh` provides **11 hard-fail gates + 2 advisory + opt-in ui-smoke** but must be run by hand; nothing blocks a commit or merge. [Confirmed Fact]
- **Architectural & Operational Impact:** The carefully built static-analysis and smoke gates provide assurance **only if a human remembers to run them**. Drift (e.g., the stale test, the SAS commit, the deleted routes validator) ships unimpeded.
- **Risk of Inaction:** Regressions, secret commits, and broken builds reach the branch/deploy with no automated barrier.
- **Compounding Factors:** SEC-01 (no secret scanning), REL-03 (tests never run), INFRA-05/GOV-03 (other guards stale or deleted).

#### INFRA-02 — Two divergent service workers; an orphaned one carries a stale-cache bug
- **Severity:** MODERATE
- **Affected:** `sw.js`, `service-worker.js`, `core/boot.js`.
- **Evidence:** `boot.js:52` registers `../service-worker.js` (network-first, self-healing; `service-worker.js:30-39`). `sw.js` is the **orphan**: cache-first/stale-while-revalidate (`sw.js:55-63`), a different cache key (`:11`), and a precache list with a wrong path `'/boot.js'` (actual `/core/boot.js`) that 404s. Its own active sibling documents that this cache-first design "permanently served stale modules and prevented pushed fixes." [Confirmed Fact]
- **Architectural & Operational Impact:** Dead, misleading code; if a stale browser registration of `sw.js` persists from an earlier deploy, or a future change re-points to it, users would be frozen on stale modules.
- **Risk of Inaction:** Latent "users stuck on old version" incidents; maintainer confusion over which worker is authoritative.
- **Compounding Factors:** Manual (string-bump) cache versioning, no content hashing; no CI to catch the duplicate.

#### INFRA-03 — Hard root-path deployment assumption
- **Severity:** MODERATE
- **Affected:** `index.html`, `manifest.webmanifest`, both service workers.
- **Evidence:** `index.html:8-21` loads all CSS/manifest via absolute `/styles/…`, `/themes/…`; `manifest.webmanifest` `start_url`/`scope` = `/`; SWs precache absolute `/` paths. Only the SW *registration* URL was made prefix-relative (`boot.js:50-52`, register A-21); asset paths remain absolute. [Confirmed Fact]
- **Architectural & Operational Impact:** The app only works when served from a domain root; subdirectory/path-prefix hosting breaks asset loading. The A-21 fix is therefore incomplete.
- **Risk of Inaction:** Deployment rigidity; broken installs under common reverse-proxy/subpath topologies.
- **Compounding Factors:** No environment/config abstraction for base path.

### D. Data & State Architecture

#### DATA-01 — Sealed fabric & state machine (strength, with residual risks)
- **Severity:** LOW (recorded as a strength + caveats)
- **Evidence:** `entity-store.js:25-35` private maps inside `sealFabric()`; `:319-322` `Object.freeze(structuredClone(...))` readers; `:560` `transitionStatus` is the sole status mutator enforcing the canonical machine + authority + contracts; `:622` `canClose`; `:639` atomic `archive`. [Confirmed Fact]
- **Note:** This directly resolves register item A-1 and is materially better than `CLAUDE.md` (which still describes the pre-fix `let`-based store). The caveats are DATA-02/03/04 below.

#### DATA-02 — All-directorate data fetched to the client; in-memory only; mobile-memory pressure
- **Severity:** MODERATE
- **Affected:** `core/entity-store.js`, `core/api.js`, target runtime (mobile tablet).
- **Evidence:** `FETCH_ALL` returns the full cross-directorate payload (the platform's own §5.1 rationale for closure-based isolation); the raw envelope is retained in memory up to `~5MB` (`entity-store.js:434-436`). The fabric is never persisted; every reload re-fetches everything. [Confirmed Fact]
- **Architectural & Operational Impact:** Memory/latency pressure on the stated mobile-tablet target; all data crosses the trust boundary to every client (isolation is post-hoc filtering). No offline data continuity.
- **Risk of Inaction:** OOM/jank on large datasets; full-payload exposure to any client (compounds SEC-01/02).
- **Compounding Factors:** No pagination at the data layer; lookup results capped (register I-5).

#### DATA-03 — Optimistic local transitions are fire-and-forget to the server
- **Severity:** MODERATE
- **Affected:** `core/entity-store.js:608-617`.
- **Evidence:** `transitionStatus` mutates local state, then persists via `Platform.Actions.emit('transition', …)` "fire-and-forget … a server reject … without diverging local state" (`:608-611`). [Confirmed Fact]
- **Architectural & Operational Impact:** On server rejection the UI and backend diverge silently until the next `FETCH_ALL`; no reconciliation/rollback of the optimistic local change.
- **Risk of Inaction:** Operators act on stale/incorrect local status; integrity contracts hold locally but not necessarily end-to-end.
- **Compounding Factors:** REL-02 (no retry), REL-01 (divergence not centrally observable).

### E. Integration & Interface Soundness

#### INT-01 — API chokepoint quality (strength)
- **Severity:** LOW (strength). `api.js` never rejects, normalizes v1/v4 envelopes, tolerates double-stringified/concatenated PA JSON (`:81-115`), emits a machine-readable `errorKind` taxonomy (`:141-156`), and de-dupes in-flight calls. `base-service.js` adds caching, sort/paginate, and request-log recording. Centralization is exemplary. [Confirmed Fact]

#### INT-05 — Dispatch write path bypasses BaseService; canonical dispatch flow unprovisioned
- **Severity:** MODERATE
- **Affected:** `modules/dispatch/*`, `config/dynamic-actions.config.js`.
- **Evidence:** `dispatch/index.js:9-11` relays through `Platform.Actions` (`dispatch` contract on `DYNAMIC_GLOBAL_ACTIONS`) "until `DISPATCH_OUTBOUND` lands"; the module has **no `service.js`**, unlike its write-capable peers. `DISPATCH_OUTBOUND` does not exist in `endpoints.config.js`. [Confirmed Fact]
- **Architectural & Operational Impact:** A Phase-5 write-capable surface uses a different integration idiom than the rest of the platform, and the intended dedicated flow is not provisioned (register G-4 open). Acceptable as interim, but an inconsistency and an incomplete capability.
- **Risk of Inaction:** Divergent error/idempotency handling on the dispatch path; capability gap if the multiplexed action is retired.
- **Compounding Factors:** INT-04 below; GOV-01 (docs claim dispatch "does not exist" while it ships).

#### INT-03 / INT-04 (compact)
- **INT-03 [MODERATE]:** in-flight de-dup (`api.js:257-262`, `kind:'duplicate'`) can reject a legitimate user retry while a prior call is still outstanding. [Confirmed Fact]
- **INT-04 [LOW]:** `modules/diagnostics/index.js:52` passes `{ timeout: 8000 }` but `api.js` reads `opts.timeoutMs`; the diagnostics ping silently uses the 45s default. [Confirmed Fact]

### F. Architectural Integrity

#### ARCH-01 — Mediator-via-global-singleton coupling
- **Severity:** MODERATE
- **Affected:** `core/platform.js`, all modules/components.
- **Evidence:** all collaboration is via `globalThis.Platform.*` + `Bus`. Modules don't import each other (a strength), but they depend on a large, implicitly-shaped global object resolved at runtime (e.g. `entity-store.js` reaches `globalThis.Platform.Lookups/Persona/Context/Actions`). [Confirmed Fact / Observed Risk]
- **Impact:** Implicit, non-statically-checkable dependencies; hard to unit-test a unit in isolation (a major reason REL-03's unit coverage is thin); load-order sensitivity.
- **Risk of Inaction:** Refactors break consumers silently; testing stays integration-heavy and slow.

#### ARCH-02 — `core/ui.js` god-object
- **Severity:** MODERATE
- **Affected:** `core/ui.js` (722 lines).
- **Evidence:** one `UI` object bundles toasts, confirm, modal-stack, and seven heavyweight business-flow modal builders (`openTaskUpdate`, `openFlagDocument`, `openEmailToTask`, `previewNotification`, `openComments`, `openProfileSetup`, `openShortcuts`), performing ~17 per-click dynamic `import()`s (register A-18 latency). [Confirmed Fact]
- **Impact:** Mixed responsibilities + first-click latency (~200-400ms) on mobile; a change magnet.

#### ARCH-03 — `fetch()` boundary leaks (benign but real)
- **Severity:** LOW
- **Evidence:** despite "only `api.js` calls `fetch()`", `core/base-module.js:28` (view.html), `core/i18n.js:22` (i18n JSON), and `shared/components/pf-attachment.js:152` (attachment text) call `fetch` directly. The first two are same-origin static loads; the attachment one fetches a possibly-remote URL outside the normalized API path. [Confirmed Fact]

### G. Structural Quality

#### STRUCT-01 — `tools/deploy-s0-s1-a11.sh` embeds 15 source files inline (231 KB / 4,870 lines)
- **Severity:** MODERATE
- **Evidence:** a bash patcher that writes a fixed 15-file set via heredocs (`:5` "15 files"; includes `core/api.js`, `core/entity-store.js`, `core/ui.js`, `shared/utils/lens.js`, etc.). It does **not** duplicate the SAS secrets (embedded copies `import { Endpoints }`). [Confirmed Fact]
- **Impact:** A second, divergent source of truth for 15 critical files; edits to the tree do not propagate to the script and vice-versa. Maintenance/regression hazard.

#### STRUCT-02 — Duplicated assignment payload/cascade logic
- **Severity:** MODERATE
- **Evidence:** near-identical `NewActivityTask` payload builders and category-cascade logic in `single-item-ops/index.js` and `bulk-assignment/index.js` (deliberate byte-for-byte SPA ports, incl. shared misspelled keys). [Probable Inference]
- **Impact:** Two places to fix any assignment-contract change; drift risk between the two surfaces.

#### STRUCT-03 / STRUCT-04 (compact)
- **STRUCT-03 [LOW]:** `shared/utils/lens.js` (1,033 lines) is an oversized shared coupling hub; `fmt()` date helpers copy-pasted per module; `lookup/service.js` & `settings/service.js` are vestigial `export {}` stubs. [Confirmed Fact]
- **STRUCT-04 [LOW]:** `nav.group` casing inconsistent (`'ROUTING'`/`'System'` vs `'CrossPhase'`). [Observed Risk]

### H. Governance & Change Resilience

#### GOV-01 — The self-declared authoritative brief is pervasively out of sync with the code
- **Severity:** HIGH
- **Affected:** `CLAUDE.md`, `BUILD_INTEGRITY.txt`, multiple `docs/*`.
- **Evidence:** `CLAUDE.md:3-9` declares itself authoritative and "supersedes … inference from file contents," yet: file count "198" vs **232** tracked; "14 PA endpoints" vs **15**; `modules/assignment/` listed as existing (it is **deleted**) while `modules/dispatch/` listed as "Does not exist" (it **ships**, registered at `modules/index.js:16`) — an exact inversion; and `:6` forbids "platform execution code … until Phase 3/4 authorized" while git HEAD shows **Phase-5** shipped. Internal doc-vs-doc conflicts: OTP "required" (`CLAUDE.md` B-1) vs "removed" (`PROJECT_STATUS.md`, and code); defect total "81" vs "92"; endpoints "14" vs "15" (`MASTER_PLAN.md:41` is correct). [Confirmed Fact]
- **Architectural & Operational Impact:** A new contributor following the "authoritative" doc would mis-model the system, re-do completed work, or honor a defunct freeze. The drift also masks real status (e.g., several register items marked "Open" are actually fixed).
- **Risk of Inaction:** Wasted/incorrect work, mis-prioritization, erosion of trust in governance artifacts.
- **Compounding Factors:** GOV-02/03, INFRA-01.

#### GOV-02 — A governance conflict was resolved *in code* without the required sign-off
- **Severity:** MODERATE
- **Evidence:** `config/routes.config.js:12` redirects `assignment → executive`, contradicting `CLAUDE.md:645` (J-4: redirect to single-item-ops/bulk). `CLAUDE.md:689` explicitly flags this conflict as "pending an explicit user ruling," yet the code picked the *other* doc's side. [Confirmed Fact / Unresolved Ambiguity]
- **Impact:** A flagged decision was silently made; the routing of a deprecated surface may not match operator expectation.

#### GOV-03 — The anti-drift controls are themselves stale, deleted, or advisory
- **Severity:** MODERATE
- **Evidence:** `BUILD_INTEGRITY.txt:1-2` dated 2026-06-06 on a non-current branch/HEAD, still lists deleted `assignment/*`, omits `dispatch/*` and new docs, and is **referenced by no tool** (unenforced). A routes validator existed (`0305a20`) and was **deleted** (`90d4e0e`). `verify.sh:98-99` placeholder-scan is **advisory** only. [Confirmed Fact]
- **Impact:** The mechanisms intended to detect exactly the drift in GOV-01 are non-functional, so drift compounds unchecked.

#### GOV-04 (compact)
- **GOV-04 [LOW]:** repo-root `spa-*.mjs` consolidation tooling is sound but offline, untested, and emits manifests stamped "[AUTO-DRAFT — needs review]" (`spa-manifests/spa-01.json:6`) that feed parity verdicts. [Confirmed Fact]

### I. Consolidated register of remaining Low / compact Moderate findings

| ID | Sev | Finding | Evidence |
| :-- | :-- | :-- | :-- |
| SEC-01b | HIGH→(part of SEC-01) | No `.gitignore` anywhere; nothing prevents committing secrets | repo root (none found) |
| REL-04 | LOW | `diagnostics._renderLastResponse` is dead code (incident "last raw response" never renders) | `modules/diagnostics/index.js:364` |
| REL-05 | LOW | No heartbeat/periodic probe; connectivity = `navigator.onLine` + reactive banner only | `core/boot.js:28-31` |
| INFRA-04 | LOW | No `package.json`; `ui-smoke.mjs` hardcodes Playwright path to a specific node22 install | `tools/ui-smoke.mjs:10-11` |
| INFRA-05 | LOW | `BUILD_INTEGRITY.txt` count 205 vs 232 tracked; unenforced (see GOV-03) | `BUILD_INTEGRITY.txt` |
| DATA-04 | LOW | Directorate derivation is heuristic (sentinels/rich-text bleed); underivable records visible at 'all' tier | `core/entity-store.js:167-235` |
| LOG-01 | LOW | Log ring buffer not persisted (audit/request logs are) — boot-time failures lost on reload | `core/log.js:6` |

---

## 5. Cross-Cutting Analysis

### Dependency & Coupling Graph Analysis
- **External dependencies: zero.** No CDN/npm/script-src references in any runtime file; verified by sweep and by `verify.sh`'s own no-CDN gate. The only "undeclared dependency" is Playwright for the opt-in UI smoke (INFRA-04). [Confirmed Fact]
- **Internal coupling: low between modules, high onto two hubs.** Modules import only `core/*` and `shared/*` and never each other (no circular import risk at the module layer). The concentration points are `globalThis.Platform` (ARCH-01) and the two large shared files `shared/utils/lens.js` (1,033 lines) and `core/ui.js` (722 lines) (ARCH-02/STRUCT-03), which many surfaces depend on.
- **The sealed fabric is respected:** no `_store`/`_byRef` access from `modules/*`; all reads go through `Platform.Entities.*`. [Confirmed Fact]

### Configuration & Environment Isolation Evaluation
- **Endpoint config is centralized** (`config/endpoints.config.js`, by-key consumption) — BRD FR-016/017 satisfied. **But** the configuration *contains live secrets* (SEC-01) and there is **no environment separation**: a single hardcoded `ENV` host and one set of SAS URLs serve all environments; runtime override is via `localStorage` only, gated by a spoofable persona (SEC-02). There is no dev/staging/prod isolation, no secret store, no `.env`/`.gitignore`. [Confirmed Fact / Observed Risk]

### Observability & Diagnostics Posture
- **Weak.** Logging is console + non-persisted in-memory ring; audit/request logs are per-browser `localStorage`; there is no remote sink, metrics, tracing (beyond a per-call `correlationId`), or alerting (REL-01). Operator diagnosis depends on a user manually opening the Diagnostics module — whose incident "last raw response" panel is itself dead code (REL-04). A field failure is effectively undiagnosable centrally. [Confirmed Fact]

---

## 6. Analytical Integrity Matrix

| Architectural Aspect / Conclusion | Certainty | Evidence Basis / Logical Inference |
| :-- | :-- | :-- |
| 15 live SAS-signed PA URLs are committed to source control | [Confirmed Fact] | `config/endpoints.config.js:19-22,33,72,78,91,100` + git history of the file |
| The data fabric is a genuinely sealed closure with frozen readers | [Confirmed Fact] | `core/entity-store.js:25-35,319-322,488-496` |
| `api.js` is the sole API `fetch` path and never rejects | [Confirmed Fact] | `core/api.js:239-331`; only other `fetch` are SW/i18n/view/attachment |
| Persona/identity has no authentication; freely client-selectable | [Confirmed Fact] | `core/persona-controller.js:1,17-23`; `core/api.js:217-218` |
| The "sealed" directorate setter is enforced only by comment | [Confirmed Fact] | `core/context.js:49-57` (public method; closure guards assignment only) |
| `canReview`/`canClose` authority evaluators are not implemented | [Confirmed Fact] | absent from `core/persona-controller.js`; `entity-store.js:355-359` calls "if exists" |
| No CSP / security headers anywhere | [Confirmed Fact] | `index.html` (no meta); no `_headers`/`web.config`/`.htaccess` found |
| Attachment filename is an unescaped innerHTML sink | [Observed Risk] | `shared/components/pf-attachment.js:89,95` |
| Email body rendering is XSS-hardened (scriptless sandbox) | [Probable Inference] | `pf-sandboxed-iframe.js:16-19,97` (sandbox, no allow-scripts/same-origin) |
| No CI; gates are manual; no `package.json` | [Confirmed Fact] | no `.github/`; `verify.sh` is a shell script run by hand |
| Observability is console-only, no remote sink | [Confirmed Fact] | `core/log.js:6,14-17` |
| No automatic retry/backoff/circuit breaker | [Confirmed Fact] | `core/api.js:286-330`; `error-router.js:50` event has no subscriber |
| `boot.js` registers `service-worker.js`; `sw.js` is an orphan | [Confirmed Fact] | `core/boot.js:52`; `sw.js` unreferenced, wrong `/boot.js` precache |
| Unit-test coverage is ~3 suites and stale (asserts 17 vs 19 modules) | [Confirmed Fact] | `tests/suites/registry.test.js:24,31` vs `tools/boot-smoke.mjs` (19) |
| `CLAUDE.md` is authoritative-by-declaration but wrong on file/endpoint/module counts and the build freeze | [Confirmed Fact] | `CLAUDE.md:6,8,362,384,601` vs tree + git HEAD |
| Embedded URLs & disabled OTP are *mandated/accepted* design, not accidents | [Confirmed Fact] | BRD FR-015/FR-036; `docs/SECRETS.md`; `CLAUDE.md` §8-K |
| Repository is public vs private | [Unresolved Ambiguity] | `origin` is a local proxy; visibility not determinable from here |
| The PA flows enforce server-side authorization adequately | [Unresolved Ambiguity] | flows are out of scope; platform delegates all authz to them |

---

## 7. Strategic Remediation Themes

### Theme A — Credential & Trust-Boundary Containment (highest priority)
- **Associated findings:** SEC-01, SEC-01b, SEC-02, SEC-03, SEC-04, DATA-02.
- **Systemic root cause:** the "live-direct, embed-the-signed-URL" directive places the *only* credential in client-shipped, version-controlled code, while all authorization is delegated to flows that the leaked credential bypasses.
- **Remediation strategy (without redesigning the app):**
  1. **Rotate all 15 SAS signatures now** (they must be considered compromised) and treat history as exposed.
  2. Add a `.gitignore` and move signatures out of committed code — e.g., a build-time `endpoints.config.local.js` injected at deploy, or (acknowledging BRD FR-011's "no proxy now") at minimum a deploy-time substitution so signatures never live in VCS. When the BRD's "future proxy maturity" (FR-019) is reached, terminate SAS at the proxy.
  3. Add a **CSP** (`default-src 'self'`, no inline where feasible; the app is already ESM/no-inline-friendly) + `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, HSTS via host/header config.
  4. Escape the attachment-filename sink (SEC-05) and audit the `dom.js` `html:` hatch call-sites.
  5. Treat persona elevation and `setDirectorate` as security-relevant: gate behind real authentication when it exists, and document explicitly that client isolation is cosmetic until then.

### Theme B — Operational Safety Net: CI, Tests, Telemetry
- **Associated findings:** INFRA-01, REL-01, REL-02, REL-03, REL-04, INFRA-02, INFRA-04.
- **Systemic root cause:** strong *manual* tooling exists but nothing runs automatically, and runtime failures are invisible off-device.
- **Remediation strategy:**
  1. Add CI (a single workflow) that runs `verify.sh` (hard-fail), `boot-smoke`, the unit suites, and a **secret scan** on every push.
  2. Fix the stale `registry.test.js` (17→19) and add unit tests for the load-bearing logic: `entity-store.transitionStatus`/scope filter, `api.js` normalization/timeout, `sla.js`, `idempotency.js`.
  3. Introduce a remote log/metrics sink (even a best-effort beacon to one PA flow) so field failures are observable; remove dead `sw.js` and `_renderLastResponse`.
  4. Add minimal resilience: bounded retry-with-backoff on idempotent reads (notably `FETCH_ALL` bootstrap) honoring the already-parsed `retry-after`.

### Theme C — Governance Re-grounding & Drift Control
- **Associated findings:** GOV-01, GOV-02, GOV-03, GOV-04, INFRA-05, INT-05.
- **Systemic root cause:** the "authoritative" doc is a frozen snapshot, and the controls meant to keep docs/code aligned are stale/deleted/advisory.
- **Remediation strategy:**
  1. Re-baseline `CLAUDE.md`/`BUILD_INTEGRITY.txt` to HEAD (correct counts, module roster, phase status), or demote `CLAUDE.md` from "authoritative" to "historical handoff" and point to `docs/ARCHITECTURE.md`/`MASTER_PLAN.md` as canonical.
  2. Make `BUILD_INTEGRITY` enforced in CI (or delete it) and restore a routes/nav validator gate.
  3. Get an explicit ruling on the `assignment → executive` vs `→ single/bulk` conflict (GOV-02) and record it once.
  4. Provision `DISPATCH_OUTBOUND` (or formally bless the Dynamic-Actions relay) so the dispatch path matches the rest of the platform (INT-05).

---

## 8. Conclusion

### Architectural Risk Posture Summary
OBSIDIAN v4.0 is, at its core, a **well-architected, internally consistent, dependency-free modular monolith** whose engine (sealed data fabric, single normalized API chokepoint, centralized config, uniform module/service contracts) is of notably high quality and is **ahead of its own documentation**. The platform's structural integrity — separation of concerns, low inter-module coupling, respect for the sealed fabric — is a genuine strength and lowers long-term maintenance risk.

The danger is not in how the code is shaped but in **what surrounds it**. One committed file exposes live credentials to all corporate data and every write path; the platform has no authentication, no transport hardening, and no Content-Security-Policy to contain the XSS sinks that do exist; nothing runs the (good) test/lint gates automatically; production failures are invisible off-device; and the documentation that claims to govern the project is wrong on most of its load-bearing facts. Several of the gravest items are *accepted* current-phase design decisions (embedded flow URLs, disabled OTP) — but acceptance does not remove the risk, and the avoidable amplifiers (secrets in VCS with no `.gitignore`/rotation/CI, no CSP, no telemetry) should be closed before this is treated as a production system.

**Net:** the build is **strong as software** and **not yet safe as a deployed government-correspondence platform**. Prioritize Theme A (credential & trust-boundary containment) immediately, Theme B (operational safety net) next, and Theme C (governance re-grounding) in parallel. None of the three requires a ground-up redesign; all are additive to the existing, sound architecture.

---
*End of report.*
