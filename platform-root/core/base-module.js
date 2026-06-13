/**
 * OBSIDIAN v4 Base Module
 * Extend this class for all feature modules
 * 
 * Includes UI feedback integration for loading/error states
 */

import { EventBus } from './bus.js';
import { UIFeedbackInstance } from './ui-feedback.js';
import { i18n } from './i18n.js';

export class BaseModule {
  constructor(config = {}) {
    this.config = config;
    this.bus = EventBus.instance;
    this.feedback = UIFeedbackInstance;
    this.state = {
      initialized: false,
      loading: false,
      error: null,
    };
  }

  /**
   * Initialize module (override in subclass)
   */
  async init() {
    this.state.initialized = true;
  }

  /**
   * Set module loading state with UI feedback
   * @param {boolean} isLoading - Loading state
   * @param {Element} container - Optional feedback container
   */
  setLoading(isLoading, container = null) {
    this.state.loading = isLoading;
    
    if (container) {
      if (isLoading) {
        this.feedback.setState(container, 'loading', {
          message: i18n.t('feedback.loading'),
        });
      } else {
        this.feedback.setState(container, 'idle');
      }
    }

    this.bus.emit('module:loading', {
      module: this.constructor.name,
      loading: isLoading,
    });
  }

  /**
   * Set module error state with UI feedback
   * @param {Error|string} error - Error object or message
   * @param {Element} container - Optional feedback container
   * @param {Function} onRetry - Retry callback
   */
  setError(error, container = null, onRetry = null) {
    const errorMessage = typeof error === 'string' 
      ? error 
      : error?.message || i18n.t('feedback.error-generic', 'An error occurred');

    this.state.error = error;

    if (container) {
      this.feedback.setState(container, 'error', {
        message: errorMessage,
        retryable: !!onRetry,
        onRetry,
      });
    }

    this.bus.emit('module:error', {
      module: this.constructor.name,
      error: errorMessage,
    });
  }

  /**
   * Set module success state with UI feedback
   * @param {Element} container - Optional feedback container
   * @param {string} message - Success message
   */
  setSuccess(container = null, message = null) {
    if (container) {
      this.feedback.setState(container, 'success', {
        message: message || i18n.t('feedback.success'),
      });
    }

    this.bus.emit('module:success', {
      module: this.constructor.name,
      message: message || i18n.t('feedback.success'),
    });
  }

  /**
   * Set module empty state with UI feedback
   * @param {Element} container - Feedback container
   * @param {Object} options - Empty state options
   */
  setEmpty(container, options = {}) {
    const {
      icon = '📭',
      message = i18n.t('feedback.empty', 'No items'),
      actionLabel = null,
      onAction = null,
    } = options;

    if (container) {
      this.feedback.setState(container, 'empty', {
        icon,
        message,
        actionLabel,
        onAction,
      });
    }
  }

  /**
   * Common pattern: load data with feedback
   * @param {Promise} promise - Data loading promise
   * @param {Element} container - Feedback container
   * @param {Object} options - Success/error options
   */
  async loadWithFeedback(promise, container = null, options = {}) {
    const {
      onSuccess = null,
      onError = null,
      onEmpty = null,
      showLoading = true,
    } = options;

    if (showLoading && container) {
      this.setLoading(true, container);
    }

    try {
      const result = await promise;

      // Check for empty result
      if (Array.isArray(result) && result.length === 0) {
        if (container) {
          this.setEmpty(container, onEmpty || {});
        }
        return result;
      }

      if (container) {
        this.feedback.setState(container, 'idle');
      }

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (error) {
      const retry = () => this.loadWithFeedback(promise, container, options);
      this.setError(error, container, retry);

      if (onError) {
        onError(error);
      }

      throw error;
    }
  }

  /**
   * Show toast notification
   * @param {string} message - Toast message
   * @param {Object} options - Toast options
   */
  showToast(message, options = {}) {
    return this.feedback.showToast(message, options);
  }

  /**
   * Cleanup module
   */
  destroy() {
    this.state.initialized = false;
  }
}

export default BaseModule;
