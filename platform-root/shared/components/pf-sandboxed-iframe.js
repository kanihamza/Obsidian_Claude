/** OBSIDIAN v4.0 — <pf-sandboxed-iframe> · safely render untrusted HTML in a sandboxed iframe.
 *  Used primarily for email bodies (where the content may include external links, inline styles,
 *  and even malformed HTML). The iframe uses `sandbox` with no `allow-same-origin` so scripts
 *  cannot read cookies / localStorage / parent DOM, and external resources are loaded in an
 *  isolated origin context.
 *
 *  Properties:
 *    html             string — the raw HTML to render
 *    text             string — plain text fallback if html is empty
 *    maxHeight        number — px cap; iframe auto-grows up to this (default 480)
 *    allowLinks       boolean (default true) — anchor clicks open in a new tab via target=_blank
 *
 *  Mirrors the SPA pattern (`buildSandboxSrcdoc` / `sanitizeHtmlForIframe`). */
import { PfBaseElement } from './_base.js';

const STRIP_TAGS = /<\s*(script|object|embed|iframe|frame|frameset|applet|meta\s+http-equiv)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;
const STRIP_VOID = /<\s*(script|object|embed|iframe|frame|frameset|applet|meta\s+http-equiv|link)[^>]*>/gi;
const STRIP_ON_HANDLERS = /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const STRIP_JS_HREF = /\s(href|src|action|formaction)\s*=\s*("\s*javascript:[^"]*"|'\s*javascript:[^']*'|javascript:[^\s>]+)/gi;

function sanitize(html) {
  if (!html) return '';
  let h = String(html);
  // Strip <script>/<object>/<iframe>/etc. paired and void forms
  h = h.replace(STRIP_TAGS, '').replace(STRIP_VOID, '');
  // Strip on* event handlers
  h = h.replace(STRIP_ON_HANDLERS, '');
  // Strip javascript: URLs in href/src/action/formaction
  h = h.replace(STRIP_JS_HREF, ' $1="#"');
  return h;
}

class PfSandboxedIframe extends PfBaseElement {
  set html(v) { this._html = String(v || ''); if (this.shadowRoot) this._render(); }
  set text(v) { this._text = String(v || ''); if (this.shadowRoot) this._render(); }
  set maxHeight(v) { this._maxH = Math.max(120, Number(v) || 480); if (this.shadowRoot) this._render(); }
  set allowLinks(v) { this._allowLinks = v !== false; }
  set cidMap(v) { this._cidMap = v && typeof v === 'object' ? v : {}; if (this.shadowRoot) this._render(); }
  get html() { return this._html || ''; }

  onConnect() {
    this._html = this.getAttribute('html') || '';
    this._text = this.getAttribute('text') || '';
    this._maxH = Number(this.getAttribute('max-height')) || 480;
    this._allowLinks = this.getAttribute('allow-links') !== 'false';
    this._cidMap = {};
    this.render(`<style>
      :host{ display:block; }
      .wrap{ border:1px solid var(--color-border); border-radius:var(--radius-sm);
        background:var(--color-surface); overflow:hidden; position:relative; }
      .meta{ display:flex; align-items:center; gap:var(--space-2); padding:var(--space-2) var(--space-3);
        background:var(--color-surface-sunken); border-bottom:1px solid var(--color-border);
        font-size:var(--size-caption); color:var(--color-text-muted); }
      .meta .badge{ font-weight:var(--fw-semibold); }
      iframe{ width:100%; min-height:120px; border:0; display:block; 
        transition:height var(--duration-base) var(--easing-standard); }
      .plain{ padding:var(--space-3) var(--space-4); white-space:pre-wrap; font-family:inherit;
        font-size:var(--size-body-sm); color:var(--color-text); }
      .empty{ padding:var(--space-4); text-align:center; color:var(--color-text-muted); font-size:var(--size-caption); }
    </style>
    <div class="wrap">
      <div class="meta"><span class="badge">⚠ ${this.t('email.sandboxed')}</span><span>${this.t('email.sandboxedHint')}</span></div>
      <div id="body"></div>
    </div>`);
    this._body = this.$('#body');
    this._render();
  }

  _render() {
    if (!this._body) return;
    this._body.innerHTML = '';
    if (this._html && this._html.trim()) {
      let sanitized = sanitize(this._html);
      // cid: substitution — replace src="cid:NAME" / src='cid:NAME' / src=cid:NAME with a data URI
      // from cidMap. Unknown cid refs are left intact (browser will show broken image which is
      // expected — the SPA fix is to attach the cid->dataUri map when rendering the email body).
      if (this._cidMap && Object.keys(this._cidMap).length) {
        sanitized = sanitized.replace(/src\s*=\s*(["'])cid:([^"'\s>]+)\1/gi, (m, q, name) => {
          const v = this._cidMap[name] || this._cidMap[name.toLowerCase()];
          return v ? `src=${q}${v}${q}` : m;
        });
        sanitized = sanitized.replace(/src\s*=\s*cid:([^\s>]+)/gi, (m, name) => {
          const v = this._cidMap[name] || this._cidMap[name.toLowerCase()];
          return v ? `src="${v}"` : m;
        });
      }
      const target = this._allowLinks ? '<base target="_blank">' : '';
      const srcdoc = `<!doctype html><html><head>${target}<meta charset="utf-8"><style>
        body{ font-family: system-ui, -apple-system, sans-serif; font-size:14px;
          color:rgb(34,34,34); line-height:1.5; margin:12px; word-wrap:break-word; }
        img,table{ max-width:100%; height:auto; }
        table{ border-collapse:collapse; }
        a{ color:rgb(5,88,59); }
        blockquote{ border-left:3px solid rgb(204,204,204); margin:8px 0; padding-left:12px; color:rgb(85,85,85); }
      </style></head><body>${sanitized}</body></html>`;
      const f = document.createElement('iframe');
      f.setAttribute('sandbox', 'allow-popups');  // no allow-same-origin → no cookies/storage access
      f.setAttribute('referrerpolicy', 'no-referrer');
      f.setAttribute('loading', 'lazy');
      f.srcdoc = srcdoc;
      f.style.height = '320px'; f.style.maxHeight = this._maxH + 'px';
      f.style.background = 'rgb(255,255,255)';
      // Auto-size iframe to its content (with a max-height cap)
      f.addEventListener('load', () => {
        try {
          const d = f.contentDocument; if (!d || !d.body) return;
          const h = Math.min(d.body.scrollHeight + 24, this._maxH);
          f.style.height = h + 'px';
        } catch (_) { /* cross-origin — fine, just use default */ }
      });
      this._body.appendChild(f);
    } else if (this._text) {
      this._body.appendChild(this._mkText(this._text));
    } else {
      this._body.appendChild(this._mkEmpty());
    }
  }
  _mkText(txt) { const d = document.createElement('div'); d.className = 'plain'; d.textContent = txt; return d; }
  _mkEmpty() { const d = document.createElement('div'); d.className = 'empty'; d.textContent = this.t('email.noBody'); return d; }
}
customElements.define('pf-sandboxed-iframe', PfSandboxedIframe);
export default PfSandboxedIframe;
