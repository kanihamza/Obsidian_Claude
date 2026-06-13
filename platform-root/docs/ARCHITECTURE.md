# OBSIDIAN v4 Architecture Guide

**Last Updated:** June 13, 2026  
**Version:** 4.0

---

## System Overview

OBSIDIAN v4 is a **Zero-Build JavaScript Platform** built on:

- **ESM Modules** (no bundler)
- **Web Components** (custom elements)
- **CSS Tokens** (design system)
- **Configuration-Driven** (data > code)
- **Event-Driven** (pub/sub messaging)
- **Functional Core** (pure logic, side-effect isolation)

### Design Philosophy

1. **Simplicity** — Easy to understand, modify, extend
2. **Transparency** — Source code is the documentation
3. **Explicitness** — No magic, all imports visible
4. **Zero Runtime Overhead** — No frameworks, no bundling
5. **Accessibility-First** — Built into the core, not bolted on

---

## Directory Structure

```
platform-root/
├── index.html                          # App entry point
├── config/                             # Configuration layer
│   ├── ui-system.config.js            # UI tokens
│   └── i18n/                          # Internationalization
│       ├── en.json                    # English
│       ├── fr.json                    # French
│       └── ha.json                    # Hausa
├── core/                              # Core modules
│   ├── ui-feedback.js                 # Feedback system
│   ├── base-module.js                 # Module base class
│   └── router.js                      # URL routing
├── shared/                             # Shared utilities
│   └── components/                    # Web Components
│       ├── pf-app-shell.js            # Main layout
│       ├── pf-app-header.js           # Header
│       ├── pf-app-nav.js              # Navigation
│       ├── pf-breadcrumb.js           # Breadcrumbs
│       ├── pf-toast.js                # Toasts
│       └── pf-modal.js                # Modals
├── styles/                             # CSS
│   ├── responsive.css                 # Responsive design
│   └── components.css                 # Component styles
├── modules/                            # Feature modules
│   ├── ui-a11y-monitor.js             # A11y validator
│   └── ui-routes-validator.js         # Routes validator
├── docs/                               # Documentation
│   ├── COMPONENTS.md                  # Component library
│   ├── TESTING.md                     # Testing guide
│   └── ARCHITECTURE.md                # This file
└── assets/                             # Static files
    ├── icons/
    └── images/
```

---

## Core Concepts

### 1. Configuration-Driven Architecture

Most behavior is declared in config files, not code:

```js
// config/ui-system.config.js
export const UI_SYSTEM = {
  BREAKPOINTS: { xs: 0, sm: 480, md: 640, ... },
  SPACING: { 0: '0', 1: '4px', ... },
  TYPOGRAPHY: { ... },
  MOTION: { ... },
  A11Y: { ... },
};
```

**Benefits:**
- Non-developers can edit config
- No code recompile needed
- Easier to test (config is data)

### 2. Event-Driven Communication

Modules communicate via pub/sub (EventBus), not direct calls:

```js
// Trigger event
this.bus.emit('user:logout', { user });

// Listen for event
this.bus.on('user:logout', () => {
  profile.clear();
});
```

**Benefits:**
- Modules don't depend on each other
- Easy to add new listeners
- Testing is simpler (mock bus)

### 3. Layered Architecture

```
┌─ UI Layer (Web Components)
├─ Controller Layer (Modules)
├─ Service Layer (Business Logic)
├─ Data Layer (State, Storage, API)
└─ Core Layer (Platform Primitives)
```

### 4. State Management

**Immutable state updates:**

```js
// Never mutate directly
this.state = { ...this.state, ...updates };
this.notify();
```

### 5. Feedback Integration

Every async operation has automatic feedback:

```js
await loadWithFeedback(promise, container, {
  onSuccess: (data) => render(data),
  onError: (error) => log(error),
  onEmpty: { message: 'No items' }
});
```

---

## Module System

### Creating a Module

```js
import { BaseModule } from '../../core/base-module.js';

export class DashboardModule extends BaseModule {
  async init() {
    await super.init();
    this.setupListeners();
  }

  async loadStats() {
    const container = document.getElementById('stats');
    return this.loadWithFeedback(this.api.get('/stats'), container);
  }
}
```

