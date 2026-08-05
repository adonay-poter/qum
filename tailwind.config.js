/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#E8E4DB',
        secondary: '#857F72',
        tertiary: '#FF6B1A',
        neutral: '#0E0D0A',
        surface: '#161410',
        'on-primary': '#0E0D0A',
      },
      fontFamily: {
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
        bela: ['"Bela Bereka"', '"Noto Sans Ethiopic"', 'serif'],
      },
      borderRadius: {
        sm: '0px',
        md: '2px',
        lg: '4px',
      },
      spacing: {
        'qum-sm': '8px',
        'qum-md': '16px',
        'qum-lg': '32px',
      },
      fontSize: {
        display: ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        h1: ['1.85rem', { lineHeight: '1.2', fontWeight: '600' }],
        body: ['0.92rem', { lineHeight: '1.55' }],
        label: ['0.7rem', { lineHeight: '1.4', letterSpacing: '0.12em' }],
      },
      animation: {
        'urge-pulse': 'urge-pulse 6s ease-in-out infinite',
        'urge-ripple': 'urge-ripple 2.4s ease-out infinite',
        'urge-glow': 'urge-glow 6s ease-in-out infinite',
        'urge-enter': 'urge-enter 0.6s ease-out both',
        'victory-pop': 'victory-pop 0.55s ease-out both',
        'victory-rise': 'victory-rise 0.7s ease-out both',
        'victory-xp': 'victory-xp 1.2s ease-out both',
        'shield-pulse': 'shield-pulse 1.8s ease-in-out infinite',
      },
      keyframes: {
        'urge-pulse': {
          '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 24px rgba(255, 107, 26, 0.12)' },
          '50%': { transform: 'scale(1.025)', boxShadow: '0 0 38px rgba(255, 107, 26, 0.22)' },
        },
        'urge-ripple': {
          '0%': { transform: 'scale(0.92)', opacity: '0.5' },
          '100%': { transform: 'scale(1.65)', opacity: '0' },
        },
        'urge-glow': {
          '0%, 100%': { opacity: '0.12' },
          '50%': { opacity: '0.28' },
        },
        'urge-enter': {
          '0%': { transform: 'scale(0.88)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'victory-pop': {
          '0%': { transform: 'scale(0.85)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'victory-rise': {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'victory-xp': {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '60%': { transform: 'scale(1.08)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'shield-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
      },
    },
  },
  plugins: [],
};
