# OBSIDIAN v4 Testing Guide

**Last Updated:** June 13, 2026

---

## Testing Strategy

OBSIDIAN v4 uses a multi-layer testing approach:

1. **Manual Testing** — User-focused validation
2. **A11y Testing** — Accessibility compliance
3. **Component Testing** — Unit tests for components
4. **Integration Testing** — Module interactions
5. **E2E Testing** — Full user flows

---

## Accessibility Testing

### Automated A11y Scan

```js
import UIAccessibilityMonitor from '/modules/ui-a11y-monitor.js';

const monitor = new UIAccessibilityMonitor();
const issues = monitor.scan();
```

### Manual A11y Testing

#### Keyboard Navigation
1. Tab through entire page
2. Shift+Tab to go backward
3. Tab should be logical (top-to-bottom)
4. Focus ring must be visible
5. Modal should trap focus
6. Escape should close modal

#### Screen Reader (NVDA/JAWS/VoiceOver)
1. Page title announces correctly
2. Navigation landmarks announced
3. Form labels associated
4. Active nav item marked with `aria-current`
5. Loading states announced
6. Error messages announced
7. Success messages announced
8. Toast notifications announced

#### Color Contrast
- Normal text: 4.5:1 (WCAG AA)
- Large text (18pt+): 3:1 (WCAG AA)
- Focus indicators: Clearly visible

#### Reduced Motion
1. Enable "Reduce motion" in OS settings
2. Animations should be disabled or instant
3. Page should be fully usable without motion

---

## Component Testing

### Focus Management
- [ ] Focus moves to main content after route change
- [ ] Focus trap works in modals
- [ ] Focus restoration on modal close
- [ ] Visible focus ring on all interactive elements

### Loading States
- [ ] Spinner shows after 300ms delay
- [ ] "Slow load" message shows after 2 seconds
- [ ] aria-busy="true" set during loading
- [ ] aria-live region announces status

### Error Handling
- [ ] Error message displays clearly
- [ ] Retry button appears and works
- [ ] Error doesn't block UI
- [ ] Retry is accessible via keyboard

### Toast Notifications
- [ ] Success toast auto-dismisses after 5 seconds
- [ ] Error toast doesn't auto-dismiss
- [ ] Toast is announced to screen readers
- [ ] Close button is accessible

### Empty States
- [ ] Empty icon displays
- [ ] Message is clear and helpful
- [ ] Action button (if provided) works
- [ ] No scroll/overflow issues

---

## Responsive Design Testing

### Device Breakpoints
- [ ] **Mobile (320px)**: Single column, no overflow
- [ ] **Mobile (480px)**: Adjusted spacing
- [ ] **Tablet (640px)**: 2-column layout
- [ ] **Desktop (1024px)**: Full layout
- [ ] **Large (1280px+)**: Max-width applies

### Orientations
- [ ] Portrait: Correct layout
- [ ] Landscape: Correct layout
- [ ] Notch devices: Safe area respected

### Touch Interactions
- [ ] All buttons >= 44×44px
- [ ] Touch targets have adequate spacing
- [ ] No hover-only interactions
- [ ] Inputs don't zoom on focus (font-size: 16px)

---

## Performance Testing

### Metrics
- [ ] First Contentful Paint: < 1.5s
- [ ] Largest Contentful Paint: < 2.5s
- [ ] Cumulative Layout Shift: < 0.1
- [ ] Time to Interactive: < 3.5s

### Optimization Checklist
- [ ] CSS minified
- [ ] No render-blocking resources
- [ ] No console warnings/errors
- [ ] Debounced resize/scroll handlers
- [ ] Lazy load images if needed

---

## Validation Checklist

### Functionality
- [ ] All features work as documented
- [ ] No console errors
- [ ] Forms submit correctly
- [ ] Navigation works
- [ ] Errors are recoverable

### Accessibility
- [ ] WCAG 2.1 AA compliant
- [ ] Keyboard navigable
- [ ] Screen reader friendly
- [ ] Color contrast verified
- [ ] Touch targets 44px+
- [ ] Reduced motion respected

### Responsive
- [ ] Mobile layout correct
- [ ] Tablet layout correct
- [ ] Desktop layout correct
- [ ] No horizontal scroll
- [ ] Landscape works

### Cross-Browser
- [ ] Chrome: Pass
- [ ] Firefox: Pass
- [ ] Safari: Pass
- [ ] Edge: Pass
- [ ] Mobile Safari: Pass
- [ ] Android Chrome: Pass

### Internationalization
- [ ] All languages render correctly
- [ ] No missing translation keys
- [ ] Language switching works
- [ ] Persistence works

---

## Offline Testing

1. Open DevTools → Network tab
2. Check "Offline"
3. Try to navigate
4. See offline banner
5. Check offline state on pages
6. Turn offline off
7. Banner disappears
8. Features restore

---

## Browser DevTools Checks

**Console:**
- [ ] No errors
- [ ] No warnings
- [ ] No 404s

**Network:**
- [ ] All requests succeed
- [ ] No failed resources
- [ ] Response times acceptable

**Elements:**
- [ ] Semantic HTML used
- [ ] ARIA attributes correct
- [ ] No duplicate IDs
- [ ] Proper nesting

**Accessibility:**
- [ ] Lighthouse score 90+
- [ ] No a11y violations
- [ ] Contrast checker passes
- [ ] Labels associated

---

## Before Deployment

```bash
✓ All manual tests pass
✓ No console errors
✓ Keyboard navigation works
✓ Screen reader friendly
✓ Mobile layouts correct
✓ Touch targets 44px+
✓ Color contrast verified
✓ All languages work
✓ Offline handling works
✓ Performance metrics met
```

---

**Questions?** Refer to COMPONENTS.md or ARCHITECTURE.md.