---

## Routing System

### Route Registration

```js
router.registerRoutes([
  {
    path: '/',
    component: DashboardModule,
    title: 'Dashboard'
  },
  {
    path: '/users/:id',
    component: UserDetailModule,
    title: 'User Profile'
  },
  {
    path: '*',
    component: NotFoundModule,
    title: '404 Not Found'
  }
]);
```

### Navigation Flow

```
URL Change
   ↓
Router finds route
   ↓
Set loading state
   ↓
Activate new module
   ↓
Focus main content
   ↓
Update nav (aria-current)
   ↓
Update breadcrumbs
   ↓
Emit route-change event
```

---

## UI Feedback System

### Feedback States

```js
IDLE → LOADING → SUCCESS/ERROR/EMPTY/OFFLINE
```

**Usage:**

```js
UIFeedbackInstance.setState(container, 'loading');
UIFeedbackInstance.setState(container, 'success', { 
  message: 'Saved!' 
});
UIFeedbackInstance.setState(container, 'error', {
  message: 'Failed',
  onRetry: () => retry()
});
```

---

## Accessibility Architecture

### Built-In A11y

1. **Semantic HTML** — Use native elements
2. **ARIA Labels** — Complete ARIA coverage
3. **Focus Management** — Focus main after route change
4. **Focus Trap** — Modals trap focus
5. **Live Regions** — aria-live announcements
6. **Keyboard Navigation** — All elements keyboard accessible
7. **Color Contrast** — 4.5:1 (WCAG AA)
8. **Touch Targets** — 44×44px minimum

### A11y Monitoring

```js
const monitor = new UIAccessibilityMonitor();
const issues = monitor.scan();
```

---

## Internationalization

### Translation System

```js
import { i18n } from '/core/i18n.js';

const message = i18n.t('feedback.loading');
i18n.setLanguage('fr');
```

### Supported Languages

- English (en) — Default
- French (fr)
- Hausa (ha)

---

## Performance Considerations

### Zero-Build Benefits

✅ No build step = instant development  
✅ Native modules = only load what's needed  
✅ No tree-shaking = explicit imports  
✅ Smaller files = better caching

### Optimization Strategies

1. **Lazy Load Modules**
```js
const ModuleClass = await import(`/modules/${route.module}/index.js`);
const module = new ModuleClass();
```

2. **Debounce High-Frequency Events**
```js
window.addEventListener('resize', debounce(() => {
  layout.recalculate();
}, 250));
```

3. **Event Delegation**
```js
container.addEventListener('click', (e) => {
  if (e.target.matches('[data-item]')) {
    handler(e.target);
  }
});
```

---

## Security Posture

### No External Dependencies

✅ No npm packages = no supply chain risk  
✅ All code in repository = auditability  
✅ No build tools = reduced attack surface

### Secure by Default

✅ Configuration-driven (not runtime eval)  
✅ No inline scripts  
✅ No direct DOM innerHTML without sanitization  
✅ HTTPS-only API calls

---

## Deployment

### Build Artifacts

```
dist/
├── index.html
├── core/
├── shared/
├── modules/
├── styles/
├── config/
└── assets/
```

### Deployment Steps

1. Run verification
```bash
./tools/verify.sh
```

2. Copy to web server
```bash
cp -r . /var/www/obsidian/
```

3. Configure web server (SPA routing)
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

---

## FAQ

**Q: Why no framework?**  
A: Simpler codebase, zero runtime overhead, full control

**Q: Why no build step?**  
A: Instant development, native browser modules

**Q: How do I handle complex state?**  
A: Use event bus for cross-module communication

**Q: Can I use React/Vue?**  
A: Yes, but build a module wrapper around it

**Q: How do I add dark mode?**  
A: Create theme.dark.css, switch via theme-manager

**Q: How does this scale?**  
A: Use lazy loading, modular architecture separates concerns

---

**Last Updated:** June 13, 2026  
**Maintained By:** Development Team