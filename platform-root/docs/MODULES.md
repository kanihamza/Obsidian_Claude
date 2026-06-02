# Modules

17 modules, each extending `BaseModule`, self-registering via `Modules.register`, and calling its real
flow endpoint in `onVisible`. Nav groups: Operations · Governance · Executive · Administration · System.

| Module | Group | Audience | Status | Primary endpoint |
|---|---|---|---|---|
| home | Operations | all | active | FETCH_ALL |
| ops-hub | Operations | general | active | GET_DOCS |
| fasttrack | Operations | general | active | SUBSIDIARY_ACTIONS (LIST-ACTIVITIES) |
| orchestrator | Operations | general | active | SUBSIDIARY_ACTIONS (GET_ALL) |
| registry | Operations | general | active | SUBSIDIARY_ACTIONS (TRACK) |
| correspondence | Governance | general | active | GET_DOCS |
| response-tracking | Governance | general | active | SUBSIDIARY_ACTIONS (GET_ALL) |
| comments | Governance | general | active | SUBSIDIARY_ACTIONS (GET_ALL) |
| approvals | Governance | general | active | SUBSIDIARY_ACTIONS (GET_ALL) |
| executive | Executive | executive | active | FETCH_ALL |
| assignment | Executive | executive | active | FETCH_ALL |
| stats | Executive | executive | active | FETCH_ALL |
| reports | Executive | executive | active | FETCH_ALL |
| single-item-ops | Administration | admin | active | SINGLE_ASSIGNMENT |
| bulk-assignment | Administration | admin | active | BULK_ASSIGNMENT |
| diagnostics | System | admin | active | (pings every active endpoint) |

## Lifecycle (§3.12)
`status ∈ {active, beta, deprecated, sunset}`. `deprecated` renders `<pf-deprecation-banner>` citing
replacement + sunset date; `sunset` is hidden from nav and routes to the diagnostics notice. The
registry is the single source of truth.

## Adding a module
Create `modules/<id>/{index.js,view.html,styles.css[,service.js]}`, extend `BaseModule`, declare the
five static fields + optional `subbrand`, add `import './<id>/index.js'` to `modules/index.js`.
