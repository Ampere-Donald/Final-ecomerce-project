// Transpile le CSS moderne généré par Tailwind v4 (@layer, oklch, color-mix…)
// pour les anciens navigateurs Android. S'exécute après @tailwindcss/vite.
export default {
  plugins: {
    'postcss-preset-env': {
      browsers: 'defaults, chrome >= 64, android >= 7',
      features: {
        'cascade-layers': true,
      },
    },
  },
};
