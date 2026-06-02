/** OBSIDIAN v4.0 — entity-store.js · Platform.Entities · the normalized shared fabric.
 *  Hydrated once from FETCH_ALL; indexed by Reference so every lens reads the SAME objects.
 *  Mutations emit entity:<type>:changed + entity:reference:updated so dependent lenses react. */
import { Bus } from './bus.js';
import { BaseService } from './base-service.js';
import { ENTITY_TYPES, RELATIONSHIPS, REF_ALT_KEYS } from '../config/entities.config.js';
import { firstArray } from '../shared/utils/dom.js';

const store = {};                       // type -> Map(id -> record)
const byRef = {};                       // type -> Map(refId -> [records])
for (const t of Object.keys(ENTITY_TYPES)) { store[t] = new Map(); byRef[t] = new Map(); }

/** Canonical field aliases — every consumer reads the lower-case canonical key; ingest copies any
 *  alias value (PascalCase, snake_case, etc.) into the canonical when the canonical is empty.
 *  ADDITIVE — original keys are preserved, no value is overwritten. */
const FIELD_ALIASES = {
  title:      ['title','Title','TITLE','name','Name','displayName'],
  subject:    ['subject','Subject','SUBJECT','emailSubject','EmailSubject'],
  body:       ['body','Body','BODY','content','Content','htmlBody','HtmlBody','description','Description'],
  status:     ['status','Status','STATUS','state','State','AssignmentStatus','assignmentStatus'],
  priority:   ['priority','Priority','PRIORITY'],
  assignedTo: ['assignedTo','AssignedTo','Assigned_To','assignee','Assignee','assignedToEmail','AssignedToEmail'],
  sender:     ['sender','Sender','from','From','fromAddress','FromAddress','SenderEmail'],
  ts:         ['ts','timestamp','Timestamp','TimeStamp','TimeStampUtc','timeStamp','receivedDateTime','ReceivedDateTime','sentDateTime'],
  createdAt:  ['createdAt','CreatedAt','created','Created','createdOn','CreatedOn'],
  dueDate:    ['dueDate','DueDate','due','Due','dueOn','DueOn','taskDue','TaskDue','ackDue','AckDue'],
  category:   ['category','Category','categoryName','CategoryName'],
  department: ['department','Department','dept','Dept','departmentName','DepartmentName'],
  emailId:    ['emailId','EmailId','EmailID','messageId','MessageId','MessageID'],
  author:     ['author','Author','commentBy','CommentBy','createdBy','CreatedBy','EditorEmail','editorEmail','AuthorTitle','authorTitle'],
  url:        ['url','Url','URL','link','Link']
};
function normalizeRecord(r) {
  if (!r || typeof r !== 'object') return r;
  const out = { ...r };
  for (const canonical in FIELD_ALIASES) {
    if (out[canonical] != null && out[canonical] !== '' && typeof out[canonical] !== 'object') continue;
    // Always prefer a primitive (string/number/bool) over an object/array — so e.g. an `fromAddress`
    // string beats a `from` object even though both are "present".
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
  document: ['document','documents','Document','Documents','docs','Docs','DOCUMENTS','DOCS'],
  task:     ['task','tasks','Task','Tasks','TASKS'],
  email:    ['email','emails','Email','Emails','EMAILS'],
  approval: ['approval','approvals','Approval','Approvals','APPROVALS'],
  comment:  ['comment','comments','Comment','Comments','COMMENTS','taskComment','taskComments','TaskComment','TaskComments'],
  activity: ['activity','activities','Activity','Activities','ACTIVITIES'],
  reference:['reference','references','Reference','References','Refs','refs','REFERENCES']
};
const COLL_TO_TYPE = {};
for (const t in COLL_VARIANTS) for (const k of COLL_VARIANTS[t]) COLL_TO_TYPE[k] = t;

let hydrated = false;

const fetchAll = BaseService.endpoint('FETCH_ALL', { cache: 0, expectedKeys: ['ok'] });

function refOf(rec) {
  if (!rec || typeof rec !== 'object') return null;
  for (const k of REF_ALT_KEYS) if (rec[k] != null && rec[k] !== '') return String(rec[k]);
  return null;
}
function idOf(type, rec) {
  for (const k of ENTITY_TYPES[type].altKeys) if (rec[k] != null) return String(rec[k]);
  return refOf(rec) || ('row-' + (store[type].size + 1));
}
function index(type, rec) {
  const id = idOf(type, rec); rec.__id = id; rec.__ref = refOf(rec);
  store[type].set(id, rec);
  if (rec.__ref) { const arr = byRef[type].get(rec.__ref) || []; arr.push(rec); byRef[type].set(rec.__ref, arr); }
  return rec;
}

export const Entities = {
  /** Map a FETCH_ALL bundle (or any collection map) into the typed store. */
  ingest(data) {
    if (!data || typeof data !== 'object') return;
    // Smart descent: if no recognized collection keys at top level, try ONE level deeper
    // (handles flows that wrap collections under e.g. { Response: {...}, Result: {...} }).
    const hasColl = (o) => Object.keys(o || {}).some((k) => COLL_TO_TYPE[k] || COLL_TO_TYPE[String(k).toLowerCase()]);
    let source = data;
    if (!hasColl(source)) {
      for (const v of Object.values(data)) {
        if (v && typeof v === 'object' && !Array.isArray(v) && hasColl(v)) { source = v; break; }
      }
    }
    for (const [coll, val] of Object.entries(source)) {
      const type = COLL_TO_TYPE[coll] || COLL_TO_TYPE[String(coll).toLowerCase()] || (ENTITY_TYPES[coll] ? coll : null);
      if (!type) continue;
      const rows = Array.isArray(val) ? val : firstArray(val);
      for (const r of rows) if (r && typeof r === 'object') index(type, normalizeRecord(r));
    }
    // synthesize reference rows from any child that carries a ref but has no explicit reference record
    for (const type of Object.keys(byRef)) if (type !== 'reference')
      for (const ref of byRef[type].keys())
        if (!store.reference.has(ref)) index('reference', { referenceId: ref });
    // Records that lack a refOf() field but DO have an id of their own (notably documents whose
    // numeric ID is their reference identity) become both their own document AND their own
    // reference, so they show up in reference-keyed views and cross-links work.
    for (const type of ['document']) {
      for (const rec of store[type].values()) {
        if (rec.__ref || !rec.__id) continue;
        rec.__ref = String(rec.__id);
        const arr = byRef[type].get(rec.__ref) || []; arr.push(rec); byRef[type].set(rec.__ref, arr);
        if (!store.reference.has(rec.__ref)) index('reference', { referenceId: rec.__ref, title: rec.title || rec.Title || '', status: rec.status || rec.Status || rec.AssignmentStatus || '' });
      }
    }
  },
  async bootstrap(force) {
    if (hydrated && !force) return true;
    Bus.emit("entity:loading", { loading: true });
    for (const t of Object.keys(store)) { store[t].clear(); byRef[t].clear(); }
    let source = 'live', ok = false;
    const res = await fetchAll({ action: 'fetchAll' });
    // Retain a SHALLOW copy of the last raw response for incident triage — operators can export
    // it from Diagnostics. We keep the ok/kind/status/correlationId envelope intact and the data
    // body up to a sanity cap (~2 MB serialized) so a 4-5 MB real response is preserved fully
    // but a runaway response doesn't blow up localStorage. Never persisted; in-memory only.
    try {
      const envelope = { ok: res.ok, kind: res.kind, status: res.status, correlationId: res.correlationId,
        durationMs: res.durationMs, errors: res.errors, ts: new Date().toISOString() };
      // Estimate size — if under 5 MB serialised, keep the body too; else drop body
      const sample = JSON.stringify(res.body || res.data || null);
      this._lastRawResponse = sample.length < 5_000_000
        ? { ...envelope, body: res.body || res.data || null }
        : { ...envelope, body: null, _bodyOmitted: 'Response too large (' + Math.round(sample.length / 1024 / 1024) + ' MB) to retain in memory.' };
    } catch (_) { this._lastRawResponse = null; }
    // Try ingest against MULTIPLE potential data sources so the platform tolerates the various
    // shapes a Power Automate flow can return: `res.data` (extracted via deriveData), `res.body.data`
    // (explicit data wrapper), or `res.body` itself (flat response). Even when ok:false we still
    // attempt — many flows return ok:false alongside valid sub-results.
    const sources = [
      res.data,
      res.body && typeof res.body === 'object' ? res.body.data : null,
      res.body && typeof res.body === 'object' ? res.body : null
    ].filter((s) => s && typeof s === 'object');
    const before = Object.values(store).reduce((n, m) => n + m.size, 0);
    for (const src of sources) {
      this.ingest(src);
      const after = Object.values(store).reduce((n, m) => n + m.size, 0);
      if (after > before) { ok = true; break; }   // first source that yields records wins
    }
    if (!ok) {
      (globalThis.Platform?.Log)?.warn('entity.fetch-failed', {
        message: (res.errors && res.errors[0] && res.errors[0].message) || res.kind || 'no records ingested',
        triedSources: sources.length, httpStatus: res.status
      });
    } else {
      (globalThis.Platform?.Log)?.info('entity.fetch-ok', { counts: this.counts() });
    }
    hydrated = true; this.source = source;
    if (globalThis.Platform?.State) globalThis.Platform.State.set('shared.connectivity.dataOk', ok);
    Bus.emit('entity:bootstrapped', { ok, source, counts: this.counts() });
    Bus.emit('data:refresh', { source, counts: this.counts() });
    return ok;
  },
  isHydrated() { return hydrated; },
  /** Retrieve the last raw Fetch_All response envelope (in-memory, for incident export). */
  lastRawResponse() { return this._lastRawResponse || null; },
  all(type) { return [...(store[type]?.values() || [])]; },
  get(type, id) { return store[type]?.get(String(id)) || null; },
  /** Every record across all types that shares a Reference — the related bundle. */
  byReference(refId) {
    const out = { referenceId: String(refId) };
    for (const child of RELATIONSHIPS.reference) out[child] = [...(byRef[child]?.get(String(refId)) || [])];
    out.reference = store.reference.get(String(refId)) || null;
    return out;
  },
  /** Rollups for aggregator modules (counts + per-status) over the whole fabric. */
  counts() {
    const c = {};
    for (const t of Object.keys(store)) c[t] = store[t].size;
    const status = {}, priority = {}, assignee = {};
    const overdue = []; const now = Date.now();
    const closed = (s) => /closed|done|complete|resolved|archived/.test(String(s || '').toLowerCase());
    for (const t of ['document', 'task', 'approval', 'email']) for (const r of store[t].values()) {
      const s = (r.status || r.Status || 'unknown').toString().toLowerCase();
      status[s] = (status[s] || 0) + 1;
      const p = (r.priority || r.Priority || '').toString();
      if (p) priority[p] = (priority[p] || 0) + 1;
    }
    // Workload by assignee (tasks + documents) — the assignment-intelligence signal.
    for (const t of ['task', 'document']) for (const r of store[t].values()) {
      const a = (r.assignedTo || r.AssignedTo || '').toString();
      if (a) assignee[a] = (assignee[a] || 0) + 1;
    }
    // Overdue = tasks/documents with a due date in the past and not closed.
    for (const t of ['task', 'document']) for (const r of store[t].values()) {
      const due = r.taskDue || r.ackDue || r.dueDate; if (!due) continue;
      const ms = Date.parse(due); if (!Number.isNaN(ms) && ms < now && !closed(r.status || r.Status))
        overdue.push({ ref: r.__ref, title: r.title || r.subject || r.__id, due, assignedTo: r.assignedTo || '', type: t });
    }
    // Most recent references by timestamp (executive recent activity).
    const recent = [...store.reference.values()]
      .filter((r) => r.ts).sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts)).slice(0, 8);
    // 14-day activity timeline from entity timestamps (real series for charts).
    const DAY = 86400000, today = new Date(); today.setHours(0,0,0,0);
    const days = []; for (let i = 13; i >= 0; i--) days.push(new Date(today.getTime() - i*DAY));
    const bucket = Object.fromEntries(days.map(d => [d.toISOString().slice(0,10), 0]));
    for (const t of Object.keys(store)) for (const r of store[t].values()) {
      const ms = Date.parse(r.ts || r.createdAt || r.date); if (Number.isNaN(ms)) continue;
      const key = new Date(ms).toISOString().slice(0,10);
      if (key in bucket) bucket[key] += 1;
    }
    c.timeline = days.map(d => { const k = d.toISOString().slice(0,10); return { date: k, count: bucket[k] }; });
    c.byStatus = status; c.byPriority = priority; c.byAssignee = assignee;
    c.overdue = { count: overdue.length, items: overdue.slice(0, 12) };
    c.recent = recent;
    return c;
  },
  /** Insert/update one record; reindex; notify dependent lenses + the Reference. */
  upsert(type, record) {
    if (!store[type]) return null;
    const rec = index(type, { ...record });
    Bus.emit(`entity:${type}:changed`, { id: rec.__id, ref: rec.__ref });
    if (rec.__ref) Bus.emit('entity:reference:updated', { ref: rec.__ref, type });
    Bus.emit('entity:changed', { type, id: rec.__id, ref: rec.__ref });
    Bus.emit('entity:update', { type, id: rec.__id, ref: rec.__ref });  // §2 event contract alias
    return rec;
  },
  subscribe(typeOrAll, fn) {
    const ev = typeOrAll === '*' ? 'entity:changed' : `entity:${typeOrAll}:changed`;
    return Bus.on(ev, fn);
  }
};
export default Entities;
