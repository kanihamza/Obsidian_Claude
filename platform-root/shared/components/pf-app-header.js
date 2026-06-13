/**
 * OBSIDIAN v4 App Header Component
 * Top header with branding, persona switcher, settings
 */

import { i18n } from '../../core/i18n.js';

export class AppHeader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this._setupEventListeners();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          background: white;
          padding: 12px 16px;
          border-bottom: 1px solid #e0e0e0;
          min-height: 56px;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .logo {
          font-weight: 700;
          font-size: 18px;
          color: #0066cc;
          text-decoration: none;
          flex-shrink: 0;
        }

        .spacer {
          flex: 1;
        }

        .controls {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          font-size: 16px;
          color: #333;
          border-radius: 4px;
          min-width: 44px;
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        button:hover {
          background: #f5f5f5;
        }

        button:focus-visible {
          outline: 2px solid #0066cc;
          outline-offset: 2px;
        }

        .language-switcher {
          padding: 8px 12px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
          background: white;
          min-width: 44px;
          min-height: 44px;
        }

        .language-switcher:focus-visible {
          outline: 2px solid #0066cc;
          outline-offset: 2px;
        }

        @media (max-width: 640px) {
          :host {
            padding: 12px;
          }

          .logo {
            font-size: 16px;
          }

          .language-switcher {
            display: none;
          }
        }
      </style>

      <a href="/" class="logo" aria-label="OBSIDIAN">
        OBSIDIAN
      </a>

      <div class="spacer"></div>

      <div class="controls">
        <!-- Language switcher -->
        <select class="language-switcher" aria-label="Language">
          <option value="en">EN</option>
          <option value="fr">FR</option>
          <option value="ha">HA</option>
        </select>

        <!-- Settings -->
        <button aria-label="Settings">
          ⚙️
        </button>

        <!-- Account/Logout -->
        <button aria-label="Account">
          👤
        </button>
      </div>
    `;
  }

  _setupEventListeners() {
    const languageSwitcher = this.shadowRoot.querySelector('.language-switcher');
    if (languageSwitcher && i18n && i18n.setLanguage) {
      languageSwitcher.addEventListener('change', (e) => {
        i18n.setLanguage(e.target.value);
        localStorage.setItem('preferred-language', e.target.value);
        window.dispatchEvent(new CustomEvent('language-changed', {
          detail: { language: e.target.value }
        }));
      });

      const currentLang = (i18n.getLanguage && i18n.getLanguage()) || 'en';
      languageSwitcher.value = currentLang;
    }
  }
}

customElements.define('pf-app-header', AppHeader);
