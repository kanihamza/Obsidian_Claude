/**
 * OBSIDIAN v4 Breadcrumb Component
 * Navigation breadcrumbs with aria-current support
 */

export class Breadcrumb extends HTMLElement {
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
          display: block;
          padding: 12px 16px;
          font-size: 14px;
          border-bottom: 1px solid #e0e0e0;
        }

        nav {
          display: flex;
        }

        ul {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          gap: 0;
          flex-wrap: wrap;
        }

        li {
          display: flex;
          align-items: center;
        }

        li + li::before {
          content: "/";
          margin: 0 8px;
          color: #999;
        }

        a {
          color: #0066cc;
          text-decoration: none;
          padding: 4px 8px;
          cursor: pointer;
        }

        a:hover {
          text-decoration: underline;
        }

        a:focus-visible {
          outline: 2px solid #0066cc;
          outline-offset: 2px;
        }

        [aria-current="page"] {
          color: #666;
          font-weight: 600;
          cursor: default;
        }
      </style>

      <nav aria-label="breadcrumb">
        <ul>
          <slot></slot>
        </ul>
      </nav>
    `;
  }
}

export class BreadcrumbItem extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const href = this.getAttribute('href');
    const isCurrent = this.hasAttribute('aria-current');
    const text = this.textContent;

    if (isCurrent) {
      this.innerHTML = `<li aria-current="page">${text}</li>`;
    } else {
      this.innerHTML = `<li><a href="${href}">${text}</a></li>`;
    }
  }
}

customElements.define('pf-breadcrumb', Breadcrumb);
customElements.define('pf-breadcrumb-item', BreadcrumbItem);
