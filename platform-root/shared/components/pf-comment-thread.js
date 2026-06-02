/** OBSIDIAN v4.0 — <pf-comment-thread> · threaded comment thread with reply / edit / delete.
 *  Consumed by the comments lens and the UI.openComments modal.
 *
 *  Properties (set via JS):
 *    el.items = [{author, role, ts, status, sentiment, priority, id|__id, body, parentId?}]
 *    el.reference = 'REF-1'
 *    el.currentUser = 'me@nitda.gov.ng'   // controls Edit/Delete visibility (own comments only)
 *
 *  Events:
 *    pf-comment:submit   {text, sentiment, priority, reference, parentId?}
 *    pf-comment:edit     {id, text}
 *    pf-comment:delete   {id}
 *
 *  Replies are indented under their parent (one-level — matches SPA shape; deeper threading
 *  collapses to "in reply to {parent author}"). All user content escaped via _escHtml. */
import { PfBaseElement } from './_base.js';

const STATUS = { pending:'pending', reviewed:'routed', resolved:'archived', open:'pending', closed:'archived' };
const SENTIMENT = { positive:'replied', negative:'action', neutral:'archived' };
const PRIORITY = { urgent:'action', high:'action', medium:'routed', low:'draft' };
const cls = (map, v) => map[String(v || '').toLowerCase()] || 'archived';
function _escHtml(v){ return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function _idOf(c) { return c.__id || c.id || c.commentId || ''; }
function _authorOf(c) { return c.author || c.by || c.user || ''; }
function _bodyOf(c) { return c.body || c.text || c.comment || ''; }
function _whenOf(c) {
  if (!c.ts) return '';
  return (globalThis.Platform?.Format?.dateTime) ? globalThis.Platform.Format.dateTime(c.ts) : c.ts;
}

class PfCommentThread extends PfBaseElement {
  set items(v) { this._items = Array.isArray(v) ? v : []; if (this.shadowRoot) this.paint(); }
  get items() { return this._items || []; }
  set reference(v) { this._ref = v; }
  set currentUser(v) { this._currentUser = v || ''; if (this.shadowRoot) this.paint(); }
  get currentUser() { return this._currentUser || ''; }

  onConnect() {
    this._items = []; this._currentUser = '';
    this._replyTo = null;     // id of parent comment being replied to
    this._editId = null;      // id of comment being edited
    this.render(`<style>
      :host{ display:block; }
      .thread{ display:flex; flex-direction:column; gap:var(--space-3); }
      .card{ position:relative; background:var(--color-surface-raised); border:1px solid var(--color-border);
        border-radius:var(--radius-md); padding:var(--space-3); }
      .card--reply{ margin-left:var(--space-7); background:var(--color-surface);
        border-left:3px solid var(--color-brand-primary); border-radius:0 var(--radius-md) var(--radius-md) 0; }
      .top{ display:flex; align-items:center; gap:var(--space-2); margin-bottom:var(--space-2); }
      .avatar{ width:32px; height:32px; border-radius:var(--radius-pill); display:grid; place-items:center;
        background:var(--color-brand-primary); color:var(--color-text-inverse); font-weight:var(--fw-bold);
        font-size:var(--size-body-sm); flex-shrink:0; }
      .who{ flex:1; min-width:0; }
      .who .name{ font-weight:var(--fw-semibold); font-size:var(--size-body-sm); }
      .who .when{ font-size:var(--size-caption); color:var(--color-text-muted); }
      .who .replyto{ font-size:var(--size-caption); color:var(--color-brand-primary); }
      .body{ font-size:var(--size-body-sm); line-height:var(--lh-relaxed); color:var(--color-text); white-space:pre-wrap; }
      .actions{ display:flex; gap:var(--space-2); align-items:center; margin-top:var(--space-2);
        font-size:var(--size-caption); }
      .actions button{ background:transparent; border:0; color:var(--color-text-muted); cursor:pointer;
        font:inherit; padding:2px var(--space-2); border-radius:var(--radius-sm); }
      .actions button:hover{ color:var(--color-brand-primary); background:color-mix(in srgb, var(--color-brand-primary) 8%, transparent); }
      .actions button.danger:hover{ color:var(--color-danger); background:color-mix(in srgb, var(--color-danger) 8%, transparent); }
      .actions .spacer{ flex:1; }
      .actions .id{ font-size:var(--size-caption); color:var(--color-brand-primary); font-weight:var(--fw-semibold); }
      .chips{ display:flex; flex-wrap:wrap; gap:var(--space-1); margin-top:var(--space-2); align-items:center; }
      .edit-form{ margin-top:var(--space-2); display:flex; flex-direction:column; gap:var(--space-2); }
      .edit-form textarea{ font:inherit; font-size:var(--size-body-sm); padding:var(--space-2);
        border:1px solid var(--color-border-strong); border-radius:var(--radius-sm);
        background:var(--color-surface); color:var(--color-text); resize:vertical; min-height:4em; }
      .edit-form .row{ display:flex; gap:var(--space-2); justify-content:flex-end; }
      .edit-form button{ font:inherit; font-size:var(--size-body-sm); padding:var(--space-1) var(--space-3);
        border-radius:var(--radius-sm); cursor:pointer; border:1px solid var(--color-border); }
      .edit-form button.primary{ background:var(--color-brand-primary); color:var(--color-text-inverse); border-color:var(--color-brand-primary); }
      .composer{ background:var(--color-surface); border:1px dashed var(--color-border-strong);
        border-radius:var(--radius-md); padding:var(--space-3); display:grid; gap:var(--space-2);
        margin-top:var(--space-3); }
      .composer .replying-to{ font-size:var(--size-caption); color:var(--color-brand-primary);
        display:none; align-items:center; gap:var(--space-2); }
      .composer.is-replying .replying-to{ display:flex; }
      .composer .replying-to button{ background:transparent; border:0; color:inherit; cursor:pointer; padding:0; }
      .composer textarea{ font:inherit; font-size:var(--size-body-sm); padding:var(--space-2);
        border:1px solid var(--color-border-strong); border-radius:var(--radius-sm);
        background:var(--color-surface); color:var(--color-text); resize:vertical; min-height:4em; }
      .composer .row{ display:flex; gap:var(--space-2); align-items:center; flex-wrap:wrap; }
      .composer select{ font:inherit; font-size:var(--size-body-sm); padding:var(--space-1) var(--space-2);
        border:1px solid var(--color-border-strong); border-radius:var(--radius-sm);
        background:var(--color-surface); color:var(--color-text); }
      .composer button{ margin-left:auto; padding:var(--space-2) var(--space-3); border-radius:var(--radius-sm);
        background:var(--color-brand-primary); color:var(--color-text-inverse); font-weight:var(--fw-semibold);
        font-size:var(--size-body-sm); border:0; cursor:pointer; }
      .empty{ color:var(--color-text-muted); font-size:var(--size-body-sm); text-align:center; padding:var(--space-5); }
      .pf-badge{ display:inline-grid; place-items:center; padding:1px var(--space-2); border-radius:var(--radius-pill);
        font-size:var(--size-caption); font-weight:var(--fw-semibold); text-transform:capitalize; }
      .pf-badge--pending{ background:var(--dgo-status-pending-bg); color:var(--dgo-status-pending-fg); }
      .pf-badge--routed{ background:var(--dgo-status-routed-bg); color:var(--dgo-status-routed-fg); }
      .pf-badge--replied{ background:var(--dgo-status-replied-bg); color:var(--dgo-status-replied-fg); }
      .pf-badge--action{ background:var(--dgo-status-action-bg); color:var(--dgo-status-action-fg); }
      .pf-badge--draft{ background:var(--dgo-status-draft-bg); color:var(--dgo-status-draft-fg); }
      .pf-badge--archived{ background:var(--dgo-status-archived-bg); color:var(--dgo-status-archived-fg); }
    </style>
    <div class="thread" id="thread"></div>
    <form class="composer" id="composer">
      <div class="replying-to" id="replying-to"></div>
      <textarea id="c-text" rows="3" placeholder="${this.t('comments.placeholder')}"></textarea>
      <div class="row">
        <select id="c-sentiment" aria-label="${this.t('comments.sentiment.label')}">
          <option value="neutral">${this.t('comments.sentiment.neutral')}</option>
          <option value="positive">${this.t('comments.sentiment.positive')}</option>
          <option value="negative">${this.t('comments.sentiment.negative')}</option>
        </select>
        <select id="c-priority" aria-label="${this.t('comments.priority.label')}">
          <option value="low">${this.t('comments.priority.low')}</option>
          <option value="medium">${this.t('comments.priority.medium')}</option>
          <option value="urgent">${this.t('comments.priority.urgent')}</option>
        </select>
        <button type="submit">${this.t('comments.add')}</button>
      </div>
    </form>`);
    this.on(this.$('#composer'), 'submit', (e) => {
      e.preventDefault();
      const text = this.$('#c-text').value.trim(); if (!text) return;
      this.emit('pf-comment:submit', {
        text, sentiment: this.$('#c-sentiment').value, priority: this.$('#c-priority').value,
        reference: this._ref || null, parentId: this._replyTo || null
      });
      this.$('#c-text').value = '';
      this._replyTo = null; this._renderReplyTo();
    });
    this.paint();
  }

  _renderReplyTo() {
    const wrap = this.$('#composer'); const slot = this.$('#replying-to');
    if (!wrap || !slot) return;
    slot.innerHTML = '';
    if (!this._replyTo) { wrap.classList.remove('is-replying'); return; }
    wrap.classList.add('is-replying');
    const parent = (this._items || []).find((c) => String(_idOf(c)) === String(this._replyTo));
    const who = parent ? _authorOf(parent) : '';
    const label = document.createElement('span');
    label.textContent = this.t('comments.replyingTo', { who: who || '…' });
    const cancel = document.createElement('button');
    cancel.type = 'button'; cancel.textContent = '✕ ' + this.t('common.actions.cancel');
    cancel.addEventListener('click', () => { this._replyTo = null; this._renderReplyTo(); });
    slot.append(label, cancel);
  }

  /** Build threaded list: top-level items first, with replies indented under their parent. */
  _threaded(items) {
    const byParent = new Map();   // parentId -> [child, …]
    const topLevel = [];
    items.forEach((c) => {
      const pid = c.parentId || c.parent || null;
      if (pid) {
        const arr = byParent.get(String(pid)) || []; arr.push(c); byParent.set(String(pid), arr);
      } else {
        topLevel.push(c);
      }
    });
    // Sort top-level by ts ascending; replies likewise
    const ts = (c) => new Date(c.ts || c.createdAt || 0).valueOf() || 0;
    topLevel.sort((a, b) => ts(a) - ts(b));
    byParent.forEach((arr) => arr.sort((a, b) => ts(a) - ts(b)));
    const out = [];
    topLevel.forEach((parent) => {
      out.push({ comment: parent, isReply: false });
      const children = byParent.get(String(_idOf(parent))) || [];
      children.forEach((child) => out.push({ comment: child, isReply: true, parentAuthor: _authorOf(parent) }));
    });
    // Any orphaned replies (parent missing) get rendered as top-level — don't lose them
    items.forEach((c) => {
      const pid = c.parentId || c.parent || null;
      if (pid && !topLevel.some((p) => String(_idOf(p)) === String(pid)) && !out.some((x) => x.comment === c)) {
        out.push({ comment: c, isReply: false });
      }
    });
    return out;
  }

  paint() {
    const t = this.$('#thread'); if (!t) return;
    const items = this.items;
    if (!items.length) { t.innerHTML = `<div class="empty">${this.t('comments.empty')}</div>`; return; }
    t.innerHTML = '';
    const ordered = this._threaded(items);
    ordered.forEach(({ comment, isReply, parentAuthor }) => t.appendChild(this._renderCard(comment, isReply, parentAuthor)));
  }

  _renderCard(c, isReply, parentAuthor) {
    const id = _idOf(c);
    const author = _authorOf(c);
    const isOwn = !!this._currentUser && (author === this._currentUser);
    const role = c.role ? ' · ' + c.role : '';
    const initial = (author[0] || '?').toUpperCase();
    const status = c.status || c.Status;
    const sentiment = c.sentiment;
    const priority = c.priority;
    const when = _whenOf(c);

    const article = document.createElement('article');
    article.className = 'card' + (isReply ? ' card--reply' : '');
    article.dataset.commentId = String(id);

    // Top row
    const top = document.createElement('div'); top.className = 'top';
    top.innerHTML = `
      <span class="avatar">${_escHtml(initial)}</span>
      <span class="who">
        <div class="name">${_escHtml(author)}${_escHtml(role)}</div>
        <div class="when">${_escHtml(when)}${isReply && parentAuthor ? ` <span class="replyto">↳ ${this.t('comments.inReplyTo', { who: _escHtml(parentAuthor) })}</span>` : ''}</div>
      </span>
      ${status ? `<span class="pf-badge pf-badge--${cls(STATUS, status)}">${_escHtml(status)}</span>` : ''}`;
    article.appendChild(top);

    // Body (or edit form if in edit mode)
    if (this._editId && String(this._editId) === String(id)) {
      const form = document.createElement('form'); form.className = 'edit-form';
      const ta = document.createElement('textarea'); ta.value = _bodyOf(c); ta.required = true;
      const row = document.createElement('div'); row.className = 'row';
      const save = document.createElement('button'); save.type = 'submit'; save.className = 'primary'; save.textContent = this.t('comments.save');
      const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = this.t('common.actions.cancel');
      cancel.addEventListener('click', () => { this._editId = null; this.paint(); });
      row.append(cancel, save);
      form.append(ta, row);
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = ta.value.trim(); if (!text) return;
        this.emit('pf-comment:edit', { id, text });
        this._editId = null;
      });
      article.appendChild(form);
    } else {
      const body = document.createElement('div'); body.className = 'body'; body.textContent = _bodyOf(c);
      article.appendChild(body);
    }

    // Chips (sentiment, priority)
    if (sentiment || priority) {
      const chips = document.createElement('div'); chips.className = 'chips';
      if (priority) chips.innerHTML += `<span class="pf-badge pf-badge--${cls(PRIORITY, priority)}">${_escHtml(priority)}</span>`;
      if (sentiment) chips.innerHTML += `<span class="pf-badge pf-badge--${cls(SENTIMENT, sentiment)}">${_escHtml(sentiment)}</span>`;
      article.appendChild(chips);
    }

    // Action row — Reply (always), Edit/Delete (own only). Replies don't get nested replies.
    const actions = document.createElement('div'); actions.className = 'actions';
    if (!isReply) {
      const reply = document.createElement('button'); reply.type = 'button';
      reply.textContent = '↩ ' + this.t('comments.reply');
      reply.addEventListener('click', () => { this._replyTo = id; this._renderReplyTo(); this.$('#c-text')?.focus(); });
      actions.appendChild(reply);
    }
    if (isOwn) {
      const edit = document.createElement('button'); edit.type = 'button';
      edit.textContent = '✎ ' + this.t('comments.edit');
      edit.addEventListener('click', () => { this._editId = id; this.paint(); });
      const del = document.createElement('button'); del.type = 'button'; del.className = 'danger';
      del.textContent = '🗑 ' + this.t('comments.delete');
      del.addEventListener('click', () => this.emit('pf-comment:delete', { id }));
      actions.append(edit, del);
    }
    const spacer = document.createElement('span'); spacer.className = 'spacer'; actions.appendChild(spacer);
    if (id) { const idEl = document.createElement('span'); idEl.className = 'id'; idEl.textContent = id; actions.appendChild(idEl); }
    article.appendChild(actions);

    return article;
  }
}
customElements.define('pf-comment-thread', PfCommentThread);
export default PfCommentThread;
