/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', 'Aptos', 'Segoe UI', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Aptos Display', 'Segoe UI', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'Cascadia Mono', 'Consolas', 'ui-monospace', 'monospace'],
      },
      colors: {
        primary: '#2D32C9',
        'primary-foreground': '#ffffff',
        'background-light': '#F5F7FB',
        'background-dark': '#0B1636',
        success: '#15986C',
        warning: '#E69A26',
        danger: '#b91c1c',
      },
    },
  },
  plugins: [],
};
