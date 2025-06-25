/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1E4D3A',
          50: '#E8F5EE',
          100: '#D1EBDE',
          200: '#A3D7BD',
          300: '#75C39C',
          400: '#47AF7B',
          500: '#1E4D3A',
          600: '#1A4433',
          700: '#163B2C',
          800: '#123225',
          900: '#0E291E',
          950: '#0A1F16'
        },
        accent: {
          DEFAULT: '#E86F2C',
          50: '#FCE9DE',
          100: '#FAD9C7',
          200: '#F5B89A',
          300: '#F1986D',
          400: '#EC7740',
          500: '#E86F2C',
          600: '#D15A19',
          700: '#A24614',
          800: '#73320E',
          900: '#441E09',
          950: '#2D1406'
        },
        offwhite: '#F5F5F2',
        bluegray: '#577B92'
      },
      fontFamily: {
        sans: ['Noto Sans Thai', 'sans-serif'],
        mukta: ['Mukta Mahee', 'sans-serif'],
        kanit: ['Kanit', 'sans-serif'],
        'noto-sc': ['Noto Sans SC', 'sans-serif'],
        mono: ['Courier Prime', 'monospace']
      }
    },
  },
  plugins: [],
};