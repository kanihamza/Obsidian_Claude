/** OBSIDIAN v4.0 — module 'assistant' (Operations · ACTION · audience:all).
 *  Live AI assistant over AI_CHAT (shared/utils/ai.js). Conversation state is held per session;
 *  each turn sends the full history to the flow and renders the reply. No placeholder content. */
import { BaseModule } from '../../core/base-module.js';
import { Modules } from '../../core/modules-registry.js';
import { el, clear } from '../../shared/utils/dom.js';
import { AI } from '../../shared/utils/ai.js';

class AssistantModule extends BaseModule {
  static id = 'assistant'; static label = 'module.assistant.title'; static icon = 'message-circle';
  static nav = { group: 'CrossPhase', order: 4 }; static audience = 'all'; static status = 'active';
  static base = new URL('.', import.meta.url);

  async onVisible(root) {
    this._messages = this._messages || [];
    this._log = root.querySelector('[data-region="log"]');
    const form = root.querySelector('[data-region="composer"]');
    if (!form) return;
    clear(form);
    this._input = el('textarea', { class: 'pf-asst__input', rows: '2', 'aria-label': this.t('assistant.inputAria'),
      placeholder: this.t('assistant.placeholder') });
    const send = el('button', { class: 'pf-btn pf-btn--primary', type: 'button', text: this.t('assistant.send') });
    this.on(send, 'click', () => this._send());
    this.on(this._input, 'keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); this._send(); } });
    form.append(this._input, send);
    this._paint();
  }

  _paint() {
    if (!this._log) return;
    clear(this._log);
    if (!this._messages.length) {
      this._log.append(el('p', { class: 'pf-muted pf-asst__empty', text: this.t('assistant.empty') }));
      return;
    }
    this._messages.forEach((m) => {
      this._log.append(el('div', { class: 'pf-asst__msg pf-asst__msg--' + (m.role === 'user' ? 'user' : 'ai') }, [
        el('span', { class: 'pf-asst__role', text: this.t(m.role === 'user' ? 'assistant.you' : 'assistant.ai') }),
        el('div', { class: 'pf-asst__body', text: m.content })
      ]));
    });
    this._log.scrollTop = this._log.scrollHeight;
  }

  async _send() {
    const text = (this._input.value || '').trim();
    if (!text) return;
    this._messages.push({ role: 'user', content: text });
    this._input.value = ''; this._paint();
    // Directive 5 — ground the prompt: parse shorthand department text (e.g. "Send draft to CCMR and
    // then ITPCU") into ordered electronic routing metadata against the LIVE DSU_KEY directory before the
    // turn executes, surface the detected routing in the workspace, and attach it to the AI payload so the
    // flow receives resolved targets, not free text.
    const P = globalThis.Platform || {};
    const routing = (P.Directory && typeof P.Directory.parsePrompt === 'function') ? P.Directory.parsePrompt(text) : [];
    if (routing.length) this._renderRouting(routing);
    const pending = el('div', { class: 'pf-asst__msg pf-asst__msg--ai pf-asst__pending', text: this.t('assistant.thinking') });
    this._log.append(pending); this._log.scrollTop = this._log.scrollHeight;
    // K-8b — stamp the active directorate scope + identity onto every AI payload so the flow has the
    // telemetry to enforce role-based compliance. Scope is read from the sealed Context getter; the
    // assistant never reaches the fabric directly.
    const scope = {
      directorate: (P.Context && P.Context.directorate && P.Context.directorate()) || 'all',
      persona: (P.Persona && P.Persona.current && P.Persona.current()) || null,
      userEmail: (P.Persona && P.Persona.email && P.Persona.email()) || null
    };
    const res = await this.call(() => AI.chat(this._messages, { scope, ...scope, ...(routing.length ? { routing } : {}) }));
    pending.remove();
    const reply = res.ok ? (AI.summaryOf(res) || this.t('assistant.noReply')) : this.t('assistant.failed');
    this._messages.push({ role: 'assistant', content: reply });
    this._paint();
    if (routing.length) this._renderRouting(routing);   // re-attach after _paint() rebuilds the log
  }

  /** Render the parsed routing targets as an ordered chip row in the workspace (Directive 5). Each chip
   *  shows the directorate key/title and its resolved recipient address. */
  _renderRouting(routing) {
    if (!this._log || !routing || !routing.length) return;
    const row = el('div', { class: 'pf-asst__routing' }, [
      el('span', { class: 'pf-overline', text: this.t('assistant.routingDetected') }),
      ...routing.map((r) => el('span', {
        class: 'pf-badge pf-badge--routed pf-asst__route',
        title: r.recipientAddress || '',
        text: `${r.sequence}. ${r.key}${r.recipientAddress ? ' → ' + r.recipientAddress : ''}`
      }))
    ]);
    this._log.append(row); this._log.scrollTop = this._log.scrollHeight;
  }
}
Modules.register(AssistantModule);
export default AssistantModule;
