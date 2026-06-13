/**
 * OBSIDIAN v4 App Navigation Component
 * Main navigation with active route highlighting
 */

import { i18n } from '../../core/i18n.js';

export class AppNav extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this._setupEventListeners();
    
    window.addEventListener('route-change', () => this.updateActiveState());
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          background: white;
          min-height: 56px;
        }

        ul {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          gap: 0;
        }

        li {
          flex: 1;
        }

        a {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          color: #333;
          text-decoration: none;
          border-bottom: 3px solid transparent;
          cursor: pointer;
          min-height: 44px;
          transition: all 200ms ease-out;
          font-size: 14px;
        }

        a:hover {
          background: #f5f5f5;
        }

        a[aria-current="page"] {
          color: #0066cc;
          border-bottom-color: #0066cc;
          font-weight: 600;
          background: #f0f7ff;
        }

        a:focus-visible {
          outline: 2px solid #0066cc;
          outline-offset: -2px;
        }

        @media (max-width: 1023px) {
          ul {
            flex-direction: column;
          }

          li {
            flex: none;
          }

          a {
            border-bottom: none;
            border-left: 3px solid transparent;
            padding-left: 16px;
          }

          a[aria-current="page"] {
            border-left-color: #0066cc;
            border-bottom-color: transparent;
          }
        }

        @media (max-width: 640px) {
          a {
            padding: 12px;
            font-size: 13px;
          }
        }
      </style>

      <ul role="menubar">
        <!-- Nav items will be rendered dynamically based on routes -->
      </ul>
    `;
  }

  _setupEventListeners() {
    const navItems = this.shadowRoot.querySelectorAll('a');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const path = item.getAttribute('href');
        if (window.router && window.router.navigate) {
          window.router.navigate(path);
        }
      });
    });
  }

  updateActiveState() {
    const navItems = this.shadowRoot.querySelectorAll('a');
    const currentPath = (window.router && window.router.getCurrentRoute?.()?.path) || '/';

    navItems.forEach(item => {
      const href = item.getAttribute('href');
      if (href === currentPath) {
        item.setAttribute('aria-current', 'page');
        item.classList.add('active');
      } else {
        item.removeAttribute('aria-current');
        item.classList.remove('active');
      }
    });
  }
}

customElements.define('pf-app-nav', AppNav);
