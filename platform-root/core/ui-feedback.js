/**
 * OBSIDIAN v4 UI Feedback System
 * 
 * Centralized feedback management for:
 * - Loading states (spinners, skeletons, progress)
 * - Error states (recovery, retry)
 * - Empty states (guidance, action)
 * - Success feedback (confirmation, notification)
 * - Accessibility (aria-live, role=status/alert)
 * 
 * This module integrates with:
 * - core/state.js (for state tracking)
 * - core/bus.js (for cross-module communication)
 * - core/i18n.js (for localized messages)
 * - core/lifecycle.js (for lifecycle awareness)
 */

import { EventBus } from './bus.js';
import { i18n } from './i18n.js';

// Feedback state constants
export const FeedbackStates = {
  IDLE: 'idle',
  LOADING: 'loading',
  SLOW_LOAD: 'slow-load',  // Loading but taking longer than expected
  SUCCESS: 'success',
  ERROR: 'error',
  EMPTY: 'empty',
  OFFLINE: 'offline',
};

export class UIFeedback {
  constructor(bus = EventBus.instance) {
    this.bus = bus;
    this.containers = new Map();  // Container ID → state
    this.toastQueue = [];
    this.activeToasts = new Map();  // Toast ID → toast element
    this.retryCallbacks = new Map();  // Container ID → retry function
    this.focusTrap = null;
  }

  /**
   * Set feedback state for a container
   * @param {string|Element} container - Container element or ID
   * @param {string} state - FeedbackStates value
   * @param {Object} options - State-specific options
   */
  setState(container, state, options = {}) {
    const element = typeof container === 'string' 
      ? document.getElementById(container) 
      : container;

    if (!element) {
      console.warn('[UIFeedback] Container not found:', container);
      return;
    }

    const containerId = element.id || `feedback-${Date.now()}`;
    element.id = containerId;

    // Store state
    this.containers.set(containerId, state);

    // Clear previous state indicators
    element.removeAttribute('data-feedback-state');
    element.removeAttribute('aria-busy');
    element.removeAttribute('role');

    // Apply new state
    element.setAttribute('data-feedback-state', state);

    switch (state) {
      case FeedbackStates.IDLE:
        element.removeAttribute('aria-busy');
        this._clearFeedbackUI(element);
        break;

      case FeedbackStates.LOADING:
        element.setAttribute('aria-busy', 'true');
        element.setAttribute('role', 'status');
        element.setAttribute('aria-live', 'polite');
        this._showLoading(element, options);
        break;

      case FeedbackStates.SLOW_LOAD:
        element.setAttribute('aria-busy', 'true');
        element.setAttribute('role', 'status');
        element.setAttribute('aria-live', 'polite');
        this._showSlowLoad(element, options);
        break;

      case FeedbackStates.SUCCESS:
        this._showSuccess(element, options);
        break;

      case FeedbackStates.ERROR:
        element.setAttribute('role', 'alert');
        element.setAttribute('aria-live', 'assertive');
        this._showError(element, options);
        break;

      case FeedbackStates.EMPTY:
        this._showEmpty(element, options);
        break;

      case FeedbackStates.OFFLINE:
        element.setAttribute('role', 'alert');
        element.setAttribute('aria-live', 'assertive');
        this._showOffline(element, options);
        break;
    }

    // Emit state change event for external listeners
    this.bus.emit('feedback:state-changed', {
      container: containerId,
      state,
      options,
    });
  }

  /**
   * Show loading state with spinner
   * @private
   */
  _showLoading(element, options = {}) {
    const {
      message = i18n.t('feedback.loading'),
      spinnerSize = 'md',
    } = options;

    const spinner = this._createSpinner(spinnerSize);
    const messageEl = this._createMessage(message);

    const container = document.createElement('div');
    container.className = 'pf-feedback-loading';
    container.appendChild(spinner);
    container.appendChild(messageEl);

    element.innerHTML = '';
    element.appendChild(container);
  }

