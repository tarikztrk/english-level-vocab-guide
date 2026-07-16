module.exports = {
  content: [
    './src/**/*.{html,ts}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1A56DB',
        'primary-dark': '#1647BB',
        secondary: '#10B981',
        tertiary: '#F59E0B',
        background: '#F9FAFB',
        surface: '#ffffff',
        'surface-variant': '#dce2f3',
        'surface-container': '#e7eefe',
        'surface-container-low': '#f0f3ff',
        'surface-container-high': '#e2e8f8',
        'surface-container-lowest': '#ffffff',
        'on-surface': '#151c27',
        'on-surface-variant': '#434654',
        'outline-variant': '#c3c5d7',
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '0.75rem',
      },
      spacing: {
        gutter: '24px',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
