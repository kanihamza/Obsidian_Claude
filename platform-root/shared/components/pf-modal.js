/**
 * OBSIDIAN v4 Modal Component
 * Accessible modal dialog with focus trap
 */

export class Modal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.previousActiveElement = null;
  }

  connectedCallback() {
    const title = this.getAttribute('aria-label') || 'Dialog';
    this.render(title);
    this._manageFocus();
    this._setupEventListeners();
  }

  render(title) {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1040;
          animation: backdropIn 200ms ease-out;
        }

        @keyframes backdropIn {
          from { opacity: 0; }
          to { opacity: 0.5; }
        }

        .modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          border-radius: 8px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          z-index: 1050;
          animation: modalIn 300ms cubic-bezier(0.4, 0, 0.2, 1);
          padding: 24px;
        }

        @keyframes modalIn {
          from {
            opacity: 0;
            transform: translate(-50%, -48%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid #e0e0e0;
        }

        .title {
          font-size: 20px;
          font-weight: 600;
          margin: 0;
        }

        .close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #333;
          border-radius: 4px;
        }

        .close:hover {
          background: #f5f5f5;
        }

        .close:focus-visible {
          outline: 2px solid #0066cc;
          outline-offset: 2px;
        }

        .content {
          margin-bottom: 24px;
        }

        .footer {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          border-top: 1px solid #e0e0e0;
          padding-top: 16px;
          margin-top: 16px;
        }

        @media (max-width: 640px) {
          .modal {
            max-width: 90vw;
            padding: 16px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .modal, .backdrop {
            animation: none;
          }
        }
      </style>

      <div class="backdrop"></div>
      <div class="modal" role="dialog" aria-modal="true" aria-label="${title}">
        <div class="header">
          <h2 class="title">${title}</h2>
          <button class="close" aria-label="Close dialog">×</button>
        </div>
        <div class="content">
          <slot></slot>
        </div>
      </div>
    `;
  }

  _setupEventListeners() {
    const backdrop = this.shadowRoot.querySelector('.backdrop');
    backdrop.addEventListener('click', () => this.close());

    const closeBtn = this.shadowRoot.querySelector('.close');
    closeBtn.addEventListener('click', () => this.close());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.close();
      }
    });
  }

  _manageFocus() {
    this.previousActiveElement = document.activeElement;

    const focusableElements = this.shadowRoot.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length > 0) {
      setTimeout(() => focusableElements[0].focus(), 0);
    }

    this._implementFocusTrap(focusableElements);
  }

  _implementFocusTrap(focusableElements) {
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    this.addEventListener('keydown', handleKeyDown);
  }

  close() {
    if (this.previousActiveElement) {
      this.previousActiveElement.focus();
    }

    this.dispatchEvent(new CustomEvent('modal-closed'));
    this.remove();
  }
}

customElements.define('pf-modal', Modal);
