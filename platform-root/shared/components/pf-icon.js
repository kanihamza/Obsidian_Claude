/** OBSIDIAN v4.0 — <pf-icon name="…" size="20"> · sprite-driven (no icon-font CDN). */
import { PfBaseElement } from './_base.js';
const SPRITE = '/assets/icons/sprite.svg';
class PfIcon extends PfBaseElement {
  static attrs = ['name', 'size', 'label'];
  onConnect() { this.draw(); }
  onAttrChange() { if (this.shadowRoot) this.draw(); }
  draw() {
    const size = this.getAttribute('size') || '20';
    const name = this.getAttribute('name') || '';
    const label = this.getAttribute('label');
    this.render(`<style>
      :host{ display:inline-flex; line-height:0; }
      svg{ width:${size}px; height:${size}px; fill:none; stroke:currentColor;
        stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
    </style>
    <svg role="${label ? 'img' : 'presentation'}" ${label ? `aria-label="${label}"` : 'aria-hidden="true"'}>
      <use href="${SPRITE}#${name}"></use>
    </svg>`);
  }
}
customElements.define('pf-icon', PfIcon);
export default PfIcon;
