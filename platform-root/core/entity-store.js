/** OBSIDIAN v4.0 — entity-store.js · Platform.Entities · the normalized shared fabric.
 *  Hydrated once from FETCH_ALL; indexed by Reference so every lens reads the SAME objects.
 *
 *  SLICE S0 — Native Lexical Security Layer (register A-1..A-8 cluster + C-7):
 *    • _store / _byRef / _archive / _quarantine / _dedup are sealed inside the sealFabric() IIFE.
 *      They are never exported and never attached to globalThis.Platform — only the gated facade
 *      below escapes the closure (A-1, Decision 3, Section 5).
 *    • Every reader returns Object.freeze(structuredClone(...)) so UI mutation can never reflect
 *      back into the fabric (A-1 defensive copy).
 *    • Every reader applies the (directorate ∩ persona-scope) filter before returning (A-2, A-8).
 *    • Directorate is derived hierarchically PrimaryDSU → AssignedDSU; if neither is present the
 *      record is admitted to _quarantine, never the live store (Q-6 mandate + No Orphan contract).
 *    • transitionStatus(ref, from, to, by) is the SOLE status mutator: validates the canonical state
 *      machine, checks persona authority, and enforces the four integrity contracts (C-7, Decision 4).
 *    • canClose(ref) / archive(ref) implement the Closure-Gate and Atomic-Archive contracts (A-5, A-4).
 *  Mutations emit entity:<type>:changed + entity:reference:updated so dependent lenses react. */
import { Bus } from './bus.js';
import { BaseService } from './base-service.js';
import { ENTITY_TYPES, RELATIONSHIPS, REF_ALT_KEYS } from '../config/entities.config.js';
import { firstArray } from '../shared/utils/dom.js';

