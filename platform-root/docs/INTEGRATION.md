# Integration Model

The platform is **one Reference-keyed domain fabric**, not a shell of independent screens.
Modules are *lenses* or *aggregators* over a shared, normalized entity store — they never own
their own copy of the data and they react to each other through events and shared context.

## Spine — the Reference
Every record across every source threads on one join key: the Reference
(`referenceId`, alt `RefIDD`/`RefID`/`reference`). Assignments, approvals, comments, tracking,
registry movement and correspondence are all *views of the same Reference*. See `config/entities.config.js`.

## Shared fabric — `Platform.Entities` (`core/entity-store.js`)
- `bootstrap()` hydrates the whole fabric once from `FETCH_ALL`, normalizing collections into typed
  maps (`document, task, email, approval, comment, activity, reference`) indexed by Reference.
- `byReference(ref)` returns the related bundle (every record sharing that Reference).
- `counts()` gives rollups for aggregator modules.
- `upsert(type, record)` mutates the fabric and emits `entity:<type>:changed` +
  `entity:reference:updated` so dependent lenses refresh automatically.

## Shared focus — `Platform.Context` (`core/context.js`)
`activeReference` is the cross-module selection. A lens calls `Context.setActive(ref, moduleId)`
on select; every other lens observes `context:reference:changed` and follows.
`Platform.goToEntity(ref, module)` deep-links the same Reference into another lens (`#/<module>/<ref>`).

## Module roles (`MODULE_ROLES`)
- **Lens** (ops-hub, correspondence, approvals, comments, response-tracking, registry, fasttrack,
  single-item-ops, bulk-assignment, orchestrator): operate on individual entities; set context; cross-link.
- **Aggregator** (home, executive, stats, assignment, reports): read `Entities.counts()` / series over
  the whole fabric; never re-fetch per row; recompute on `entity:bootstrapped` / `entity:changed`.

## Lens contract (the porting pattern — see `modules/approvals/` as the reference implementation)
1. `onVisible`: ensure `Entities` hydrated; subscribe to relevant `entity:*` + `context:reference:changed`.
2. Read rows from `Entities.all(type)` / `byReference(ref)` — not a private fetch.
3. On select: `Context.setActive(ref, this.id)`; render cross-links via `goToEntity`.
4. On action: call the canonical endpoint, then `Entities.upsert(...)` so the fabric (and all lenses) update.
5. Honour deep-link param `#/<module>/<ref>` to focus that Reference.
