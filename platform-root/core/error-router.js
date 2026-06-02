/** OBSIDIAN v4.0 — error-router.js · the canonical kind → UI behaviour map (register A-10 / S1).
 *  Consumes the machine-readable `result.errorKind` attached by core/api.js and routes each failure
 *  to its locked behaviour: re-auth prompts, OTP-modal mount requests, and danger/warning toasts with
 *  the correct aria-live urgency. UI.toastError delegates here at runtime (no static import cycle:
 *  this module imports UI, ui.js only reaches ErrorRouter via globalThis.Platform). */
import { Bus } from './bus.js';
import { UI } from './ui.js';

function t(key, vars) { return globalThis.Platform?.I18n?.t ? globalThis.Platform.I18n.t(key, vars) : key; }

/** The 13-row taxonomy. variant drives toast colour + aria-live (danger ⇒ assertive in pf-toast).
 *  behaviour fires a canonical side-effect event; suppress hides the toast (handled elsewhere). */
const TAXONOMY = {
  OK:                   { variant: 'success', i18nKey: null,                     behaviour: null,    retryable: false, suppress: true },
  AUTH_FAILED:          { variant: 'danger',  i18nKey: 'error.auth.failed',      behaviour: 'auth',  retryable: false },
  OTP_REQUIRED:         { variant: 'info',    i18nKey: 'otp.required',           behaviour: 'otp',   retryable: false },
  OTP_INVALID:          { variant: 'danger',  i18nKey: 'otp.invalid',            behaviour: null,    retryable: true },
  OTP_EXPIRED:          { variant: 'warning', i18nKey: 'otp.expired',            behaviour: null,    retryable: true },
  DIRECTORATE_MISMATCH: { variant: 'warning', i18nKey: 'error.directorate.mismatch', behaviour: null, retryable: false },
  RATE_LIMITED:         { variant: 'warning', i18nKey: 'error.rateLimited',      behaviour: 'rate',  retryable: true },
  VALIDATION_FAILED:    { variant: 'warning', i18nKey: 'error.validation',       behaviour: null,    retryable: true },
  NOT_AUTHORIZED:       { variant: 'danger',  i18nKey: 'error.notAuthorized',    behaviour: 'denied', retryable: false },
  DISPATCH_FAILED:      { variant: 'danger',  i18nKey: 'dispatch.failed',        behaviour: null,    retryable: true },
  CONFLICT_IDEMPOTENT:  { variant: 'info',    i18nKey: 'info.alreadyApplied',    behaviour: null,    retryable: false },
  UPSTREAM_TIMEOUT:     { variant: 'warning', i18nKey: 'error.timeout',          behaviour: null,    retryable: true },
  INTERNAL_ERROR:       { variant: 'danger',  i18nKey: 'error.internal',         behaviour: null,    retryable: false }
};

function entryFor(kind) { return TAXONOMY[kind] || TAXONOMY.INTERNAL_ERROR; }

export const ErrorRouter = {
  TAXONOMY,
  /** Look up the taxonomy entry for a normalized API result (or a raw kind string).
   *  Unknown kinds normalize to INTERNAL_ERROR so callers never branch on an unmapped label. */
  classify(resultOrKind) {
    const raw = typeof resultOrKind === 'string' ? resultOrKind : (resultOrKind && resultOrKind.errorKind);
    const kind = (raw && TAXONOMY[raw]) ? raw : 'INTERNAL_ERROR';
    return { kind, ...entryFor(kind) };
  },

  /** Route a failed API result to its canonical UI behaviour. Returns the toast id (or null). */
  handle(result) {
    if (!result || result.ok) return null;
    const kind = result.errorKind || 'INTERNAL_ERROR';
    const e = entryFor(kind);

    // Canonical side-effects (the UI shell / flows subscribe to these).
    if (e.behaviour === 'auth')   Bus.emit('auth:required', { result, ts: new Date().toISOString() });
    if (e.behaviour === 'otp')    Bus.emit('otp:required', { result, ts: new Date().toISOString() });
    if (e.behaviour === 'rate')   Bus.emit('rate:limited', { retryAfter: result.retryAfter || null });
    if (e.behaviour === 'denied') Bus.emit('audit:unauthorized-access-attempt', {
      persona: (globalThis.Platform?.Persona?.current && globalThis.Platform.Persona.current()) || null,
      action: (result.errors && result.errors[0] && result.errors[0].code) || 'api', ts: new Date().toISOString() });

    if (e.suppress || !e.i18nKey) return null;

    const detail = (Array.isArray(result.errors) && result.errors[0] && result.errors[0].message) || '';
    const base = t(e.i18nKey);
    const text = detail && detail !== base ? base + ' — ' + detail : base;
    const timeout = (kind === 'RATE_LIMITED' && result.retryAfter)
      ? Math.min(Math.max(result.retryAfter * 1000, 5000), 30000)
      : (e.variant === 'danger' ? 7000 : 5500);
    return UI.toast({ message: text, variant: e.variant, timeout });
  },

  /** Subscribe to the global error bus so uncaught platform errors also route through the taxonomy. */
  install() {
    Bus.on('platform:error', (result) => { try { ErrorRouter.handle(result); } catch (_) { /* never throw from a handler */ } });
    return ErrorRouter;
  }
};

export default ErrorRouter;
