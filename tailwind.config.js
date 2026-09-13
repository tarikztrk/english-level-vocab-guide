module.exports = {
  content: [
    './src/**/*.{html,ts}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // IPA characters (e.g. /ˈkraʊ.dɪd/) render with broken glyphs in the UI
        // sans font; a dedicated mono face keeps phonetics legible.
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
        // Admin panel headings/wordmark use a serif pairing, per the design review.
        serif: ['"Newsreader"', 'Georgia', 'serif']
      },
      colors: {
        // Semantic tokens for admin chrome and content status, so the same
        // state never gets two different hex values across screens.
        'admin-bar': '#111723',
        'admin-bar-muted': '#9BA4B6',
        'status-draft': '#8A4B08',
        'status-draft-bg': '#FDF3E7',
        'status-live': '#1A5C31',
        'status-live-bg': '#E9F4EC',
        'status-blocked': '#8E1D14',
        'status-blocked-bg': '#FDF0EF',
        'status-blocked-border': '#F3C9C5',
        'status-duplicate': '#B42318',
        'undo-action': '#7FA8FF',

        // App Legacy Colors
        'primary-dark': '#1647BB',
        tertiary: '#F59E0B',
        primary: '#1A56DB',
        secondary: '#10B981',

        // Admin Design System Tokens
        "primary-container": "#1a56db",
        "on-surface": "#151c27",
        "on-primary-fixed": "#00174d",
        "surface-tint": "#1353d8",
        "outline": "#737686",
        "on-error-container": "#93000a",
        "secondary-fixed": "#6ffbbe",
        "on-secondary": "#ffffff",
        "surface-dim": "#d3daea",
        "surface-bright": "#f9f9ff",
        "on-tertiary-fixed": "#2a1700",
        "tertiary-fixed-dim": "#ffb95f",
        "secondary-fixed-dim": "#4edea3",
        "inverse-primary": "#b5c4ff",
        "primary-fixed-dim": "#b5c4ff",
        "on-surface-variant": "#434654",
        "tertiary-container": "#895600",
        "on-tertiary-container": "#ffd6a8",
        "on-primary": "#ffffff",
        "surface-container": "#e7eefe",
        "surface-container-lowest": "#ffffff",
        "surface-container-highest": "#dce2f3",
        "on-background": "#151c27",
        "on-primary-fixed-variant": "#003dab",
        "primary-fixed": "#dbe1ff",
        "on-error": "#ffffff",
        "inverse-on-surface": "#ebf1ff",
        "surface-container-high": "#e2e8f8",
        "on-tertiary": "#ffffff",
        "error-container": "#ffdad6",
        "surface-container-low": "#f0f3ff",
        "on-secondary-fixed-variant": "#005236",
        "on-primary-container": "#d4dcff",
        "outline-variant": "#c3c5d7",
        "inverse-surface": "#2a313d",
        "on-secondary-fixed": "#002113",
        "surface-variant": "#dce2f3",
        "background": "#f9f9ff",
        "on-secondary-container": "#00714d",
        "surface": "#f9f9ff",
        "tertiary-fixed": "#ffddb8",
        "secondary-container": "#6cf8bb",
        "on-tertiary-fixed-variant": "#653e00",
        "error": "#ba1a1a"
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px'
      },
      spacing: {
        xl: '64px',
        md: '24px',
        gutter: '24px',
        'container-max': '1200px',
        base: '8px',
        xs: '4px',
        lg: '40px',
        sm: '12px'
      },
      fontSize: {
        "display-lg": ["48px", {"lineHeight": "56px", "letterSpacing": "-0.02em", "fontWeight": "700"}],
        "headline-sm": ["20px", {"lineHeight": "28px", "fontWeight": "600"}],
        "body-lg": ["18px", {"lineHeight": "28px", "fontWeight": "400"}],
        "phonetic-label": ["15px", {"lineHeight": "20px", "fontWeight": "400"}],
        "headline-md": ["24px", {"lineHeight": "32px", "fontWeight": "600"}],
        "body-md": ["16px", {"lineHeight": "24px", "fontWeight": "400"}],
        "label-caps": ["12px", {"lineHeight": "16px", "letterSpacing": "0.05em", "fontWeight": "700"}],
        "display-lg-mobile": ["36px", {"lineHeight": "44px", "letterSpacing": "-0.02em", "fontWeight": "700"}]
      }
    },
  },
  plugins: [],
};
