/** OBSIDIAN v4.0 — shared/utils/reviewers.js · Platform.Reviewers · sequential reviewer engine (Q-7).
 *  Directive 3: reviewers are a strictly ordered array of functional signature blocks carried inside the
 *  transaction envelope:
 *
 *    reviewers: [{ sequence: 1, userId: "USR-042", role: "Director", targetEmail: "DCS@nitda.gov.ng",
 *                  status: "approved" }, ...]
 *
 *  The status engine processes them sequentially: the active approval token may only advance to position
 *  N+1 once position N records an authentic, verified approval event. This module is the pure engine that
 *  the REVIEW surfaces and the approval transaction envelope use to (a) find the active reviewer,
 *  (b) gate whether a given position is allowed to act, and (c) advance the chain on a verified decision.
 *  It never reaches the fabric; callers persist the returned array. */

/** Canonical reviewer-status vocabulary for a signature block (distinct from the record's lifecycle
 *  status tokens). A block is "resolved" once it is approved/rejected/returned. */
export const REVIEWER_STATUS = Object.freeze(['pending', 'active', 'approved', 'rejected', 'returned']);
const APPROVED = 'approved';
const RESOLVED = new Set(['approved', 'rejected', 'returned']);
const TERMINAL_REJECT = new Set(['rejected', 'returned']);

const _norm = (v) => (v == null ? '' : String(v).trim());

/** Coerce/normalize a raw reviewers array into the canonical ordered signature-block shape. Tolerant of
 *  aliases (userId/UserId/id, targetEmail/email, role/Role, status/Status). Stable-sorted by `sequence`
 *  (falling back to array order when sequence is absent), then re-sequenced 1..N so the contract holds. */
export function normalize(reviewers) {
  if (!Array.isArray(reviewers)) return [];
  const blocks = reviewers
    .map((r, i) => {
      if (!r || typeof r !== 'object') return null;
      const seq = Number(r.sequence ?? r.Sequence ?? r.order ?? r.Order);
      return {
        _idx: i,
        sequence: Number.isFinite(seq) ? seq : (i + 1),
        userId: _norm(r.userId ?? r.UserId ?? r.id ?? r.ID) || null,
        role: _norm(r.role ?? r.Role) || null,
        targetEmail: _norm(r.targetEmail ?? r.email ?? r.Email ?? r.TargetEmail) || null,
        status: (REVIEWER_STATUS.includes(_norm(r.status ?? r.Status).toLowerCase()) ? _norm(r.status ?? r.Status).toLowerCase() : 'pending'),
        decidedAt: _norm(r.decidedAt ?? r.DecidedAt) || null,
        comment: _norm(r.comment ?? r.Comment) || null
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a.sequence - b.sequence) || (a._idx - b._idx))
    .map((b, i) => { const { _idx, ...rest } = b; return { ...rest, sequence: i + 1 }; });
  return blocks;
}

/** True once a prior block rejected/returned — the chain is broken and cannot advance. */
export function isBroken(reviewers) {
  return normalize(reviewers).some((b) => TERMINAL_REJECT.has(b.status));
}

/** Index (0-based) of the active reviewer: the first not-yet-approved block, provided every prior block
 *  is approved. Returns -1 when the chain is complete or broken. */
export function activeIndex(reviewers) {
  const blocks = normalize(reviewers);
  for (let i = 0; i < blocks.length; i++) {
    if (TERMINAL_REJECT.has(blocks[i].status)) return -1;   // broken chain — nobody is active
    if (blocks[i].status !== APPROVED) return i;            // first unapproved with all-prior approved
  }
  return -1;                                                // all approved → complete
}

/** The active reviewer block (or null when complete/broken). */
export function active(reviewers) {
  const i = activeIndex(reviewers);
  return i < 0 ? null : normalize(reviewers)[i];
}

/** May the block at `sequence` (1-based) act now? Only the active position can — i.e. all strictly
 *  prior positions are approved and this one is not yet resolved. */
export function canAct(reviewers, sequence) {
  const i = activeIndex(reviewers);
  if (i < 0) return false;
  return normalize(reviewers)[i].sequence === Number(sequence);
}

/** Record a verified decision at `sequence`. Enforces the sequential invariant: the decision is only
 *  applied when `sequence` is the active position (Directive 3). Returns { ok, reviewers, complete,
 *  broken, error }. `decision` ∈ approve | reject | return. On approve the token advances to N+1; on
 *  reject/return the chain breaks and the record returns to the author (caller handles the lifecycle). */
export function advance(reviewers, sequence, decision, meta = {}) {
  const blocks = normalize(reviewers);
  if (!blocks.length) return { ok: false, error: 'NO_REVIEWERS', reviewers: blocks, complete: false, broken: false };
  if (!canAct(blocks, sequence)) {
    return { ok: false, error: 'NOT_ACTIVE_POSITION', reviewers: blocks, complete: false, broken: isBroken(blocks) };
  }
  const map = { approve: 'approved', approved: 'approved', reject: 'rejected', rejected: 'rejected', return: 'returned', returned: 'returned' };
  const next = map[String(decision || '').toLowerCase()];
  if (!next) return { ok: false, error: 'INVALID_DECISION', reviewers: blocks, complete: false, broken: false };
  const out = blocks.map((b) => (b.sequence === Number(sequence)
    ? { ...b, status: next, decidedAt: new Date().toISOString(), comment: _norm(meta.comment) || b.comment }
    : b));
  const broken = out.some((b) => TERMINAL_REJECT.has(b.status));
  const complete = !broken && out.every((b) => b.status === APPROVED);
  return { ok: true, reviewers: out, complete, broken, active: active(out) };
}

/** Validate an envelope's reviewers array against the contract (explicit sequences contiguous 1..N,
 *  required identity present). Validates the RAW input (not the normalized form, which would re-sequence
 *  and mask malformed input). Returns { ok, errors[] }. Empty/absent reviewers is valid (single-approver
 *  flow). */
export function validate(reviewers) {
  if (reviewers == null) return { ok: true, errors: [] };
  if (!Array.isArray(reviewers)) return { ok: false, errors: ['reviewers must be an array'] };
  const errors = [];
  const seqs = [];
  reviewers.forEach((r, i) => {
    if (!r || typeof r !== 'object') { errors.push(`reviewer at index ${i} is not an object`); return; }
    const rawSeq = r.sequence ?? r.Sequence ?? r.order ?? r.Order;
    const seq = Number(rawSeq);
    if (rawSeq != null && !Number.isFinite(seq)) errors.push(`reviewer at index ${i} has a non-numeric sequence`);
    if (Number.isFinite(seq)) seqs.push(seq);
    const email = r.targetEmail ?? r.email ?? r.Email ?? r.TargetEmail;
    const uid = r.userId ?? r.UserId ?? r.id ?? r.ID;
    if (!email && !uid) errors.push(`reviewer at index ${i} needs a userId or targetEmail`);
  });
  // When every block carries an explicit sequence, they must form a contiguous 1..N set.
  if (seqs.length && seqs.length === reviewers.length) {
    [...seqs].sort((a, b) => a - b).forEach((s, idx) => { if (s !== idx + 1) errors.push(`sequence ${s} breaks 1..N contiguity`); });
  }
  return { ok: errors.length === 0, errors };
}

export const Reviewers = { REVIEWER_STATUS, normalize, isBroken, activeIndex, active, canAct, advance, validate };
export default Reviewers;
