# Mesures mobiles de laboratoire — 30 octobre 2026

Site public, Edge sur ordinateur avec écran 390 × 844, processeur ralenti ×4, latence simulée 150 ms et débit descendant de 204 800 octets/s. Cache désactivé ; trois passages par page. Observation pendant dix secondes après DOMContentLoaded. Aucune écriture réseau autorisée.

| Page | LCP médian | TTFB médian | CLS médian | Blocage observé médian |
|---|---:|---:|---:|---:|
| / | 3056 ms | 627 ms | 0.000 | 1021 ms |
| /catalogue/condensateurs | 3140 ms | 1099 ms | 0.076 | 1211 ms |
| /product/7a4a260b-35bd-40ce-b246-d548a553432f | 2972 ms | 1010 ms | 0.000 | 1321 ms |

Ces neuf mesures ne sont pas des données terrain, un percentile de vrais visiteurs ni une mesure INP. Le blocage observé est la somme des durées de tâches au-delà de 50 ms pendant la fenêtre du banc ; il ne constitue pas un score Lighthouse. Les tailles transférées des ressources tierces sans Timing-Allow-Origin peuvent être sous-estimées.

Les médianes de LCP dépassent le repère de 2,5 s. Les CLS observés restent sous 0,1 dans ce banc. La variabilité du TTFB et le travail JavaScript au chargement doivent être examinés ; ce résultat ne prouve pas qu’une seule ressource cause le retard. Un visuel local cassé a été détecté dans la première rangée des condensateurs. L’audit des chemins product-images référencés a trouvé 29 fichiers absents du checkout et disponibles dans les sources locales. Leur rétablissement est préparé sans réécrire les données produit.

Prochaine mesure : reprendre le même profil après livraison, examiner les longues tâches et les ressources bloquant le premier rendu, puis limiter la charge nécessaire au démarrage. Les données Search Console/CrUX restent à obtenir.

Sources des repères : [Google Search Central](https://developers.google.com/search/docs/appearance/core-web-vitals), [Web Vitals](https://web.dev/articles/vitals), [définition du LCP](https://web.dev/articles/lcp). Les seuils sont évalués au 75e percentile dans les données terrain ; la médiane de ce banc sert au diagnostic local.

Preuves : output/seo-implementation/mobile-lab-2026-10-30/report.json et trois captures.
