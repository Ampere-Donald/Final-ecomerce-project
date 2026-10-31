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

## Après livraison — 31 octobre

Les 29 fichiers manquants sont maintenant servis correctement et identiques aux sources par SHA-256. La première image de Condensateurs est chargée dans la recette navigateur à 390 px. Cela ne constitue pas une amélioration de vitesse mesurée.

Même profil, neuf nouveaux passages commencés à 11:16:23 UTC :

| Page | LCP médian | TTFB médian | CLS médian | Blocage observé médian |
|---|---:|---:|---:|---:|
| / | 3800 ms | 1104 ms | 0.000 | 1051 ms |
| /catalogue/condensateurs | 10488 ms | 5859 ms | 0.076 | 1104 ms |
| /product/7a4a260b-35bd-40ce-b246-d548a553432f | 13388 ms | 5127 ms | 0.000 | 1236 ms |

Ces résultats sont moins bons que le premier relevé. La série commence pendant le redéploiement d'activation du collecteur, achevé à 11:17:03 UTC ; les conditions serveur ne sont donc pas restées constantes sur toute la comparaison. Le banc n'isole pas l'effet de la PR #32. Des lectures simples après activation montrent encore une attente variable : environ 1,9 seconde pour la famille et 6,9 secondes pour une fiche, avec HTML initial présent et HTTP 200. Il serait incorrect de conclure que les images réparées ont rendu les pages plus rapides, ou d'attribuer la lenteur au collecteur sur cette seule série.

La revue du Worker relève deux lectures indépendantes successives sur les fiches : métadonnées publiques, puis fragment rendu. Leur parallélisation est préparée pour éviter de cumuler leurs attentes ; sa concurrence et les refus 404/503 seront testés avant publication. Ce changement ne résout pas à lui seul une latence réseau ou serveur variable. Aucune amélioration de LCP n'est annoncée avant une nouvelle mesure sur la version effectivement publiée.

Preuves : `mobile-lab-2026-10-31/report.json`, `post-activation-read-timing.json`, `acquisition-public-browser-confirmed/report.json`. Aucune erreur JavaScript relevée dans les neuf passages ; aucun INP terrain mesuré.
