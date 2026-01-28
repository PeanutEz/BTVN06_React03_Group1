/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Poppins', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#fdf7f1',
          100: '#f7e9dc',
          200: '#ebd0b6',
          300: '#dfb088',
          400: '#cf8c5b',
          500: '#bc7041',
          600: '#9c562f',
          700: '#7b4226',
          800: '#4f2919',
          900: '#2d170f',
          DEFAULT: '#9c562f',
          foreground: '#fff8f2',
        },
        accent: '#f0c987',
        surface: '#0f0a08',
      },
    },
  },
  plugins: [],
}

