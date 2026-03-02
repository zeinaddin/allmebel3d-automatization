/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#faf9f7',
          100: '#f0ede8',
          200: '#e0dbd2',
          300: '#c5bdb0',
          400: '#a69b8b',
          500: '#8a7d6d',
          600: '#6d6054',
          700: '#574d43',
          800: '#433b33',
          900: '#332d27',
        },
        accent: {
          50: '#fef9f0',
          100: '#fcefd8',
          200: '#f8ddb0',
          300: '#f0c47a',
          400: '#e5a54a',
          500: '#d4923a',
          600: '#b87a2a',
          700: '#a36620',
        },
      },
    },
  },
  plugins: [],
};
