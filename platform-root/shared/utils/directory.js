/** OBSIDIAN v4.0 — shared/utils/directory.js · Platform.Directory · directorate email/identity resolver.
 *  The authoritative directorate dataset is the live Reference_Data flow (Platform.Lookups.departments()),
 *  whose option rows carry the raw NITDA Organizational Units record: { DSU_KEY, DSU_Email, DSU_HeadEmail,
 *  DSU_HeadTitle, Title, ... }. This util resolves a DSU_KEY to its functional routing addresses and powers
 *  (a) Phase-5 Dispatch recipient resolution (Directive 1 — recipientAddress ⇐ DSU_Email | DSU_HeadEmail)
 *  and (b) the AI-assistant shorthand routing parser (Directive 5).
 *
 *  Keys are derived authoritatively from the endpoint; this module never hard-codes directorate emails.
 *  Static policy (isolation, elevation, shorthand aliases) lives in config/directorate.config.js. */
import { DSU_ALIASES, isIsolatedDirectorate, isElevatedDsuKey } from '../../config/directorate.config.js';

const _norm = (v) => (v == null ? '' : String(v).trim());
const _key = (v) => _norm(v).toUpperCase();

/** Raw department rows from the live Reference_Data option-set (or FETCH_ALL fallback, per Lookups). */
function deptRows() {
  const L = globalThis.Platform && globalThis.Platform.Lookups;
  if (!L || typeof L.departments !== 'function') return [];
  const rows = L.departments();
  return Array.isArray(rows) ? rows : [];
}

/** Build a DSU_KEY(upper) → raw-record index from the live department option-set. Rebuilt per call so it
 *  always reflects the latest loaded Reference_Data (the option-set is itself cached by Lookups). */
function index() {
  const idx = new Map();
  for (const o of deptRows()) {
    const raw = (o && o.raw) || o;
    if (!raw || typeof raw !== 'object') continue;
    const k = _key(raw.DSU_KEY ?? o.value);
    if (k && !idx.has(k)) idx.set(k, raw);
  }
  return idx;
}

export const Directory = {
  /** True once the live department option-set has any rows. */
  isLoaded() { return deptRows().length > 0; },

  /** All known DSU_KEYs (verbatim casing from Reference_Data). */
  keys() {
    const out = [];
    for (const o of deptRows()) { const raw = (o && o.raw) || o; const k = raw && (raw.DSU_KEY ?? o.value); if (k) out.push(_norm(k)); }
    return out;
  },

  /** Resolve a DSU_KEY (or a shorthand alias) to its directorate identity + routing addresses.
   *  Returns null when the key is unknown to the live directory. */
  resolve(dsuKey) {
    if (dsuKey == null || _norm(dsuKey) === '') return null;
    let k = _key(dsuKey);
    if (!index().has(k)) {                       // try alias resolution (shorthand → DSU_KEY)
      const alias = DSU_ALIASES[_norm(dsuKey).toLowerCase()];
      if (alias) k = _key(alias);
    }
    const raw = index().get(k);
    if (!raw) return null;
    return Object.freeze({
      key: _norm(raw.DSU_KEY) || k,
      title: _norm(raw.Title) || _norm(raw.DSU_KEY) || k,
      email: _norm(raw.DSU_Email) || null,
      headEmail: _norm(raw.DSU_HeadEmail) || null,
      headPersonalEmail: _norm(raw['DSU_Head Personal_Email'] ?? raw.DSU_HeadPersonalEmail) || null,
      headTitle: _norm(raw.DSU_HeadTitle) || null,
      isolated: isIsolatedDirectorate(raw.DSU_KEY),
      elevated: isElevatedDsuKey(raw.DSU_KEY),
      raw
    });
  },

  /** Phase-5 routing target (Directive 1). Resolves the functional recipient address for a directorate:
   *  the directorate functional mailbox (DSU_Email) by default, or the directorate head (DSU_HeadEmail)
   *  when preferHead is set or no functional mailbox exists. Returns null when unresolvable. */
  recipientFor(dsuKey, { preferHead = false } = {}) {
    const d = this.resolve(dsuKey);
    if (!d) return null;
    const primary = preferHead ? (d.headEmail || d.email) : (d.email || d.headEmail);
    return primary || d.headPersonalEmail || null;
  },

  /** Directive 5 — translate shorthand department text in a free-text prompt into ordered routing
   *  metadata. Scans for DSU_KEY tokens (and configured aliases) present in the LIVE directory, in order
   *  of appearance (so "Send draft to CCMR and then ITPCU" yields [CCMR, ITPCU] in sequence). Each hit
   *  carries the resolved routing addresses. Returns [] when nothing matches. */
  parsePrompt(text) {
    const s = _norm(text);
    if (!s) return [];
    const hits = [];                 // { pos, key }
    const seen = new Set();
    const consider = (matchStr, key) => {
      const d = this.resolve(key);
      if (!d || seen.has(d.key.toUpperCase())) return;
      const re = new RegExp('\\b' + matchStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      const m = re.exec(s);
      if (m) { hits.push({ pos: m.index, dir: d }); seen.add(d.key.toUpperCase()); }
    };
    for (const key of this.keys()) consider(key, key);                 // exact DSU_KEY tokens
    for (const alias of Object.keys(DSU_ALIASES)) consider(alias, DSU_ALIASES[alias]); // shorthand aliases
    hits.sort((a, b) => a.pos - b.pos);
    return hits.map((h, i) => ({
      sequence: i + 1, key: h.dir.key, title: h.dir.title,
      email: h.dir.email, headEmail: h.dir.headEmail,
      recipientAddress: h.dir.email || h.dir.headEmail || h.dir.headPersonalEmail || null,
      isolated: h.dir.isolated
    }));
  }
};

export default Directory;
