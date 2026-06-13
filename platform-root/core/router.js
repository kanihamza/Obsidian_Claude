/**
 * OBSIDIAN v4 Router
 * Enhanced with focus management and navigation tracking
 */

import { EventBus } from './bus.js';
import { i18n } from './i18n.js';

export class Router {
  constructor(config = {}) {
    this.config = config;
    this.bus = EventBus.instance;
    this.routes = [];
    this.currentRoute = null;
    this.previousRoute = null;
  }

  /**
   * Register routes
   */
  registerRoutes(routeConfigs) {
    this.routes = routeConfigs;
    this._validateRoutes();
  }

  /**
   * Validate all routes have required properties
   * @private
   */
  _validateRoutes() {
    const issues = [];

    this.routes.forEach((route, idx) => {
      if (!route.path) issues.push(`Route ${idx} missing path`);
      if (!route.component && !route.title) {
        issues.push(`Route ${route.path} must have component or title`);
      }
      
      // Check for catch-all 404 route
      if (route.path !== '*' && !route.title) {
        issues.push(`Route ${route.path} missing title/label`);
      }
    });

    // Verify catch-all exists
    if (!this.routes.some(r => r.path === '*')) {
      issues.push('Missing catch-all 404 route (* path)');
    }

    if (issues.length > 0) {
      console.warn('[Router] Route validation issues:', issues);
      this.bus.emit('router:validation-warnings', { issues });
    }
  }

  /**
   * Navigate to route
   */
  navigate(path, state = {}) {
    const route = this._findRoute(path);

    if (!route) {
      console.warn('[Router] Route not found:', path);
      this.navigate('*');  // Fallback to 404
      return;
    }

    this.previousRoute = this.currentRoute;
    this.currentRoute = {
      path,
      ...route,
      state,
    };

    // Update browser history
    window.history.pushState(this.currentRoute, '', path);

    // Move focus to main content (a11y)
    this._manageFocus();

    // Update active nav items
    this._updateNavigation();

    // Update breadcrumbs
    this._updateBreadcrumbs();

    // Emit navigation event
    this.bus.emit('route-change', {
      to: this.currentRoute,
      from: this.previousRoute,
    });
  }

  /**
   * Find route by path
   * @private
   */
  _findRoute(path) {
    // Exact match first
    let route = this.routes.find(r => r.path === path);
    if (route) return route;

    // Dynamic route match (e.g., /users/:id)
    for (const r of this.routes) {
      if (r.path === '*') continue;  // Skip catch-all
      const pattern = this._pathToRegex(r.path);
      if (pattern.test(path)) return r;
    }

    // Fallback to catch-all 404
    return this.routes.find(r => r.path === '*');
  }

  /**
   * Convert path pattern to regex
   * @private
   */
  _pathToRegex(path) {
    const escaped = path.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    const pattern = escaped.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '(?<$1>[^/]+)');
    return new RegExp(`^${pattern}$`);
  }

  /**
   * Manage focus on route change
   * @private
   */
  _manageFocus() {
    // Find main content area
    const main = document.querySelector('main') || 
                 document.querySelector('[role="main"]') ||
                 document.querySelector('[data-main-content]');

    if (main) {
      // Make main focusable if it isn't already
      if (!main.hasAttribute('tabindex')) {
        main.setAttribute('tabindex', '-1');
      }
      
      // Focus main content
      main.focus();
      
      // Scroll to top
      window.scrollTo(0, 0);
    } else {
      // Fallback: focus body
      document.body.focus();
    }
  }

  /**
   * Update active nav items to reflect current route
   * @private
   */
  _updateNavigation() {
    // Remove aria-current from all nav items
    document.querySelectorAll('[aria-current]').forEach(el => {
      el.removeAttribute('aria-current');
      el.classList.remove('active');
    });

    // Set aria-current on matching nav item
    const currentNavItem = document.querySelector(`a[href="${this.currentRoute.path}"]`);
    if (currentNavItem) {
      currentNavItem.setAttribute('aria-current', 'page');
      currentNavItem.classList.add('active');
    }
  }

  /**
   * Update breadcrumbs to reflect current route
   * @private
   */
  _updateBreadcrumbs() {
    const breadcrumbContainer = document.querySelector('[data-breadcrumbs]');
    if (!breadcrumbContainer) return;

    if (this.currentRoute.breadcrumbs) {
      const breadcrumbs = this.currentRoute.breadcrumbs;
      const html = breadcrumbs
        .map((crumb, idx) => {
          const isLast = idx === breadcrumbs.length - 1;
          if (isLast) {
            return `<li aria-current="page">${crumb.label}</li>`;
          }
          return `<li><a href="${crumb.path}">${crumb.label}</a></li>`;
        })
        .join('');
      
      breadcrumbContainer.innerHTML = html;
    }
  }

  /**
   * Get current route
   */
  getCurrentRoute() {
    return this.currentRoute;
  }

  /**
   * Go back to previous route
   */
  goBack() {
    if (this.previousRoute) {
      this.navigate(this.previousRoute.path);
    } else {
      window.history.back();
    }
  }

  /**
   * Handle browser back/forward buttons
   */
  initializeHistoryHandling() {
    window.addEventListener('popstate', (event) => {
      if (event.state && event.state.path) {
        this.currentRoute = event.state;
        this._manageFocus();
        this._updateNavigation();
        this._updateBreadcrumbs();
        
        this.bus.emit('route-change', {
          to: this.currentRoute,
          from: this.previousRoute,
        });
      }
    });
  }
}

export default Router;