export const Entities = (function sealFabric() {
  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE — module-scope consts inside the closure. Never exported. Never on
  // globalThis. This is the fabric enclosure (defensive layer 1, register A-1).
  // ─────────────────────────────────────────────────────────────────────────
  const _store      = {};                 // type -> Map(id -> record)
  const _byRef      = {};                 // type -> Map(refId -> [records])
  const _archive    = new Map();          // refId -> deep-frozen bundle snapshot  (A-4)
  const _quarantine = new Map();          // key   -> orphan record                (A-3)
  const _dedup      = new Map();          // hash  -> { ref, ts }  rolling 30-day  (A-6)
  for (const t of Object.keys(ENTITY_TYPES)) { _store[t] = new Map(); _byRef[t] = new Map(); }

  let hydrated = false;
  let lastRaw  = null;     // last FETCH_ALL envelope (in-memory only; incident export)
  const source = 'live';

  const DEDUP_WINDOW_MS = 30 * 86400000;  // rolling 30-day dedup window (A-6)

  // ─────────────────────────────────────────────────────────────────────────
  // Canonical state machine (Operational Lexicon §3.2). transitionStatus gates
  // every status write against this — module code may NOT invent tokens (C-7).
  // ─────────────────────────────────────────────────────────────────────────
  const STATUS_PHASE = {
    registered: 1, triaged: 1, triage_complete: 1,
    assigning: 2, assigned: 2, 'assignment-failed': 2,
    acknowledged: 3, 'in-progress': 3, 'action-complete': 3, 'reassign-requested': 3,
    'pending-review': 4, approved: 4, 'approved-with-edit': 4, returned: 4, escalated: 4,
    'dispatch-pending': 5, 'dispatch-in-flight': 5, dispatched: 5, 'dispatch-failed': 5,
    'no-dispatch': 5, closed: 5, 'partial-dispatch': 5,
    archived: 6, 'cold-archived': 6
  };
  const ALL_TOKENS = new Set(Object.keys(STATUS_PHASE));

  // Allowed transitions. '' = a record with no status yet (fresh arrival).
  const TRANSITIONS = {
    '':                    new Set(['registered']),
    registered:            new Set(['triaged']),
    triaged:               new Set(['triage_complete']),
    triage_complete:       new Set(['assigning']),
    assigning:             new Set(['assigned', 'assignment-failed']),
    'assignment-failed':   new Set(['assigning', 'triage_complete']),
    assigned:              new Set(['acknowledged', 'reassign-requested']),
    acknowledged:          new Set(['in-progress']),
    'in-progress':         new Set(['action-complete', 'reassign-requested']),
    'reassign-requested':  new Set(['assigned', 'assigning']),
    'action-complete':     new Set(['pending-review']),
    'pending-review':      new Set(['approved', 'approved-with-edit', 'returned', 'escalated']),
    returned:              new Set(['in-progress']),
    approved:              new Set(['dispatch-pending']),
    'approved-with-edit':  new Set(['dispatch-pending']),
    escalated:             new Set([]),                 // DG escalation is terminal (Gate D)
    'dispatch-pending':    new Set(['dispatch-in-flight', 'no-dispatch']),
    'dispatch-in-flight':  new Set(['dispatched', 'dispatch-failed', 'partial-dispatch']),
    'dispatch-failed':     new Set(['dispatch-pending']),
    'partial-dispatch':    new Set(['dispatched', 'closed']),
    dispatched:            new Set(['closed']),
    'no-dispatch':         new Set(['closed']),
    closed:                new Set(['archived']),
    archived:              new Set(['cold-archived']),  // append-only beyond this point
    'cold-archived':       new Set([])                  // terminal (immutable)
  };

  // Minimum persona tier required to land each target token (Authority Cheat Sheet / Gate D).
  // Tiers: general/officer = 1, executive (DG / DG's Office) = 2, admin = 3.
  const REQUIRED_TIER = {
    registered: 1, triaged: 1, triage_complete: 1,
    assigning: 1, assigned: 1, 'assignment-failed': 1,
    acknowledged: 1, 'in-progress': 1, 'action-complete': 1, 'reassign-requested': 1,
    'pending-review': 1,
    approved: 2, 'approved-with-edit': 2, returned: 2, escalated: 2,
    'dispatch-pending': 2, 'dispatch-in-flight': 2, dispatched: 2, 'dispatch-failed': 2,
    'no-dispatch': 2, closed: 2, 'partial-dispatch': 2,
    archived: 2, 'cold-archived': 3   // archive is auto-on-closure (DG's Office); cold sweep is admin-only
  };
  const REVIEW_TOKENS = new Set(['approved', 'approved-with-edit', 'returned', 'escalated']);
  const TERMINAL_TASK = new Set(['action-complete', 'closed', 'archived', 'cold-archived']);
  const RESOLVED_APPR = new Set(['approved', 'approved-with-edit', 'returned', 'escalated', 'closed']);
  const RESOLVED_DISP = new Set(['dispatched', 'no-dispatch', 'partial-dispatch']);

  // ─────────────────────────────────────────────────────────────────────────
  // Canonical field aliases — every consumer reads the lower-case canonical key;
  // ingest copies any alias value (PascalCase, snake_case, etc.) into the canonical
  // when the canonical is empty. ADDITIVE — original keys preserved, never overwritten.
  // ─────────────────────────────────────────────────────────────────────────
  const FIELD_ALIASES = {
    title:      ['title', 'Title', 'TITLE', 'name', 'Name', 'displayName'],
    subject:    ['subject', 'Subject', 'SUBJECT', 'emailSubject', 'EmailSubject'],
    body:       ['body', 'Body', 'BODY', 'content', 'Content', 'htmlBody', 'HtmlBody', 'description', 'Description'],
    status:     ['status', 'Status', 'STATUS', 'state', 'State', 'AssignmentStatus', 'assignmentStatus'],
    priority:   ['priority', 'Priority', 'PRIORITY'],
    assignedTo: ['assignedTo', 'AssignedTo', 'Assigned_To', 'assignee', 'Assignee', 'assignedToEmail', 'AssignedToEmail'],
    assignedBy: ['assignedBy', 'AssignedBy', 'Assigned_By', 'assigner', 'Assigner', 'createdBy', 'CreatedBy'],
    sender:     ['sender', 'Sender', 'from', 'From', 'fromAddress', 'FromAddress', 'SenderEmail'],
    ts:         ['ts', 'timestamp', 'Timestamp', 'TimeStamp', 'TimeStampUtc', 'timeStamp', 'receivedDateTime', 'ReceivedDateTime', 'sentDateTime'],
    createdAt:  ['createdAt', 'CreatedAt', 'created', 'Created', 'createdOn', 'CreatedOn'],
    dueDate:    ['dueDate', 'DueDate', 'due', 'Due', 'dueOn', 'DueOn', 'taskDue', 'TaskDue', 'ackDue', 'AckDue'],
    category:   ['category', 'Category', 'categoryName', 'CategoryName'],
    department: ['department', 'Department', 'dept', 'Dept', 'departmentName', 'DepartmentName'],
    emailId:    ['emailId', 'EmailId', 'EmailID', 'messageId', 'MessageId', 'MessageID'],
    author:     ['author', 'Author', 'commentBy', 'CommentBy', 'createdBy', 'CreatedBy', 'EditorEmail', 'editorEmail', 'AuthorTitle', 'authorTitle'],
    url:        ['url', 'Url', 'URL', 'link', 'Link']
  };
  function normalizeRecord(r) {
    if (!r || typeof r !== 'object') return r;
    const out = { ...r };
    for (const canonical in FIELD_ALIASES) {
      if (out[canonical] != null && out[canonical] !== '' && typeof out[canonical] !== 'object') continue;
      for (const a of FIELD_ALIASES[canonical]) {
        if (a === canonical) continue;
        const v = out[a];
        if (v != null && v !== '' && typeof v !== 'object') { out[canonical] = v; break; }
      }
    }
    return out;
  }

  /** Collection key normalization — flows may return `Documents`, `REFERENCES`, `Tasks`, etc. */
  const COLL_VARIANTS = {
    document: ['document', 'documents', 'Document', 'Documents', 'docs', 'Docs', 'DOCUMENTS', 'DOCS'],
    task:     ['task', 'tasks', 'Task', 'Tasks', 'TASKS'],
    email:    ['email', 'emails', 'Email', 'Emails', 'EMAILS'],
    approval: ['approval', 'approvals', 'Approval', 'Approvals', 'APPROVALS'],
    comment:  ['comment', 'comments', 'Comment', 'Comments', 'COMMENTS', 'taskComment', 'taskComments', 'TaskComment', 'TaskComments'],
    activity: ['activity', 'activities', 'Activity', 'Activities', 'ACTIVITIES'],
    reference:['reference', 'references', 'Reference', 'References', 'Refs', 'refs', 'REFERENCES']
  };
  const COLL_TO_TYPE = {};
  for (const t in COLL_VARIANTS) for (const k of COLL_VARIANTS[t]) COLL_TO_TYPE[k] = t;

  const fetchAll = BaseService.endpoint('FETCH_ALL', { cache: 0, expectedKeys: ['ok'] });

  // ─── identity helpers ──────────────────────────────────────────────────────
  function refOf(rec) {
    if (!rec || typeof rec !== 'object') return null;
    for (const k of REF_ALT_KEYS) if (rec[k] != null && rec[k] !== '') return String(rec[k]);
    return null;
  }
  function idOf(type, rec) {
    for (const k of ENTITY_TYPES[type].altKeys) if (rec[k] != null) return String(rec[k]);
    return refOf(rec) || ('row-' + (_store[type].size + 1));
  }

  /** Q-6 mandate — hierarchical directorate derivation: PrimaryDSU first, then AssignedDSU.
   *  No legacy fallback map is permitted; if neither is present the record is an orphan. */
  function deriveDirectorate(rec) {
    const v = (rec.PrimaryDSU ?? rec.primaryDSU ?? rec.PrimaryDsu);
    if (v != null && String(v).trim() !== '') return String(v).trim();
    const a = (rec.AssignedDSU ?? rec.assignedDSU ?? rec.AssignedDsu);
    if (a != null && String(a).trim() !== '') return String(a).trim();
    return null;
  }

  function dedupHash(rec) {
    const sender = String(rec.sender || rec.from || '').toLowerCase().trim();
    const subject = String(rec.subject || rec.title || '').toLowerCase().trim().replace(/\s+/g, ' ');
    const day = String(rec.ts || rec.createdAt || '').slice(0, 10);
    if (!sender && !subject) return null;
    return sender + '|' + subject + '|' + day;
  }
  function noteDedup(rec) {
    const hash = dedupHash(rec);
    if (!hash || !rec.__ref) return;
    const now = Date.now();
    for (const [h, v] of _dedup) if (now - v.ts > DEDUP_WINDOW_MS) _dedup.delete(h);  // prune window
    const hit = _dedup.get(hash);
    if (hit && hit.ref !== rec.__ref && (now - hit.ts) <= DEDUP_WINDOW_MS) {
      rec.__duplicateOf = hit.ref;                 // Phase-1 dedup warning consumes this flag
    } else {
      _dedup.set(hash, { ref: rec.__ref, ts: now });
    }
  }

  /** Raw index into the live store — assumes admission already passed. */
  function indexRaw(type, rec) {
    const id = idOf(type, rec);
    rec.__id = id;
    rec.__ref = refOf(rec);
    _store[type].set(id, rec);
    if (rec.__ref) {
      const arr = _byRef[type].get(rec.__ref) || [];
      arr.push(rec);
      _byRef[type].set(rec.__ref, arr);
    }
    return rec;
  }

  /** Admission gate — normalize, derive directorate, enforce No Orphan, dedup-flag, then index.
   *  Orphans (no reference, or directorate underivable on a primary type) go to _quarantine. */
  function admit(type, raw) {
    const rec = normalizeRecord(raw);
    rec.__ref = refOf(rec);
    rec.__directorate = deriveDirectorate(rec);
    const orphanRef = !rec.__ref;
    const orphanDsu = (rec.__directorate === null && type !== 'reference');
    if (orphanRef || orphanDsu) {
      const innerId = idOf(type, rec);
      rec.__id = innerId;
      rec.__quarantineReason = orphanRef ? 'reference-missing' : 'directorate-underivable';
      _quarantine.set(type + ':' + innerId, rec);
      Bus.emit('audit:orphan-quarantined', { type, id: innerId, reason: rec.__quarantineReason, ts: new Date().toISOString() });
      return null;
    }
    if (type === 'email' || type === 'document') noteDedup(rec);
    return indexRaw(type, rec);
  }

  // ─── scope / persona filter (defensive layers 2,4,5) ─────────────────────────
  function activeScope() {
    const C = globalThis.Platform && globalThis.Platform.Context;
    return (C && typeof C.directorate === 'function') ? C.directorate() : 'all';
  }
  function personaAllows(rec) {
    const P = globalThis.Platform && globalThis.Platform.Persona;
    if (P && typeof P.canSeeRecord === 'function') return !!P.canSeeRecord(rec);  // future A-8 hook
    return true;
  }
  function visible(rec) {
    if (!rec) return false;
    if (!personaAllows(rec)) return false;
    const scope = activeScope();
    if (scope === 'all') return true;
    return rec.__directorate === scope;
  }

  // ─── defensive copy ──────────────────────────────────────────────────────────
  function frozen(value) {
    if (value == null) return value;
    return Object.freeze(structuredClone(value));
  }
  function deepFreeze(value) {
    const clone = structuredClone(value);
    const seen = new Set();
    (function walk(o) {
      if (!o || typeof o !== 'object' || seen.has(o)) return;
      seen.add(o);
      Object.freeze(o);
      for (const k of Object.keys(o)) walk(o[k]);
    })(clone);
    return clone;
  }

  /** Unscoped, raw bundle assembly — used internally by archive() (a system action). */
  function rawBundle(refId) {
    const id = String(refId);
    const out = { referenceId: id };
    for (const child of RELATIONSHIPS.reference) out[child] = [...(_byRef[child]?.get(id) || [])];
    out.reference = _store.reference.get(id) || null;
    return out;
  }

  // ─── authority (Authority Cheat Sheet / Gate D) ──────────────────────────────
  function personaTier() {
    const P = globalThis.Platform && globalThis.Platform.Persona;
    const id = (P && typeof P.current === 'function' && P.current()) || 'general';
    return id === 'admin' ? 3 : id === 'executive' ? 2 : 1;
  }
  function authorityFor(to, by, refRec) {
    const P = globalThis.Platform && globalThis.Platform.Persona;
    const assigner = refRec.assignedBy || refRec.AssignedBy || refRec.createdBy || null;
    const isAssigner = !!(by && assigner && String(by) === String(assigner));
    // Explicit persona capabilities take precedence once later slices implement them (F-7, G-7).
    if (REVIEW_TOKENS.has(to) && P && typeof P.canReview === 'function') {
      if (P.canReview(refRec) || isAssigner) return { ok: true };
    }
    if (to === 'closed' && P && typeof P.canClose === 'function') {
      if (P.canClose(refRec) || isAssigner) return { ok: true };
    }
    const need = REQUIRED_TIER[to] ?? 1;
    const have = personaTier();
    if (have >= need) return { ok: true };
    if (isAssigner && need <= 2) return { ok: true };  // original-assigner authority (Cheat Sheet)
    return { ok: false, kind: 'NOT_AUTHORIZED', message: 'insufficient authority for state "' + to + '"' };
  }

  function fail(kind, message, extra) {
    return Object.freeze({ ok: false, kind, message: message || kind, ...(extra || {}) });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC FACADE — only these readers/writers escape the closure.
  // ─────────────────────────────────────────────────────────────────────────
  const facade = {
    /** Map a FETCH_ALL bundle (or any collection map) into the typed store. */
    ingest(data) {
      if (!data || typeof data !== 'object') return;
      const hasColl = (o) => Object.keys(o || {}).some((k) => COLL_TO_TYPE[k] || COLL_TO_TYPE[String(k).toLowerCase()]);
      let src = data;
      if (!hasColl(src)) {
        for (const v of Object.values(data)) {
          if (v && typeof v === 'object' && !Array.isArray(v) && hasColl(v)) { src = v; break; }
        }
      }
      for (const [coll, val] of Object.entries(src)) {
        const type = COLL_TO_TYPE[coll] || COLL_TO_TYPE[String(coll).toLowerCase()] || (ENTITY_TYPES[coll] ? coll : null);
        if (!type) continue;
        const rows = Array.isArray(val) ? val : firstArray(val);
        for (const r of rows) if (r && typeof r === 'object') admit(type, r);
      }
      // Synthesize reference rows from any child that carries a ref but has no explicit reference
      // record. The synthesized reference inherits its directorate structurally from that child
      // (bundle-structural derivation, NOT a legacy mapping table — Q-6 compliant).
      for (const type of Object.keys(_byRef)) {
        if (type === 'reference') continue;
        for (const [ref, arr] of _byRef[type]) {
          if (_store.reference.has(ref)) continue;
          const donor = (arr || []).find((r) => r.__directorate != null) || (arr || [])[0] || {};
          indexRaw('reference', { referenceId: ref, __directorate: donor.__directorate ?? null });
        }
      }
      // Documents whose own numeric ID is their reference identity become both document AND reference.
      for (const rec of _store.document.values()) {
        if (rec.__ref || !rec.__id) continue;
        rec.__ref = String(rec.__id);
        const arr = _byRef.document.get(rec.__ref) || []; arr.push(rec); _byRef.document.set(rec.__ref, arr);
        if (!_store.reference.has(rec.__ref))
          indexRaw('reference', { referenceId: rec.__ref, title: rec.title || '', status: rec.status || '', __directorate: rec.__directorate ?? null });
      }
    },

    async bootstrap(force) {
      if (hydrated && !force) return true;
      Bus.emit('entity:loading', { loading: true });
      for (const t of Object.keys(_store)) { _store[t].clear(); _byRef[t].clear(); }
      _quarantine.clear(); _dedup.clear();
      let ok = false;
      const res = await fetchAll({ action: 'fetchAll' });
      // Retain a shallow copy of the last raw response for incident triage (in-memory only).
      try {
        const envelope = { ok: res.ok, kind: res.kind, status: res.status, correlationId: res.correlationId,
          durationMs: res.durationMs, errors: res.errors, ts: new Date().toISOString() };
        const sample = JSON.stringify(res.body || res.data || null);
        lastRaw = sample.length < 5_000_000
          ? { ...envelope, body: res.body || res.data || null }
          : { ...envelope, body: null, _bodyOmitted: 'Response too large (' + Math.round(sample.length / 1024 / 1024) + ' MB) to retain in memory.' };
      } catch (_) { lastRaw = null; }
      const sources = [
        res.data,
        res.body && typeof res.body === 'object' ? res.body.data : null,
        res.body && typeof res.body === 'object' ? res.body : null
      ].filter((s) => s && typeof s === 'object');
      const before = Object.values(_store).reduce((n, m) => n + m.size, 0);
      for (const s of sources) {
        this.ingest(s);
        const after = Object.values(_store).reduce((n, m) => n + m.size, 0);
        if (after > before) { ok = true; break; }
      }
      if (!ok) {
        (globalThis.Platform?.Log)?.warn('entity.fetch-failed', {
          message: (res.errors && res.errors[0] && res.errors[0].message) || res.kind || 'no records ingested',
          triedSources: sources.length, httpStatus: res.status, quarantined: _quarantine.size
        });
      } else {
        (globalThis.Platform?.Log)?.info('entity.fetch-ok', { counts: this.counts(), quarantined: _quarantine.size });
      }
      hydrated = true; this.source = source;
      if (globalThis.Platform?.State) globalThis.Platform.State.set('shared.connectivity.dataOk', ok);
      Bus.emit('entity:bootstrapped', { ok, source, counts: this.counts() });
      Bus.emit('data:refresh', { source, counts: this.counts() });
      return ok;
    },

    isHydrated() { return hydrated; },
    lastRawResponse() { return lastRaw || null; },

    // ─── scoped, frozen readers (A-1, A-2, A-8) ───────────────────────────────
    all(type) {
      if (!_store[type]) return [];
      const out = [];
      for (const r of _store[type].values()) if (visible(r)) out.push(frozen(r));
      return out;
    },
    get(type, id) {
      const rec = _store[type]?.get(String(id)) || null;
      if (!rec) return null;
      if (!visible(rec)) {
        Bus.emit('audit:unauthorized-access-attempt', {
          persona: (globalThis.Platform?.Persona?.current && globalThis.Platform.Persona.current()) || null,
          attemptedRef: rec.__ref || null, requiredDirectorate: rec.__directorate || null, ts: new Date().toISOString()
        });
        return null;
      }
      return frozen(rec);
    },
    byReference(refId) {
      const id = String(refId);
      const out = { referenceId: id };
      for (const child of RELATIONSHIPS.reference)
        out[child] = [...(_byRef[child]?.get(id) || [])].filter(visible);
      const refRec = _store.reference.get(id) || null;
      out.reference = (refRec && visible(refRec)) ? refRec : null;
      return frozen(out);
    },

    /** Rollups for aggregator modules — counts only the records the active scope may see. */
    counts() {
      const c = {};
      for (const t of Object.keys(_store)) {
        let n = 0; for (const r of _store[t].values()) if (visible(r)) n++;
        c[t] = n;
      }
      const status = {}, priority = {}, assignee = {};
      const overdue = []; const now = Date.now();
      const isClosed = (s) => /closed|done|complete|resolved|archived/.test(String(s || '').toLowerCase());
      for (const t of ['document', 'task', 'approval', 'email']) for (const r of _store[t].values()) {
        if (!visible(r)) continue;
        const s = (r.status || 'unknown').toString().toLowerCase();
        status[s] = (status[s] || 0) + 1;
        const p = (r.priority || '').toString();
        if (p) priority[p] = (priority[p] || 0) + 1;
      }
      for (const t of ['task', 'document']) for (const r of _store[t].values()) {
        if (!visible(r)) continue;
        const a = (r.assignedTo || '').toString();
        if (a) assignee[a] = (assignee[a] || 0) + 1;
      }
      for (const t of ['task', 'document']) for (const r of _store[t].values()) {
        if (!visible(r)) continue;
        const due = r.dueDate; if (!due) continue;
        const ms = Date.parse(due);
        if (!Number.isNaN(ms) && ms < now && !isClosed(r.status))
          overdue.push({ ref: r.__ref, title: r.title || r.subject || r.__id, due, assignedTo: r.assignedTo || '', type: t });
      }
      const recent = [..._store.reference.values()]
        .filter((r) => visible(r) && r.ts).sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts)).slice(0, 8)
        .map((r) => frozen(r));
      const DAY = 86400000, today = new Date(); today.setHours(0, 0, 0, 0);
      const days = []; for (let i = 13; i >= 0; i--) days.push(new Date(today.getTime() - i * DAY));
      const bucket = Object.fromEntries(days.map((d) => [d.toISOString().slice(0, 10), 0]));
      for (const t of Object.keys(_store)) for (const r of _store[t].values()) {
        if (!visible(r)) continue;
        const ms = Date.parse(r.ts || r.createdAt); if (Number.isNaN(ms)) continue;
        const key = new Date(ms).toISOString().slice(0, 10);
        if (key in bucket) bucket[key] += 1;
      }
      c.timeline = days.map((d) => { const k = d.toISOString().slice(0, 10); return { date: k, count: bucket[k] }; });
      c.byStatus = status; c.byPriority = priority; c.byAssignee = assignee;
      c.overdue = { count: overdue.length, items: overdue.slice(0, 12) };
      c.recent = recent;
      return c;
    },

    /** Insert/update one record through the admission gate; notify dependent lenses. */
    upsert(type, record) {
      if (!_store[type]) return null;
      const rec = admit(type, { ...record });
      if (!rec) return null;   // quarantined (orphan / directorate-underivable)
      Bus.emit('entity:' + type + ':changed', { id: rec.__id, ref: rec.__ref });
      if (rec.__ref) Bus.emit('entity:reference:updated', { ref: rec.__ref, type });
      Bus.emit('entity:changed', { type, id: rec.__id, ref: rec.__ref });
      Bus.emit('entity:update', { type, id: rec.__id, ref: rec.__ref });
      return frozen(rec);
    },

    /** THE phase-gate chokepoint (C-7). Sole status mutator. Validates the canonical state
     *  machine, checks persona authority, enforces the four integrity contracts, audits. */
    transitionStatus(ref, from, to, by) {
      const refId = String(ref);
      const target = String(to || '');
      if (!ALL_TOKENS.has(target)) return fail('INVALID_STATE', 'unknown status token "' + target + '"');
      const refRec = _store.reference.get(refId);
      if (!refRec) return fail('NO_REFERENCE', 'no reference record for "' + refId + '" (No Orphan contract)');
      if (_archive.has(refId)) return fail('IMMUTABLE', 'reference "' + refId + '" is archived and immutable');

      const current = String(refRec.status || '');
      if (from != null && from !== '' && current && current !== String(from))
        return fail('STATE_CONFLICT', 'expected from "' + from + '" but current is "' + current + '"', { current });

      const allowed = TRANSITIONS[current] || TRANSITIONS[''];
      if (!allowed || !allowed.has(target))
        return fail('ILLEGAL_TRANSITION', 'cannot move "' + (current || '∅') + '" → "' + target + '"', { current });

      const auth = authorityFor(target, by, refRec);
      if (!auth.ok) {
        Bus.emit('audit:unauthorized-access-attempt', {
          persona: (globalThis.Platform?.Persona?.current && globalThis.Platform.Persona.current()) || null,
          attemptedRef: refId, action: 'transition:' + target, by: by || null, ts: new Date().toISOString()
        });
        return fail(auth.kind, auth.message, { ref: refId });
      }

      // Closure Gate contract (A-5): a reference may only close once all dependents are resolved.
      if (target === 'closed') {
        const gate = facade.canClose(refId);
        if (!gate.ok) return fail('CLOSURE_BLOCKED', 'closure prerequisites unmet', { reasons: gate.reasons });
      }
      // Atomic Archive contract (A-4/H-5/H-6): snapshot the whole bundle, deep-freeze, all-or-nothing.
      if (target === 'archived') {
        const archived = facade.archive(refId);
        if (!archived.ok) return archived;
      }

      const ts = new Date().toISOString();
      refRec.status = target;
      refRec.__lastTransition = { from: current, to: target, by: by || null, ts };

      // Activity Audit Thread contract — ref-keyed audit event for the audit log + timeline.
      Bus.emit('audit:phase-transition', {
        ref: refId, from: current, to: target, by: by || null, ts,
        fromPhase: STATUS_PHASE[current] || null, toPhase: STATUS_PHASE[target] || null
      });
      Bus.emit('entity:reference:updated', { ref: refId, type: 'reference' });
      Bus.emit('entity:changed', { type: 'reference', id: refRec.__id, ref: refId });
      return Object.freeze({ ok: true, ref: refId, from: current, to: target, by: by || null, ts });
    },

    /** Closure-Gate evaluator (A-5): all tasks terminal, all approvals resolved, all dispatch resolved. */
    canClose(ref) {
      const refId = String(ref);
      if (!_store.reference.get(refId)) return { ok: false, reasons: ['no-reference'] };
      const reasons = [];
      for (const tk of (_byRef.task.get(refId) || []))
        if (!TERMINAL_TASK.has(String(tk.status || '').toLowerCase())) reasons.push('task-not-terminal:' + tk.__id);
      for (const ap of (_byRef.approval.get(refId) || []))
        if (!RESOLVED_APPR.has(String(ap.status || '').toLowerCase())) reasons.push('approval-open:' + ap.__id);
      for (const ac of (_byRef.activity.get(refId) || [])) {
        const kind = String(ac.kind || ac.type || '').toLowerCase();
        if (kind.indexOf('dispatch') === -1) continue;
        if (!RESOLVED_DISP.has(String(ac.status || '').toLowerCase())) reasons.push('dispatch-unresolved:' + ac.__id);
      }
      return { ok: reasons.length === 0, reasons };
    },

    /** Atomic-Archive writer (A-4/H-3): deep-frozen all-or-nothing bundle snapshot; append-only. */
    archive(ref) {
      const refId = String(ref);
      const refRec = _store.reference.get(refId);
      if (!refRec) return fail('NO_REFERENCE', 'cannot archive missing reference "' + refId + '"');
      if (_archive.has(refId)) return Object.freeze({ ok: true, ref: refId, kind: 'ALREADY_ARCHIVED' });
      let snapshot;
      try {
        snapshot = deepFreeze({ ...rawBundle(refId), __archivedAt: new Date().toISOString() });
      } catch (e) {
        return fail('ARCHIVE_FAILED', String((e && e.message) || e));
      }
      _archive.set(refId, snapshot);   // commit only after the frozen snapshot is fully built (atomic)
      Bus.emit('audit:archived', { ref: refId, ts: snapshot.__archivedAt });
      return Object.freeze({ ok: true, ref: refId });
    },

    /** Read an archived bundle (already immutable). Audited as an archive access. */
    archived(ref) {
      const refId = String(ref);
      const snap = _archive.get(refId) || null;
      if (snap) Bus.emit('audit:archive-accessed', {
        ref: refId, persona: (globalThis.Platform?.Persona?.current && globalThis.Platform.Persona.current()) || null, ts: new Date().toISOString()
      });
      return snap;
    },

    /** Quarantined orphan records — admin persona only (Section 3.4 / Quarantine). */
    quarantine() {
      const id = (globalThis.Platform?.Persona?.current && globalThis.Platform.Persona.current()) || 'general';
      if (id !== 'admin') return [];
      return [..._quarantine.values()].map((r) => frozen(r));
    },

    subscribe(typeOrAll, fn) {
      const ev = typeOrAll === '*' ? 'entity:changed' : 'entity:' + typeOrAll + ':changed';
      return Bus.on(ev, fn);
    },

    source
  };

  return facade;
})();

export default Entities;