  /**
   * Show slow load state (after 2 seconds of loading)
   * @private
   */
  _showSlowLoad(element, options = {}) {
    const {
      message = i18n.t('feedback.slow-load'),
      spinnerSize = 'md',
    } = options;

    const spinner = this._createSpinner(spinnerSize);
    const messageEl = this._createMessage(message);
    const detailedMsg = document.createElement('p');
    detailedMsg.className = 'pf-feedback-slow-load-detail';
    detailedMsg.textContent = i18n.t('feedback.slow-load-detail', 
      'This is taking longer than expected...'
    );

    const container = document.createElement('div');
    container.className = 'pf-feedback-slow-load';
    container.appendChild(spinner);
    container.appendChild(messageEl);
    container.appendChild(detailedMsg);

    element.innerHTML = '';
    element.appendChild(container);
  }

  /**
   * Show success feedback
   * @private
   */
  _showSuccess(element, options = {}) {
    const {
      message = i18n.t('feedback.success'),
      autoDismissMs = 3000,
    } = options;

    const container = document.createElement('div');
    container.className = 'pf-feedback-success';
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');

    const icon = document.createElement('div');
    icon.className = 'pf-feedback-icon';
    icon.innerHTML = '✓';

    const messageEl = document.createElement('p');
    messageEl.className = 'pf-feedback-message';
    messageEl.textContent = message;

    container.appendChild(icon);
    container.appendChild(messageEl);

    element.innerHTML = '';
    element.appendChild(container);

    // Auto-dismiss success after delay
    if (autoDismissMs > 0) {
      setTimeout(() => {
        if (element.contains(container)) {
          this._clearFeedbackUI(element);
          this.setState(element, FeedbackStates.IDLE);
        }
      }, autoDismissMs);
    }
  }

  /**
   * Show error state with retry option
   * @private
   */
  _showError(element, options = {}) {
    const {
      message = i18n.t('feedback.error'),
      retryable = true,
      onRetry = null,
    } = options;

    const container = document.createElement('div');
    container.className = 'pf-feedback-error';
    container.setAttribute('role', 'alert');
    container.setAttribute('aria-live', 'assertive');

    const icon = document.createElement('div');
    icon.className = 'pf-feedback-icon';
    icon.innerHTML = '⚠';

    const messageEl = document.createElement('p');
    messageEl.className = 'pf-feedback-message';
    messageEl.textContent = message;

    container.appendChild(icon);
    container.appendChild(messageEl);

    // Add retry button if error is retryable
    if (retryable) {
      const retryBtn = document.createElement('button');
      retryBtn.className = 'pf-feedback-retry-button';
      retryBtn.textContent = i18n.t('feedback.retry', 'Retry');
      
      retryBtn.addEventListener('click', () => {
        if (onRetry) {
          onRetry();
        } else if (this.retryCallbacks.has(element.id)) {
          this.retryCallbacks.get(element.id)();
        }
      });

      container.appendChild(retryBtn);
      this.retryCallbacks.set(element.id, onRetry || (() => {}));
    }

    element.innerHTML = '';
    element.appendChild(container);
  }

  /**
   * Show empty state with call-to-action
   * @private
   */
  _showEmpty(element, options = {}) {
    const {
      icon = '📭',
      message = i18n.t('feedback.empty'),
      actionLabel = null,
      onAction = null,
    } = options;

    const container = document.createElement('div');
    container.className = 'pf-feedback-empty';

    const iconEl = document.createElement('div');
    iconEl.className = 'pf-feedback-empty-icon';
    iconEl.textContent = icon;

    const messageEl = document.createElement('p');
    messageEl.className = 'pf-feedback-empty-message';
    messageEl.textContent = message;

    container.appendChild(iconEl);
    container.appendChild(messageEl);

    if (actionLabel && onAction) {
      const actionBtn = document.createElement('button');
      actionBtn.className = 'pf-feedback-empty-action';
      actionBtn.textContent = actionLabel;
      actionBtn.addEventListener('click', onAction);
      container.appendChild(actionBtn);
    }

    element.innerHTML = '';
    element.appendChild(container);
  }

  /**
   * Show offline state
   * @private
   */
  _showOffline(element, options = {}) {
    const {
      message = i18n.t('feedback.offline', 'You are offline'),
    } = options;

    const container = document.createElement('div');
    container.className = 'pf-feedback-offline';
    container.setAttribute('role', 'alert');
    container.setAttribute('aria-live', 'assertive');

    const icon = document.createElement('div');
    icon.className = 'pf-feedback-icon';
    icon.innerHTML = '⚠';

    const messageEl = document.createElement('p');
    messageEl.className = 'pf-feedback-message';
    messageEl.textContent = message;

    container.appendChild(icon);
    container.appendChild(messageEl);

    element.innerHTML = '';
    element.appendChild(container);
  }

