/**
 * OBSIDIAN v4 Routes Validator
 * Validates route configuration for completeness
 */

import { BaseModule } from '../core/base-module.js';
import { i18n } from '../core/i18n.js';

export class RoutesValidator extends BaseModule {
  /**
   * Validate route configuration
   * @param {Array} routes - Route config array
   */
  validate(routes) {
    const issues = [];

    // Check each route
    routes.forEach((route, idx) => {
      if (!route.path) {
        issues.push(`Route ${idx}: Missing 'path'`);
      }

      if (!route.component && !route.title) {
        issues.push(`Route ${route.path}: Missing 'component' or 'title'`);
      }

      if (!route.title && route.path !== '*') {
        issues.push(`Route ${route.path}: Missing 'title' for navigation`);
      }

      if (route.path.includes('/') && route.path !== '/' && !route.breadcrumbs) {
        console.warn(`Route ${route.path}: Consider adding breadcrumbs for nested routes`);
      }
    });

    // Check for catch-all route
    if (!routes.some(r => r.path === '*')) {
      issues.push('Missing catch-all 404 route (path: "*")');
    }

    // Report findings
    if (issues.length > 0) {
      console.group('🔴 Route Validation Issues');
      issues.forEach(issue => console.log(`  - ${issue}`));
      console.groupEnd();

      if (this.bus) {
        this.bus.emit('routes:validation-failed', { issues });
      }
    } else {
      console.log('✅ Routes validation passed');
      if (this.bus) {
        this.bus.emit('routes:validation-passed');
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}

export default RoutesValidator;
