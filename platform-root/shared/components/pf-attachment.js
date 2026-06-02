/** OBSIDIAN v4.0 — <pf-attachment> · attachment chips with optional inline preview.
 *  Usage:  el.emailId = 'EML-1'           // self-loads via FETCH_EMAIL_ATTACHMENTS
 *     or:  el.items = [{name,size,type,url}]   // render provided list directly
 *
 *  Click a chip → inline preview opens below the chip list:
 *   - images (jpg/png/gif/webp/svg) → <img> inline
 *   - PDF → <iframe sandbox> preview (browser-native PDF viewer)
 *   - text (txt/csv/log/md) → fetched + shown as <pre>
 *   - other → "Open in new tab" link
 *
 *  Token-driven; no hex. Degrades to chip-only when offline / no attachments. */
import { PfBaseElement } from './_base.js';
import { BaseService } from '../../core/base-service.js';

const fetchAttachments = BaseService.endpoint('FETCH_EMAIL_ATTACHMENTS', { expectedKeys: ['ok', 'data'] });

function kb(n) { const v = Number(n); return Number.isFinite(v) && v > 0 ? `${Math.round(v / 1024)} KB` : ''; }
function extFromName(name) { const m = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/); return m ? m[1] : ''; }
const IMAGE_EXTS = new Set(['png','jpg','jpeg','gif','webp','svg','bmp','ico']);
const PDF_EXTS = new Set(['pdf']);
const TEXT_EXTS = new Set(['txt','csv','log','md','json','xml','yaml','yml','tsv']);

function kindOf(item) {
  const t = String(item.type || item.contentType || '').toLowerCase();
  const ext = extFromName(item.name || item.fileName || '');
  if (t.startsWith('image/') || IMAGE_EXTS.has(ext)) return 'image';
  if (t === 'application/pdf' || PDF_EXTS.has(ext)) return 'pdf';
  if (t.startsWith('text/') || TEXT_EXTS.has(ext)) return 'text';
  return 'other';
}
function iconFor(kind) {
  return kind === 'image' ? '🖼' : kind === 'pdf' ? '📄' : kind === 'text' ? '📝' : '📎';
}

class PfAttachment extends PfBaseElement {
  set items(v) { this._items = Array.isArray(v) ? v : []; this._preview = null; if (this.shadowRoot) this.paint(); }
  get items() { return this._items || []; }
  set emailId(v) { this._emailId = v; if (this.shadowRoot) this.load(); }

  onConnect() {
    this._items = [];
    this._preview = null;       // { item, kind } | null
    this._textCache = new Map(); // url -> text content (so re-opening a text file doesn't re-fetch)
    this.render(`<style>
      :host{ display:block; }
      .wrap{ display:flex; flex-wrap:wrap; gap:var(--space-2); }
      .chip{ display:inline-flex; align-items:center; gap:var(--space-2); padding:var(--space-1) var(--space-3);
        border:1px solid var(--color-border); border-radius:var(--radius-pill); background:var(--color-surface);
        font-size:var(--size-body-sm); color:var(--color-text); cursor:pointer; font:inherit; }
      .chip[data-active="1"]{ border-color:var(--color-brand-primary); background:color-mix(in srgb, var(--color-brand-primary) 8%, transparent); }
      .chip:hover{ border-color:var(--color-brand-primary); }
      .chip .sz{ color:var(--color-text-muted); font-size:var(--size-caption); }
      .empty,.loading{ color:var(--color-text-muted); font-size:var(--size-body-sm); }
      .preview{ margin-top:var(--space-3); border:1px solid var(--color-border); border-radius:var(--radius-sm);
        background:var(--color-surface); overflow:hidden; }
      .preview__head{ display:flex; align-items:center; gap:var(--space-2); padding:var(--space-2) var(--space-3);
        background:var(--color-surface-sunken); border-bottom:1px solid var(--color-border);
        font-size:var(--size-caption); color:var(--color-text-muted); }
      .preview__head strong{ color:var(--color-text); }
      .preview__close{ margin-left:auto; padding:2px var(--space-2); cursor:pointer; background:transparent;
        border:none; color:var(--color-text-muted); font:inherit; font-size:var(--size-body-md); }
      .preview__body{ padding:var(--space-3); max-height:560px; overflow:auto; }
      .preview__body img{ max-width:100%; height:auto; display:block; margin:0 auto; }
      .preview__body iframe{ width:100%; height:520px; border:0; }
      .preview__body pre{ margin:0; white-space:pre-wrap; font-family:ui-monospace,monospace;
        font-size:var(--size-body-sm); color:var(--color-text); }
      .preview__nodl{ color:var(--color-text-muted); font-size:var(--size-body-sm); }
    </style>
    <div class="wrap" id="wrap"></div>
    <div id="preview"></div>`);
    if (this._emailId) this.load(); else this.paint();
  }

