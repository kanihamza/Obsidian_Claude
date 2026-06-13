/**
 * OBSIDIAN v4 Toast Notification Component
 * Used by UIFeedback system for notifications
 */

export class Toast extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    const type = this.getAttribute('data-type') || 'info';
    const message = this.textContent;
    const dismissible = !this.hasAttribute('data-no-dismiss');

    this.render(type, message, dismissible);
  }

  render(type, message, dismissible) {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .toast {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-radius: 4px;
          background: white;
          color: #333;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          font-size: 14px;
          min-height: 44px;
          animation: slideIn 200ms ease-out;
        }

        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .toast-info { background: #e3f2fd; color: #0d47a1; border-left: 4px solid #2196f3; }
        .toast-success { background: #e8f5e9; color: #1b5e20; border-left: 4px solid #4caf50; }
        .toast-warning { background: #fff3cd; color: #856404; border-left: 4px solid #ffc107; }
        .toast-error { background: #ffebee; color: #b71c1c; border-left: 4px solid #f44336; }

        .content {
          flex: 1;
        }

        .close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: inherit;
          opacity: 0.5;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 200ms;
        }

        .close:hover {
          opacity: 1;
        }

        .close:focus-visible {
          outline: 2px solid currentColor;
          outline-offset: 2px;
        }
      </style>

      <div class="toast toast-${type}" role="${type === 'error' ? 'alert' : 'status'}" aria-live="${type === 'error' ? 'assertive' : 'polite'}" aria-atomic="true">
        <div class="content">${message}</div>
        ${dismissible ? '<button class="close" aria-label="Dismiss">×</button>' : ''}
      </div>
    `;

    if (dismissible) {
      const closeBtn = this.shadowRoot.querySelector('.close');
      closeBtn.addEventListener('click', () => {
        this.remove();
        this.dispatchEvent(new CustomEvent('dismissed'));
      });
    }
  }
}

customElements.define('pf-toast', Toast);
