/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Legacy brand colors — kept for backward compat
        brand: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4f52d0',
          700: '#3b3eaa',
          900: '#1a2d8f',
        },
        dark: {
          50: '#f8f9fa',
          100: '#f1f3f5',
          200: '#e9ecef',
          300: '#dee2e6',
          400: '#ced4da',
          500: '#adb5bd',
          600: '#868e96',
          700: '#495057',
          800: '#1a1b1e',
          900: '#141517',
          950: '#0d0e0f',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 4s ease-in-out infinite alternate',
        'bounce-dot': 'bounce-dot 1.4s ease-in-out infinite',
        'scale-in': 'scale-in 150ms ease-out',
        'slide-in': 'slide-in-left 200ms ease-out',
        'fade-in': 'fade-in 200ms ease-out',
      },
    }
  },
  plugins: []
}
