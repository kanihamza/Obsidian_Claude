# OBSIDIAN v4 Component Library

**Status:** Implementation-Ready  
**Last Updated:** June 13, 2026

---

## Overview

This document describes the OBSIDIAN v4 component system, a Zero-Build ESM architecture using Web Components and Custom Elements.

### Design Principles

1. **No External Dependencies** — All components are native JavaScript
2. **Accessibility First** — WCAG 2.1 AA compliance built-in
3. **Mobile-First** — Responsive design from 320px+
4. **Token-Driven** — Styling through CSS variables/tokens
5. **Configuration-Driven** — Behavior driven by config, not code

---

## Available Components

### Core Shell Components

#### `<pf-app-shell>`
Main layout container (header, nav, content areas)

**Features:**
- Responsive grid layout (mobile: stacked → desktop: sidebar)
- Accessibility landmarks
- Safe area support (notch devices)

**Usage:**
```html
<pf-app-shell>
  <header slot="header">...</header>
  <nav slot="nav">...</nav>
  <main slot="content">...</main>
</pf-app-shell>
```

#### `<pf-app-header>`
Top application header with branding and controls

**Features:**
- Logo and app name
- Language switcher with persistence
- Settings and account menu
- Touch-safe buttons (44px minimum)

#### `<pf-app-nav>`
Main navigation with active route tracking

**Features:**
- `aria-current="page"` for active routes
- Focus-visible keyboard navigation
- Responsive (horizontal → vertical)
- Mobile hamburger support (JS integration)

#### `<pf-breadcrumb>` & `<pf-breadcrumb-item>`
Breadcrumb navigation trail

**Attributes:**
- `href` — Link destination
- `aria-current` — Marks current page

### Feedback Components

#### Toast Notifications (`<pf-toast>`)
Non-blocking notifications for user feedback

**Attributes:**
- `data-type` — Type: info, success, warning, error
- `data-no-dismiss` — Hide dismiss button

**Auto-dismiss:**
- info, success: 5 seconds
- warning, error: permanent (user must dismiss)

#### Modal Dialogs (`<pf-modal>`)
Accessible modal dialogs with focus trap

**Features:**
- `role="dialog"` and `aria-modal="true"`
- Focus trap (Tab cycles within modal)
- Escape key closes
- Backdrop click closes (if configured)
- Focus restoration on close

**Usage:**
```js
const modal = document.createElement('pf-modal');
modal.setAttribute('aria-label', 'Confirm Action');
modal.innerHTML = '<p>Are you sure?</p>';
document.body.appendChild(modal);

modal.addEventListener('modal-closed', () => console.log('Closed'));
```

### Feedback System

#### UIFeedback System (`core/ui-feedback.js`)
Centralized feedback management

**States:**
- `IDLE` — Default state
- `LOADING` — Data fetching
- `SLOW_LOAD` — Taking longer than expected
- `SUCCESS` — Operation succeeded
- `ERROR` — Operation failed (with retry)
- `EMPTY` — No data available
- `OFFLINE` — User is offline

**Usage:**
```js
import { UIFeedbackInstance } from '/core/ui-feedback.js';

// Set loading state
UIFeedbackInstance.setState(container, 'loading', {
  message: 'Loading data...'
});

// Show toast
UIFeedbackInstance.showToast('Saved successfully', { type: 'success' });
```

---

## Styling System

### CSS Architecture

**Layers (in order):**
1. `responsive.css` — Breakpoints, grids, flexbox
2. `components.css` — Component-specific styles

### Responsive Utilities

**Breakpoints:**
```css
/* xs: 0px (mobile) */
/* sm: 480px (mobile landscape) */
/* md: 640px (tablet) */
/* lg: 1024px (desktop) */
/* xl: 1280px (large desktop) */
```

**Grid Classes:**
```html
<!-- Single column on mobile, 3 columns on desktop -->
<div class="pf-grid col-3">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```

**Flexbox Utilities:**
```html
<div class="pf-flex pf-flex-between pf-flex-gap">
  <!-- Items space-between with gap -->
</div>
```

---

## Accessibility Features

### Built-In A11y

1. **Semantic HTML**
   - `<main>` for primary content
   - `<nav>` for navigation
   - `<button>` for buttons (not `<div>`)
   - `<label>` for form inputs

2. **ARIA Labels**
   - `aria-current="page"` for active nav items
   - `aria-busy="true"` for loading states
   - `aria-live="polite"` for non-urgent announcements
   - `aria-live="assertive"` for errors/alerts
   - `aria-label` for icon buttons

3. **Focus Management**
   - `tabindex="-1"` on main content (focus after route change)
   - Focus trap in modals
   - Skip link to main content
   - Visible focus rings (`:focus-visible`)

4. **Touch Targets**
   - All buttons: minimum 44×44px
   - All inputs: minimum 44px height
   - 16px+ font size (prevents iOS zoom)

5. **Color Contrast**
   - WCAG AA compliant (4.5:1 for normal text)
   - Focus indicators in high contrast

6. **Reduced Motion**
   - `@media (prefers-reduced-motion: reduce)` for all animations
   - Instant transitions for users who prefer reduced motion

### A11y Testing

**Runtime Monitor:**
```js
import UIAccessibilityMonitor from '/modules/ui-a11y-monitor.js';

const monitor = new UIAccessibilityMonitor({ enabled: true });
const issues = monitor.scan();
```

---

## State Management

### Module State with Feedback

```js
import { BaseModule } from '/core/base-module.js';

class MyModule extends BaseModule {
  async loadData() {
    const container = document.getElementById('content');
    
    try {
      this.setLoading(true, container);
      const data = await fetch('/api/data').then(r => r.json());
      
      if (data.length === 0) {
        this.setEmpty(container, {
          message: 'No items yet',
          actionLabel: 'Create New',
          onAction: () => this.createNew()
        });
      } else {
        container.innerHTML = renderData(data);
      }
    } catch (error) {
      this.setError(error, container, () => this.loadData());
    }
  }
}
```

---

## Internationalization

### Supported Languages

- English (en)
- French (fr)
- Hausa (ha)

### Using Translations

```js
import { i18n } from '/core/i18n.js';
const message = i18n.t('feedback.loading');
```

---

## Browser Support

**Minimum Versions:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Features Required:**
- ES6 modules
- Fetch API
- Custom Elements
- CSS Grid/Flexbox
- CSS Variables

Internet Explorer 11 is **not** supported.

---

**Questions?** Refer to ARCHITECTURE.md or TESTING.md for more details.