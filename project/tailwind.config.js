/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f0faf4',
          100: '#dcf5e5',
          200: '#bbebcc',
          300: '#87d9a7',
          400: '#4dbf7a',
          500: '#28a459',
          600: '#1B4D3E',
          700: '#165c3a',
          800: '#134a31',
          900: '#0f3d28',
        },
        cream: {
          50: '#fdfaf5',
          100: '#F5E6D3',
          200: '#ead5bc',
          300: '#dbbf9e',
          400: '#c8a07a',
          500: '#b5825a',
        },
        ember: {
          500: '#C2410C',
          600: '#a83509',
        },
        ocean: {
          800: '#0F2A3F',
          900: '#091c2b',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
    },
  },
  plugins: [],
};
