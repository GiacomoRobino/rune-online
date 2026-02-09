/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        medieval: ['"Cinzel"', 'serif'],
        'medieval-decorative': ['"Cinzel Decorative"', 'serif'],
        body: ['"Crimson Text"', 'serif'],
      },
      colors: {
        stone: {
          300: '#c4b5a0',
          400: '#a89888',
          500: '#8a7a6a',
          600: '#6b5c4e',
          700: '#4a3c30',
          800: '#2a2018',
          850: '#1e170f',
          900: '#14100a',
          950: '#0d0a07',
        },
        parchment: {
          DEFAULT: '#d4a574',
          light: '#e8c9a0',
          muted: '#b89070',
          dark: '#a07048',
        },
        gold: {
          DEFAULT: '#c9a84c',
          light: '#e0c878',
          dim: '#a08030',
          dark: '#7a6020',
        },
        blood: {
          DEFAULT: '#8b0000',
          light: '#b22222',
          dark: '#5c0000',
        },
        copper: {
          DEFAULT: '#b87333',
          light: '#d4954a',
          dark: '#8a5525',
        },
        arcane: {
          DEFAULT: '#7b5ea7',
          light: '#a07ed0',
          dark: '#4a2d6e',
          glow: '#9b6dff',
        },
        mystic: {
          DEFAULT: '#4a8b7f',
          light: '#6bb5a5',
          dark: '#2a5c52',
          glow: '#5de0c8',
        },
      },
      boxShadow: {
        'metal': '0 1px 3px rgba(201, 168, 76, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'metal-lg': '0 2px 8px rgba(201, 168, 76, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
        'stone-inset': 'inset 0 2px 4px rgba(0, 0, 0, 0.6), inset 0 -1px 2px rgba(255, 255, 255, 0.05)',
        'emboss': '0 1px 0 rgba(255, 255, 255, 0.1), 0 -1px 0 rgba(0, 0, 0, 0.3)',
        'blood-glow': '0 0 10px rgba(139, 0, 0, 0.6), 0 0 20px rgba(139, 0, 0, 0.3)',
        'gold-glow': '0 0 10px rgba(201, 168, 76, 0.5), 0 0 20px rgba(201, 168, 76, 0.25)',
        'card': '0 2px 6px rgba(0, 0, 0, 0.5), 0 1px 2px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [],
};
