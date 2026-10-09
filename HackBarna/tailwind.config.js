/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // GBA overworld palette — flat, saturated, warm-but-limited
        gba: {
          grass: '#8fb04f',
          grassDark: '#6d8f3d',
          dirt: '#b08a52',
          sand: '#d6b56b',
          water: '#4f7fbf',
          trunk: '#7a5233',
          leaf: '#3d7a3d',
          fire: '#e0581e',
          fireHi: '#f4a92d',
          ember: '#c02c10',
          smoke: '#6b7077',
          smokeHi: '#8a8f96',
          uiBg: '#1a1d2b',
          uiBorder: '#5a5f74',
          uiText: '#e8e3d0',
          uiDim: '#8b8675',
          uiAccent: '#f4a92d',
          uiGood: '#6fbf5a',
          uiBad: '#e0503a',
          uiInfo: '#5aa8e0',
        },
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        pixel2: ['Silkscreen', 'monospace'],
      },
      keyframes: {
        blink: {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
        'type-caret': {
          '0%, 49%': { borderColor: 'transparent' },
          '50%, 100%': { borderColor: '#f4a92d' },
        },
      },
      animation: {
        blink: 'blink 1s steps(1) infinite',
      },
    },
  },
  plugins: [],
}
