/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        charter: ["'Charter'", "'Bitstream Charter'", "'Georgia'", "'Cambria'", "'Times New Roman'", 'serif'],
      },
      colors: {
        bg: {
          primary: '#111518',
          secondary: '#161b22',
          tertiary: '#1c2128',
          hover: '#21262d',
          active: '#282e36',
        },
        text: {
          primary: '#d4d2cc',
          secondary: '#949088',
          tertiary: '#7d8590',
          heading: '#e6e1d8',
        },
        accent: {
          DEFAULT: '#d4a051',
          dim: '#b8883f',
          faint: 'rgba(212, 160, 81, 0.15)',
        },
        border: {
          default: 'rgba(255, 255, 255, 0.06)',
          emphasis: 'rgba(255, 255, 255, 0.12)',
        },
        error: '#e05459',
        success: '#57ab5a',
        loading: '#8b949e',
      },
    },
  },
  plugins: [],
};
