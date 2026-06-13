/**
 * OBSIDIAN v4 Accessibility Runtime Monitor
 * Detects common accessibility issues in development
 * Disabled in production
 */

import { BaseModule } from '../core/base-module.js';
import { EventBus } from '../core/bus.js';

export class UIAccessibilityMonitor extends BaseModule {
  constructor(config = {}) {
    super(config);
    this.issues = [];
    this.enabled = config.enabled !== false && !this._isProduction();
  }

  _isProduction() {
    return process.env.NODE_ENV === 'production' || 
           !window.location.hostname.includes('localhost');
  }

  /**
   * Run a11y validation scan
   */
  scan() {
    if (!this.enabled) return [];

    this.issues = [];

    this._checkMainLandmark();
    this._checkSkipLink();
    this._checkButtons();
    this._checkImages();
    this._checkFormLabels();
    this._checkModals();
    this._checkToasts();
    this._checkFocusIndicators();

    if (this.issues.length > 0) {
      this._reportIssues();
    }

    return this.issues;
  }

  /**
   * Check for main landmark
   * @private
   */
  _checkMainLandmark() {
    const main = document.querySelector('main') || 
                 document.querySelector('[role="main"]');

    if (!main) {
      this.issues.push({
        type: 'MISSING_MAIN_LANDMARK',
        severity: 'error',
        message: 'Main landmark (main element or role="main") not found. Add <main></main> or role="main" to your primary content area.',
      });
    }
  }

  /**
   * Check for skip link
   * @private
   */
  _checkSkipLink() {
    const skipLink = document.querySelector('a[href="#main-content"], .sr-skip-link');
    
    if (!skipLink) {
      this.issues.push({
        type: 'MISSING_SKIP_LINK',
        severity: 'warning',
        message: 'Skip link not found. Add a skip-to-content link at the top of the page for keyboard users.',
      });
    }
  }

  /**
   * Check for unlabeled buttons
   * @private
   */
  _checkButtons() {
    document.querySelectorAll('button').forEach((btn) => {
      const hasText = btn.textContent?.trim().length > 0;
      const hasAriaLabel = btn.getAttribute('aria-label');
      const hasTitle = btn.getAttribute('title');

      if (!hasText && !hasAriaLabel && !hasTitle) {
        this.issues.push({
          type: 'UNLABELED_BUTTON',
          severity: 'error',
          element: btn,
          message: `Button missing text or aria-label: ${btn.outerHTML.substring(0, 50)}`,
        });
      }
    });
  }

  /**
   * Check for missing alt text
   * @private
   */
  _checkImages() {
    document.querySelectorAll('img').forEach((img) => {
      if (!img.getAttribute('alt') && !img.getAttribute('aria-label')) {
        this.issues.push({
          type: 'MISSING_ALT_TEXT',
          severity: 'warning',
          element: img,
          message: `Image missing alt text: ${img.src}`,
        });
      }
    });
  }

  /**
   * Check for form labels
   * @private
   */
  _checkFormLabels() {
    document.querySelectorAll('input[type="text"], input[type="email"], textarea, select').forEach((input) => {
      const id = input.getAttribute('id');
      const label = id ? document.querySelector(`label[for="${id}"]`) : null;
      const ariaLabel = input.getAttribute('aria-label');

      if (!label && !ariaLabel) {
        this.issues.push({
          type: 'UNLABELED_FORM_CONTROL',
          severity: 'warning',
          element: input,
          message: `Form control missing label or aria-label: ${input.outerHTML.substring(0, 50)}`,
        });
      }
    });
  }

  /**
   * Check for modal accessibility
   * @private
   */
  _checkModals() {
    document.querySelectorAll('[role="dialog"]').forEach((modal) => {
      if (!modal.hasAttribute('aria-label') && !modal.hasAttribute('aria-labelledby')) {
        this.issues.push({
          type: 'UNLABELED_MODAL',
          severity: 'error',
          element: modal,
          message: 'Modal missing aria-label or aria-labelledby',
        });
      }

      if (!modal.hasAttribute('aria-modal')) {
        this.issues.push({
          type: 'MISSING_ARIA_MODAL',
          severity: 'warning',
          element: modal,
          message: 'Modal missing aria-modal="true"',
        });
      }
    });
  }

  /**
   * Check for live regions in toasts
   * @private
   */
  _checkToasts() {
    const container = document.querySelector('.pf-toast-container');
    if (container) {
      if (!container.hasAttribute('role')) {
        this.issues.push({
          type: 'MISSING_TOAST_ROLE',
          severity: 'warning',
          element: container,
          message: 'Toast container missing role="region"',
        });
      }

      if (!container.hasAttribute('aria-label')) {
        this.issues.push({
          type: 'MISSING_TOAST_LABEL',
          severity: 'warning',
          element: container,
          message: 'Toast container missing aria-label',
        });
      }
    }
  }

  /**
   * Check for visible focus indicators
   * @private
   */
  _checkFocusIndicators() {
    const style = window.getComputedStyle(document.body);
    const hasFocusStyles = document.querySelector('style, link[rel="stylesheet"]');

    if (!hasFocusStyles) {
      this.issues.push({
        type: 'NO_FOCUS_STYLES',
        severity: 'warning',
        message: 'No focus indicator styles found. Add :focus-visible styles to buttons and interactive elements.',
      });
    }
  }

  /**
   * Report issues to console (development only)
   * @private
   */
  _reportIssues() {
    console.group('🎯 Accessibility Issues Found');
    
    this.issues.forEach((issue) => {
      const icon = issue.severity === 'error' ? '❌' : '⚠️';
      console.log(`${icon} ${issue.type}: ${issue.message}`);
      if (issue.element) {
        console.log(issue.element);
      }
    });

    console.groupEnd();

    if (this.bus) {
      this.bus.emit('a11y:issues-found', { issues: this.issues });
    }
  }
}

export default UIAccessibilityMonitor;
