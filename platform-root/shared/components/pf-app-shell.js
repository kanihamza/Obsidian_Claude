/**
 * OBSIDIAN v4 App Shell Component
 * Main layout container with header, nav, content areas
 */

export class AppShell extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: grid;
          grid-template-columns: 1fr;
          grid-template-rows: auto auto 1fr auto;
          min-height: 100vh;
          grid-template-areas:
            "header"
            "nav"
            "content"
            "footer";
        }

        ::slotted([slot="header"]) {
          grid-area: header;
          border-bottom: 1px solid #e0e0e0;
          z-index: var(--z-sticky, 1020);
        }

        ::slotted([slot="nav"]) {
          grid-area: nav;
          border-bottom: 1px solid #e0e0e0;
          overflow-y: auto;
        }

        ::slotted([slot="content"]) {
          grid-area: content;
          overflow-y: auto;
        }

        ::slotted([slot="breadcrumbs"]) {
          grid-area: breadcrumbs;
          padding: 12px 16px;
          font-size: 14px;
          border-bottom: 1px solid #e0e0e0;
        }

        ::slotted([slot="footer"]) {
          grid-area: footer;
          border-top: 1px solid #e0e0e0;
        }

        /* Tablet layout: sidebar nav */
        @media (min-width: 1024px) {
          :host {
            grid-template-columns: 250px 1fr;
            grid-template-rows: auto 1fr auto;
            grid-template-areas:
              "header header"
              "nav content"
              "nav footer";
          }

          ::slotted([slot="nav"]) {
            border-bottom: none;
            border-right: 1px solid #e0e0e0;
          }
        }
      </style>

      <slot name="header"></slot>
      <slot name="nav"></slot>
      <slot name="breadcrumbs"></slot>
      <slot name="content"></slot>
      <slot name="footer"></slot>
    `;
  }
}

customElements.define('pf-app-shell', AppShell);
