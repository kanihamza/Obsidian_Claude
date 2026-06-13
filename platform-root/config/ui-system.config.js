/**
 * OBSIDIAN v4 UI System Configuration
 * Central source of truth for layout, typography, spacing, motion, accessibility
 * 
 * All component implementations must derive values from these tokens
 * to ensure consistency across the platform.
 */

export const UI_SYSTEM = {
  // ==================== BREAKPOINTS ====================
  // Mobile-first responsive design targets
  BREAKPOINTS: {
    xs: 0,        // Mobile: 320px – 479px
    sm: 480,      // Mobile landscape: 480px – 639px
    md: 640,      // Tablet portrait: 640px – 1023px
    lg: 1024,     // Desktop: 1024px – 1279px
    xl: 1280,     // Large desktop: 1280px+
    
    // Query helpers
    query: {
      xs: '(min-width: 0)',
      sm: '(min-width: 480px)',
      md: '(min-width: 640px)',
      lg: '(min-width: 1024px)',
      xl: '(min-width: 1280px)',
      
      // Landscape
      landscape: '(orientation: landscape)',
      portrait: '(orientation: portrait)',
      
      // Touch
      touchOnly: '(hover: none) and (pointer: coarse)',
      mouseOnly: '(hover: hover) and (pointer: fine)',
      
      // Prefers reduced motion
      reducedMotion: '(prefers-reduced-motion: reduce)',
      
      // Print
      print: 'print',
    },
  },

  // ==================== GRID & LAYOUT ====================
  GRID: {
    // Column counts per breakpoint (mobile-first)
    columns: {
      xs: 1,
      sm: 1,
      md: 2,
      lg: 12,
      xl: 12,
    },
    
    // Gap between grid items (spacing scale)
    gap: {
      xs: 16,  // 16px on mobile
      md: 24,  // 24px on tablet+
      lg: 32,  // 32px on desktop+
    },
    
    // Max content width (prevents over-wide content on large screens)
    maxWidth: 1440,
    
    // Safe padding around edges
    margin: {
      xs: 16,
      sm: 16,
      md: 24,
      lg: 32,
      xl: 40,
    },
  },

  // ==================== SPACING SCALE ====================
  // 4px base unit (recommended: use in increments)
  SPACING: {
    0: '0',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
    20: '80px',
    24: '96px',
  },

  // ==================== TYPOGRAPHY ====================
  TYPOGRAPHY: {
    // Font stacks
    fontFamily: {
      base: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
    },

    // Font sizes (mobile-first)
    fontSize: {
      xs: { mobile: '12px', desktop: '12px' },
      sm: { mobile: '14px', desktop: '14px' },
      base: { mobile: '16px', desktop: '16px' },
      lg: { mobile: '18px', desktop: '18px' },
      xl: { mobile: '20px', desktop: '20px' },
      '2xl': { mobile: '24px', desktop: '28px' },
      '3xl': { mobile: '28px', desktop: '32px' },
      '4xl': { mobile: '32px', desktop: '40px' },
    },

    // Heading scale (mobile-first)
    heading: {
      h1: { size: '32px', weight: 700, lineHeight: 1.2, mobileSize: '28px' },
      h2: { size: '24px', weight: 600, lineHeight: 1.25, mobileSize: '22px' },
      h3: { size: '20px', weight: 600, lineHeight: 1.3, mobileSize: '18px' },
      h4: { size: '18px', weight: 600, lineHeight: 1.35, mobileSize: '16px' },
      h5: { size: '16px', weight: 600, lineHeight: 1.4, mobileSize: '14px' },
      h6: { size: '14px', weight: 600, lineHeight: 1.4, mobileSize: '13px' },
    },

    // Body text styles
    body: {
      large: { size: '18px', weight: 400, lineHeight: 1.6 },
      base: { size: '16px', weight: 400, lineHeight: 1.5 },
      small: { size: '14px', weight: 400, lineHeight: 1.5 },
      xs: { size: '12px', weight: 400, lineHeight: 1.5 },
    },

    // Letter spacing
    letterSpacing: {
      tight: '-0.02em',
      normal: '0',
      wide: '0.02em',
    },
  },

  // ==================== MOTION & TRANSITIONS ====================
  MOTION: {
    // Transition durations (fast for feedback, slow for navigation)
    duration: {
      instant: '0ms',
      fast: '100ms',
      normal: '200ms',
      slow: '300ms',
      slower: '500ms',
      slowest: '800ms',
    },

    // Easing functions
    easing: {
      linear: 'linear',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },

    // Common transition combinations
    transition: {
      // Quick feedback (opacity, color)
      fast: 'all 100ms cubic-bezier(0.4, 0, 0.2, 1)',
      // Standard interactions (position, size)
      normal: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
      // Page transitions
      slow: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
      // Discreet animations (opacity only for reduced motion)
      subtle: 'opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },

  // ==================== ACCESSIBILITY ====================
  A11Y: {
    // Touch target minimum size (WCAG 2.1 Level AAA)
    TOUCH_TARGET: '44px',

    // Focus outline style
    focusOutline: {
      width: '2px',
      color: '#0066cc',  // Will be overridden by theme token
      offset: '2px',
      style: 'solid',
    },

    // Keyboard navigation
    tabIndex: {
      interactive: 0,
      focusTarget: -1,  // Used for skip-link targets
    },
  },

  // ==================== Z-INDEX LAYERS ====================
  // Stacking context hierarchy (prevent z-index wars)
  Z_INDEX: {
    base: 1,
    elevated: 100,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    backdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
    notification: 2000,
  },

  // ==================== FEEDBACK UI DEFAULTS ====================
  FEEDBACK: {
    // Toast/notification settings
    toast: {
      position: 'bottom-right',  // bottom-left, bottom-center, bottom-right, top-left, top-center, top-right
      maxVisible: 5,
      autoDismissMs: 5000,  // 5 seconds for success/info
      errorAutoDismissMs: null,  // Error toasts don't auto-dismiss
      stackGap: 16,  // px between stacked toasts
    },

    // Loading indicator defaults
    loading: {
      spinnerSize: 'md',  // sm, md, lg
      showAfterMs: 300,  // Only show spinner after 300ms (quick operations feel instant)
      slowLoadMs: 2000,  // Show "taking longer..." message after 2 seconds
    },

    // Skeleton placeholder defaults
    skeleton: {
      animated: 'shimmer',  // shimmer, pulse, none
      shimmerDuration: 1000,  // 1 second per shimmer cycle
    },

    // Modal defaults
    modal: {
      closeOnEscape: true,
      closeOnBackdropClick: false,  // Usually false for safety; dismiss button required
      restoreFocusOnClose: true,
    },

    // Form validation
    form: {
      validateOn: 'blur',  // blur, change, submit
      showErrorsBeforeSubmit: false,  // Don't show errors until user tries to submit
      focusFirstErrorOnSubmit: true,
    },
  },

  // ==================== BROWSER COMPATIBILITY BASELINE ====================
  BROWSER_BASELINE: {
    // Minimum versions to officially support
    chrome: 90,        // March 2021
    firefox: 88,       // April 2021
    safari: 14,        // November 2020
    edge: 90,          // March 2021
    
    // Note: Zero-build ESM requires modern browser support
    // ES6 modules, Fetch API, Custom Elements, CSS Grid all required
    note: 'OBSIDIAN v4 requires zero-build ESM support. IE11 not supported.',
  },

  // ==================== DENSITY MODES ====================
  // Allow apps to toggle between compact and comfortable layouts
  DENSITY: {
    compact: {
      spacingMultiplier: 0.75,
      lineHeightMultiplier: 0.9,
      touchTargetMin: '36px',  // Tighter for dense UIs
    },
    normal: {
      spacingMultiplier: 1.0,
      lineHeightMultiplier: 1.0,
      touchTargetMin: '44px',
    },
    comfortable: {
      spacingMultiplier: 1.25,
      lineHeightMultiplier: 1.1,
      touchTargetMin: '48px',  // Larger for accessibility-focused UIs
    },
  },

  // ==================== UTILS ====================
  // Helper function to get responsive value
  responsive: (values) => {
    // Usage: UI_SYSTEM.responsive({ xs: '1fr', md: '2fr', lg: '1fr 1fr 1fr' })
    // Returns CSS variable reference that must be set in media queries
    return values;
  },

  // Helper to generate media query string
  media: (breakpoint) => {
    const query = UI_SYSTEM.BREAKPOINTS.query[breakpoint];
    if (!query) throw new Error(`Unknown breakpoint: ${breakpoint}`);
    return query;
  },
};

export default UI_SYSTEM;
