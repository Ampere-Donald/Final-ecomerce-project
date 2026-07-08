// Tailwind v3 (rétrogradé depuis v4 pour la compatibilité avec les anciens
// navigateurs Android : la v4 exige Chrome 111+).
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

// Convertit les dernières syntaxes modernes émises par Tailwind v3 :
// - `rgb(R G B / alpha)` → `rgba(R, G, B, alpha)` (Chrome < 65)
// - `:where(X)` → `X` (Chrome < 88 ; change la spécificité de 0 → normale,
//   sans effet visible sur le preflight où Tailwind l'utilise)
const legacyCompat = {
  postcssPlugin: 'legacy-compat',
  OnceExit(root) {
    const rgbRe = /\brgb\((\d+)[ ]+(\d+)[ ]+(\d+)[ ]*\/[ ]*(var\([^)]*\)|[\d.]+%?)\)/g;
    root.walkDecls((decl) => {
      if (decl.value.includes('rgb(')) {
        decl.value = decl.value.replace(rgbRe, 'rgba($1, $2, $3, $4)');
      }
    });
    root.walkRules((rule) => {
      if (rule.selector && rule.selector.includes(':where(')) {
        rule.selector = rule.selector.replace(
          /:where\(((?:[^()]|\([^()]*\))*)\)/g,
          '$1',
        );
      }
    });
  },
};

export default {
  plugins: [tailwindcss, autoprefixer, legacyCompat],
};
