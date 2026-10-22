/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        coral: {
          DEFAULT: '#FF5B37',
          hover: '#E84723',
          light: '#FFF1EE',
        },
        sunshine: {
          DEFAULT: '#FFB800',
          hover: '#E6A600',
          light: '#FEF9C3',
        },
        iris: {
          DEFAULT: '#7C5DFA',
          hover: '#6747E6',
          light: '#F3E8FF',
        },
        mint: {
          DEFAULT: '#10B981',
          hover: '#059669',
          light: '#ECFDF5',
        },
        sky: {
          DEFAULT: '#0EA5E9',
          light: '#E0F2FE',
        },
        canvas: '#FAFAFC',
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
        mono: ['Roboto Mono', 'JetBrains Mono', 'monospace'],
      },

      boxShadow: {
        'cheerful': '0 10px 25px -5px rgba(255, 91, 55, 0.15), 0 8px 10px -6px rgba(255, 91, 55, 0.1)',
        'card-soft': '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
        'ticket': '0 20px 40px -15px rgba(124, 93, 250, 0.12)',
      },
    },
  },
  plugins: [],
}