  async load() {
    const wrap = this.$('#wrap'); if (!wrap) return;
    wrap.innerHTML = `<span class="loading">${this.t('attachment.loading')}</span>`;
    const res = await fetchAttachments({ emailId: this._emailId });
    const d = (res && res.data) || {};
    this._items = d.attachments || d.value || d.items || [];
    this.paint();
  }

  paint() {
    const wrap = this.$('#wrap'); if (!wrap) return;
    const items = this.items;
    wrap.innerHTML = '';
    if (!items.length) { wrap.innerHTML = `<span class="empty">${this.t('attachment.none')}</span>`; this._renderPreview(); return; }
    items.forEach((a) => {
      const name = a.name || a.fileName || a.title || 'file';
      const size = kb(a.size || a.sizeBytes);
      const kind = kindOf(a);
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.innerHTML = `<span>${iconFor(kind)} ${name}</span>${size ? `<span class="sz">${size}</span>` : ''}`;
      chip.addEventListener('click', () => this._openPreview(a, kind, chip));
      wrap.appendChild(chip);
    });
    this._renderPreview();
  }

  _openPreview(item, kind, chip) {
    // Toggle off if clicking the active chip
    if (this._preview && this._preview.item === item) { this._preview = null; }
    else { this._preview = { item, kind }; }
    // Mark active chip
    this.$('#wrap').querySelectorAll('.chip').forEach((c) => c.removeAttribute('data-active'));
    if (this._preview) chip.setAttribute('data-active', '1');
    this._renderPreview();
  }

  _renderPreview() {
    const host = this.$('#preview'); if (!host) return;
    host.innerHTML = '';
    if (!this._preview) return;
    const { item, kind } = this._preview;
    const name = item.name || item.fileName || 'file';
    const url = item.url;

    const head = document.createElement('div');
    head.className = 'preview__head';
    head.innerHTML = `<span>${iconFor(kind)}</span><strong></strong>`;
    head.querySelector('strong').textContent = name;
    const close = document.createElement('button');
    close.type = 'button'; close.className = 'preview__close';
    close.setAttribute('aria-label', this.t('common.actions.close'));
    close.textContent = '✕';
    close.addEventListener('click', () => { this._preview = null; this.paint(); });
    head.appendChild(close);

    const body = document.createElement('div');
    body.className = 'preview__body';

    if (!url) {
      body.innerHTML = `<p class="preview__nodl">${this.t('attachment.noUrl')}</p>`;
    } else if (kind === 'image') {
      const img = document.createElement('img');
      img.src = url; img.alt = name; img.loading = 'lazy';
      body.appendChild(img);
    } else if (kind === 'pdf') {
      const f = document.createElement('iframe');
      f.src = url; f.setAttribute('sandbox', 'allow-popups allow-scripts');
      f.setAttribute('referrerpolicy', 'no-referrer'); f.setAttribute('loading', 'lazy');
      f.title = name;
      body.appendChild(f);
    } else if (kind === 'text') {
      const pre = document.createElement('pre'); pre.textContent = this.t('attachment.loading');
      body.appendChild(pre);
      // Fetch text content (use cache when possible)
      if (this._textCache.has(url)) { pre.textContent = this._textCache.get(url); }
      else {
        fetch(url).then((r) => r.ok ? r.text() : Promise.reject(new Error('HTTP ' + r.status)))
          .then((txt) => { const safe = txt.slice(0, 200000); this._textCache.set(url, safe); pre.textContent = safe; })
          .catch((e) => { pre.textContent = this.t('attachment.fetchFailed') + ' (' + String(e.message) + ')'; });
      }
    } else {
      const link = document.createElement('a');
      link.href = url; link.target = '_blank'; link.rel = 'noopener';
      link.textContent = this.t('attachment.openExternal');
      body.appendChild(link);
    }

    const wrap = document.createElement('div'); wrap.className = 'preview';
    wrap.appendChild(head); wrap.appendChild(body);
    host.appendChild(wrap);
  }
}
customElements.define('pf-attachment', PfAttachment);
export { PfAttachment };
export default PfAttachment;