  /**
   * Clear feedback UI and restore to idle state
   * @private
   */
  _clearFeedbackUI(element) {
    element.removeAttribute('data-feedback-state');
    element.removeAttribute('aria-busy');
    element.removeAttribute('role');
    element.removeAttribute('aria-live');
    element.innerHTML = '';
  }

  /**
   * Create spinner element
   * @private
   */
  _createSpinner(size = 'md') {
    const spinner = document.createElement('div');
    spinner.className = `pf-spinner pf-spinner-${size}`;
    spinner.setAttribute('role', 'status');
    spinner.setAttribute('aria-label', i18n.t('feedback.loading'));
    return spinner;
  }

  /**
   * Create message element
   * @private
   */
  _createMessage(message) {
    const el = document.createElement('p');
    el.className = 'pf-feedback-message';
    el.textContent = message;
    return el;
  }

  /**
   * Show toast notification
   * @param {string} message - Toast message
   * @param {Object} options - Toast options
   */
  showToast(message, options = {}) {
    const {
      type = 'info',  // info, success, warning, error
      duration = type === 'error' ? null : 5000,
      dismissible = true,
      position = 'bottom-right',
    } = options;

    const toastId = `toast-${Date.now()}-${Math.random()}`;
    
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `pf-toast pf-toast-${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    toast.setAttribute('aria-atomic', 'true');

    // Content
    const content = document.createElement('div');
    content.className = 'pf-toast-content';
    content.textContent = message;
    toast.appendChild(content);

    // Dismiss button
    if (dismissible) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'pf-toast-close';
      closeBtn.setAttribute('aria-label', i18n.t('feedback.dismiss'));
      closeBtn.textContent = '×';
      closeBtn.addEventListener('click', () => this._removeToast(toastId));
      toast.appendChild(closeBtn);
    }

    // Get or create toast container
    let container = document.querySelector('.pf-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'pf-toast-container';
      container.setAttribute('role', 'region');
      container.setAttribute('aria-label', i18n.t('feedback.notifications', 'Notifications'));
      document.body.appendChild(container);
    }

    // Add toast to container
    container.appendChild(toast);
    this.activeToasts.set(toastId, toast);

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => this._removeToast(toastId), duration);
    }

    return toastId;
  }

  /**
   * Remove toast by ID
   * @private
   */
  _removeToast(toastId) {
    const toast = this.activeToasts.get(toastId);
    if (toast) {
      toast.remove();
      this.activeToasts.delete(toastId);
    }
  }

  /**
   * Show button pending state during async operation
   * @param {Element} button - Button element
   * @param {Promise} promise - Promise to track
   */
  async setPendingButton(button, promise) {
    const originalText = button.textContent;
    const originalDisabled = button.disabled;

    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.setAttribute('data-pending', 'true');
    button.textContent = i18n.t('feedback.processing', '...');

    try {
      return await promise;
    } finally {
      button.disabled = originalDisabled;
      button.removeAttribute('aria-busy');
      button.removeAttribute('data-pending');
      button.textContent = originalText;
    }
  }

  /**
   * Check if user is online and show offline state if needed
   */
  initializeOfflineMonitoring() {
    const offlineHandler = () => {
      const banner = document.querySelector('[data-offline-banner]');
      if (!banner) {
        const el = document.createElement('div');
        el.setAttribute('data-offline-banner', '');
        el.className = 'pf-offline-banner';
        el.setAttribute('role', 'alert');
        el.textContent = i18n.t('feedback.offline');
        document.body.insertBefore(el, document.body.firstChild);
      }
    };

    const onlineHandler = () => {
      const banner = document.querySelector('[data-offline-banner]');
      if (banner) banner.remove();
    };

    window.addEventListener('offline', offlineHandler);
    window.addEventListener('online', onlineHandler);

    // Check initial state
    if (!navigator.onLine) {
      offlineHandler();
    }
  }
}

// Singleton instance
export const UIFeedbackInstance = new UIFeedback();

export default UIFeedbackInstance;
