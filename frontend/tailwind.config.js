/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#7367F0',
          light: '#9E95F5',
          dark: '#5E50EE',
          50: '#F3F2FE',
          100: '#E8E6FD',
          200: '#D0CCFB',
          300: '#B9B3F9',
          400: '#A199F7',
          500: '#7367F0',
          600: '#5A4ED8',
          700: '#4135C0',
          800: '#2D2698',
          900: '#1A1770',
        },
        success: {
          DEFAULT: '#28C76F',
          light: '#55DD92',
          dark: '#1F9D57',
        },
        warning: {
          DEFAULT: '#FF9F43',
          light: '#FFB976',
          dark: '#E08524',
        },
        danger: {
          DEFAULT: '#EA5455',
          light: '#F08182',
          dark: '#C73E3E',
        },
        info: {
          DEFAULT: '#00CFE8',
          light: '#4CE5F7',
          dark: '#00A1B5',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          secondary: '#F8F7FA',
          tertiary: '#F3F2F5',
        },
        text: {
          primary: '#5E5873',
          secondary: '#B9B9C3',
          muted: '#D0D2D6',
        },
        border: {
          DEFAULT: '#EBE9F1',
          dark: '#D8D6DE',
        }
      },
      fontFamily: {
        sans: ['Public Sans', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 24px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 6px 32px rgba(0, 0, 0, 0.1)',
        dropdown: '0 5px 25px rgba(0, 0, 0, 0.1)',
        modal: '0 10px 50px rgba(0, 0, 0, 0.15)',
      },
      borderRadius: {
        card: '8px',
        button: '6px',
        input: '4px',
      },
      animation: {
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-top': 'slideInTop 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s infinite',
        'bounce-soft': 'bounceSoft 1s infinite',
      },
      keyframes: {
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInTop: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
    },
  },
  plugins: [],
}
