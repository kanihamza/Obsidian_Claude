/** OBSIDIAN v4.0 — platform.js · composes window.Platform from the emitted core/config.
 *  Later batches attach Forms/Tables/Charts/Palette/Shortcuts/Observability via Platform.extend(). */
import { AppConfig } from '../config/app.config.js';
import { Endpoints } from '../config/endpoints.config.js';
import { FeatureFlags } from '../config/feature-flags.config.js';
import { PERSONAS } from '../config/personas.config.js';
import { StateSchema } from '../config/state.schema.js';
import { BRANDS } from '../config/brand.config.js';
import { RoutesConfig } from '../config/routes.config.js';

import { Log } from './log.js';
import { Bus } from './bus.js';
import { Storage } from './storage.js';
import { State } from './state.js';
import { Errors } from './errors.js';
import { Format } from './format.js';
import { A11y } from './a11y.js';
import { I18n } from './i18n.js';
import { API } from './api.js';
import { BaseService } from './base-service.js';
import { Modules } from './modules-registry.js';
import { Theme } from './theme-manager.js';
import { Brand } from './brand-manager.js';
import { Persona } from './persona-controller.js';
import { Router } from './router.js';
import { Nav } from './nav-controller.js';
import { UI } from './ui.js';
import { Lifecycle } from './lifecycle.js';
import { Entities } from './entity-store.js';
import { Context, goToEntity } from './context.js';
import { Idempotency } from './idempotency.js';
import { AuditLog } from './audit-log.js';
import { ErrorRouter } from './error-router.js';
import { Lookups } from '../shared/utils/lookups.js';   // U1: dropdown option-set provider (was never exposed on Platform)
import { DynamicActions } from '../shared/utils/dynamic-actions.js'; // universal channel for endpoint-less actions

const Platform = {
  Config:AppConfig, Endpoints, Flags:FeatureFlags, Routes:RoutesConfig,
  Personas:PERSONAS, StateSchema, BrandConfig:BRANDS,
  Log, Bus, Storage, State, Errors, Format, A11y, I18n,
  API, BaseService, Modules, Theme, Brand, Persona, Router, Nav, UI, Lifecycle,
  Entities, Context, goToEntity, Idempotency, AuditLog, ErrorRouter, Lookups, Actions:DynamicActions,
  extend(obj) { Object.assign(Platform, obj); return Platform; }
};
if (typeof window !== 'undefined') window.Platform = Platform;
// A-10 — route uncaught platform errors through the canonical taxonomy too.
ErrorRouter.install();


// Global keyboard shortcuts — install once at platform boot.
(function _installShortcuts() {
  if (typeof globalThis === 'undefined' || typeof globalThis.addEventListener !== 'function') return;
  if (globalThis.document) {
    let gPressed = false; let gTimer = null;
    const isTyping = (e) => {
      const t = e.target;
      if (!t || !t.tagName) return false;
      const tag = t.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable;
    };
    globalThis.document.addEventListener('keydown', (e) => {
      // '?' opens shortcuts cheatsheet
      if (!isTyping(e) && e.key === '?') { e.preventDefault(); Platform.UI?.openShortcuts?.(); return; }
      // '/' focuses lookup module's search if available
      if (!isTyping(e) && e.key === '/') {
        const lookupQ = globalThis.document.getElementById('lookup-q');
        if (lookupQ) { e.preventDefault(); lookupQ.focus(); return; }
      }
      // 'g' then letter → navigate
      if (!isTyping(e) && e.key === 'g' && !gPressed) {
        gPressed = true; if (gTimer) clearTimeout(gTimer);
        gTimer = setTimeout(() => { gPressed = false; }, 700);
        return;
      }
      if (!isTyping(e) && gPressed) {
        const TARGETS = { h:'home', o:'ops-hub', l:'lookup', r:'response-tracking', s:'settings', d:'diagnostics', c:'correspondence', a:'assignment' };
        const tgt = TARGETS[e.key.toLowerCase()];
        if (tgt) { e.preventDefault(); gPressed = false; Platform.Router?.navigate?.(tgt); return; }
      }
      // 'r' refresh fabric
      if (!isTyping(e) && e.key === 'r') {
        Platform.Entities?.bootstrap?.(true).catch(() => {});
        Platform.Lookups?.load?.(true).catch(() => {});
      }
      // 'n' open new assignment
      if (!isTyping(e) && e.key === 'n') {
        Platform.Router?.navigate?.('single-item-ops');
      }
    });
  }
})();

export default Platform;
export { Platform };
