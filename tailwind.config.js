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
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
          DEFAULT: '#ef4444',
          foreground: '#fef2f2',
        },
        accent: {
          cyan: '#06b6d4',
          purple: '#a855f7',
          orange: '#f97316',
          DEFAULT: '#06b6d4',
        },
        surface: {
          dark: '#0f172a',
          darker: '#020617',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.6s ease-out',
        'slide-in-right': 'slideInRight 0.8s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)' },
          '100%': { boxShadow: '0 0 30px rgba(239, 68, 68, 0.6)' },
        },
      },
    },
  },
  plugins: [],
}

