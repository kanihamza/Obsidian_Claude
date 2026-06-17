/** OBSIDIAN v4.0 — entities.config.js · the shared domain model (integration spine).
 *  The platform is ONE Reference-keyed fabric; modules are lenses/aggregators over it,
 *  not silos. The Reference (RefIDD/RefID/referenceId) is the universal join key. */

export const REFERENCE_KEY = 'referenceId';
export const REF_ALT_KEYS = [
  'referenceId', 'RefIDD', 'RefID', 'ReferenceID', 'ReferenceId', 'Reference_ID',
  'reference', 'Reference', 'ref', 'refId', 'ReferenceNo'
];

/** Entity types hydrated from canonical endpoints and indexed by Reference. */
export const ENTITY_TYPES = {
  reference: { idField: 'referenceId', altKeys: REF_ALT_KEYS, labelKey: 'entity.reference', spine: true },
  document:  { idField: 'id', altKeys: ['id', 'ID', 'docId', 'DocId', 'DocID', 'documentId', 'DocumentId', 'DocumentID', 'Document_ID'], ref: true, labelKey: 'entity.document' },
  task:      { idField: 'id', altKeys: ['id', 'ID', 'taskId', 'TaskId', 'TaskID', 'Task_ID', 'createdTaskId', 'CreatedTaskId', 'CreatedTaskID'], ref: true, labelKey: 'entity.task' },
  email:     { idField: 'id', altKeys: ['id', 'ID', 'emailId', 'EmailId', 'EmailID', 'Email_ID', 'messageId', 'MessageId', 'MessageID'], ref: true, labelKey: 'entity.email' },
  approval:  { idField: 'id', altKeys: ['id', 'ID', 'approvalId', 'ApprovalId', 'ApprovalID', 'Approval_ID'], ref: true, labelKey: 'entity.approval' },
  comment:   { idField: 'id', altKeys: ['id', 'ID', 'commentId', 'CommentId', 'CommentID', 'Comment_ID'], ref: true, labelKey: 'entity.comment' },
  activity:  { idField: 'id', altKeys: ['id', 'ID', 'activityId', 'ActivityId', 'ActivityID', 'Activity_ID'], ref: true, labelKey: 'entity.activity' }
};

/** Reference 1—* everything. Used by Entities.byReference() to assemble related bundles. */
export const RELATIONSHIPS = {
  reference: ['document', 'task', 'email', 'approval', 'comment', 'activity']
};

/**
 * Module roles in the integrated platform:
 *  - lens: operates on individual entities, may set the active Reference + cross-link.
 *  - aggregator: reads rollups (counts/series) over the whole fabric; never re-fetches per-row.
 */
export const MODULE_ROLES = {
  'ops-hub': 'lens', correspondence: 'lens', approvals: 'lens', comments: 'lens',
  'response-tracking': 'lens', registry: 'lens', fasttrack: 'lens',
  'single-item-ops': 'lens', 'bulk-assignment': 'lens', orchestrator: 'lens',
  dispatch: 'lens',
  home: 'aggregator', executive: 'aggregator', stats: 'aggregator',
  reports: 'aggregator', diagnostics: 'system'
};

/** Which lens a given entity type opens in (for cross-module deep-linking). */
export const ENTITY_HOME_MODULE = {
  document: 'ops-hub', task: 'orchestrator', email: 'correspondence',
  approval: 'approvals', comment: 'comments', activity: 'fasttrack', reference: 'response-tracking'
};

/** Q-7 — Sequential reviewer configuration schema (Directive 3). Reviewers are carried in the approval/
 *  dispatch transaction envelope as a strictly ordered array of functional signature blocks. The status
 *  engine (shared/utils/reviewers.js → Platform.Reviewers) advances the active token to position N+1 only
 *  once position N records a verified approval. This export is the authoritative field contract for that
 *  block; it is documentation-grade (the engine normalizes tolerant aliases at runtime). */
export const REVIEWER_BLOCK_SCHEMA = Object.freeze({
  sequence:    { type: 'number', required: true, note: '1-based ordinal; contiguous 1..N' },
  userId:      { type: 'string', required: false, note: 'reviewer user id (e.g. USR-042)' },
  role:        { type: 'string', required: false, note: 'functional role (e.g. Director)' },
  targetEmail: { type: 'string', required: false, note: 'routing address (e.g. DCS@nitda.gov.ng)' },
  status:      { type: 'enum', values: ['pending', 'active', 'approved', 'rejected', 'returned'], required: true, default: 'pending' }
});
