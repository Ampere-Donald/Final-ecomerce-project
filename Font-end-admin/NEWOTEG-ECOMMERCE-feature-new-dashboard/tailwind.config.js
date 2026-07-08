/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: '#1c19a3',
        'primary-foreground': '#ffffff',
        'background-light': '#f6f6f8',
        'background-dark': '#121220',
      },
    },
  },
  plugins: [],
};
