# Mesure mobile de production — 8 octobre 2026

Version publiée : e3b41eca, Worker aa3a5f2e-53f0-4f4a-81bd-96606214b50f.

Trois passages froids par route, Edge synthétique 390 × 844, CPU ×4, débit 200 000 octets/s et latence 150 ms. Lecture publique uniquement ; soumissions analytics exclues. Ce protocole ne mesure ni un téléphone physique ni les percentiles terrain/INP.

| Route | LCP des trois passages | CLS | JS transféré |
| --- | --- | --- | --- |
| Accueil | 4 144 / 3 844 / 3 776 ms | 0,01075 | environ 199,5 ko |
| Catalogue | 6 660 / 6 460 / 6 372 ms | 0 | environ 194,6 ko |

Le budget LCP de 2 500 ms reste manqué. Stabilité et budget JavaScript passent. Aucun débordement horizontal ni erreur JavaScript observé. Les premières mesures rejetées bloquaient les photos Cloudinary : elles ne constituent pas une preuve valide de performance du catalogue. Le protocole autorise maintenant le dossier média public Cloudinary constaté et le script Cloudflare Insights, en conservant le refus des écritures.

Le candidat LCP de l’accueil est hero-electronique-720.webp. Celui du catalogue est une photo Cloudinary de 123 776 octets. Sur l’accueil, deux images de catégorie (hdmi-5m.webp et multimetre.webp) transfèrent chacune environ 115 ko. Prochaine optimisation à mesurer : dimensions adaptées des vignettes et chemin de chargement de la première photo catalogue. Pas de gain annoncé sur la seule base de cette mesure ; pas de modification visuelle ou redéploiement pendant ce relevé.

Preuves : C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/mobile-production-20261008/complete-assets/mobile-lab-result.json et captures PNG associées.

Reproduction depuis Font-end : définir NEWOTEG_LAB_PRODUCTION=1 et NEWOTEG_SEO_OUTPUT à un dossier absolu, puis node tests/measure-built-mobile.cjs. Le mode par défaut conserve le laboratoire local historique.

## Vignettes de catégories — optimisation suivante

Trois déclinaisons WebP de 144 px maximum pour un affichage de 72 px (densité ×2), sans recadrage ni changement des photographies. Sources originales conservées pour leurs autres usages. Câbles : 116 714 → 2 510 octets ; outillage : 115 186 → 3 760 ; composants : 75 850 → 2 392. Total des ressources de ces vignettes : 307 750 → 8 662 octets (−97,2 %). Les références hero restent inchangées pour réutiliser leur téléchargement. Ce gain de poids ne prouve pas à lui seul un gain LCP.

Publication du correctif 40b85fd0 confirmée ; le bundle public Home-DHjLchii.js utilise les nouvelles vignettes. Build et lint passent. Une publication automatique a servi un bundle configuré sur api.newoteg.com ; le protocole a été corrigé pour autoriser ses lectures GET publiques, sans autoriser d’écriture. Les essais avec requêtes bloquées sont rejetés.

Mesure finale avec médias et API disponibles : accueil LCP 4 120 / 3 844 / 3 988 ms ; catalogue 5 900 / 6 280 / 6 420 ms. Aucun gain LCP démontré pour l’accueil malgré la réduction de poids ; variations et changement d’origine API interdisent d’attribuer l’écart catalogue à ces vignettes. CLS inchangé, aucun débordement ni erreur JS. Preuves : captures/mobile-production-20261008/thumbnails-final/. Le budget LCP reste ouvert.

## Décomposition du chargement — mesure instrumentée

Le protocole conserve maintenant début/fin de téléchargement, début de réponse, DOMContentLoaded et temps de chargement/rendu du candidat LCP. Six passages terminés, sans requête refusée ni erreur JS, preuves dans captures/mobile-production-20261008/waterfall/.

Passage 2 accueil : réponse HTML 137 ms, hero téléchargé entre 375 et 1 448 ms ; module principal fini à 1 877 ms ; module Home découvert à 2 425 ms et fini à 2 820 ms ; LCP 3 828 ms. Le téléchargement du hero se termine largement avant son affichage. La prochaine intervention doit réduire le chemin JavaScript/rendu initial, avec comparaison contrôlée sur une même origine de build, plutôt que réduire encore le poids du hero.

Passage 2 catalogue : module principal fini à 1 570 ms ; requête produits commencée à 3 199 ms, terminée à 3 593 ms ; première photo demandée à 3 874 ms et téléchargée à 6 159 ms ; LCP 6 220 ms. Deux leviers distincts : disponibilité anticipée des données publiques et image dimensionnée pour sa carte. Aucun changement de cache de prix/stocks ou de contrôle d’accès n’est justifié par ces mesures seules.

Il s’agit de diagnostics, pas d’un gain livré. Le rendu HTML initial du corps public et le chargement différé des routes restent à traiter ; les métadonnées serveur livrées ne rendent pas le contenu React avant JavaScript.

## Photos responsives des cartes — f8ad0790

Elements.jsx réserve la transformation au composant Card ; les autres Photo, dont les fiches détaillées, gardent leur source originale. cardImage.js accepte seulement les uploads publics versionnés du dossier produits du compte Cloudinary de la boutique. Trois largeurs (240/400/640), limite proportionnelle sans recadrage ni agrandissement, qualité/format automatiques selon la documentation https://cloudinary.com/documentation/image_optimization et https://cloudinary.com/documentation/transformation_reference. URL externe, locale, signée ou déjà transformée inchangée. En cas d’erreur de transformation, Photo retente l’original avant son placeholder.

Build et lint passent ; GET original et dérivé 400 px répondent 200 (123 776 contre 22 734 octets, client HTTP sans négociation moderne). Publication Cloudflare 755d7dcb-a899-4c9b-80e9-6204bbdd94d2. Mesure publique complète, trois passages par route, même protocole : LCP catalogue 4 488 / 4 576 / 4 680 ms (précédent 6 032 / 6 220 / 6 244) ; accueil 4 372 / 4 440 / 3 980 ms. Le candidat catalogue utilise effectivement 240 px et transfère 9 658 octets dans Edge. Amélioration observée du catalogue, sans prétendre à une garantie terrain ; accueil non amélioré. Budget 2 500 ms toujours manqué. CLS 0 catalogue / 0,01075 accueil, aucun débordement global ni erreur JS. Capture catalogue inspectée ; photos initiales présentes, images hors écran restent lazy.

Preuves : captures/mobile-production-20261008/responsive-cards/mobile-lab-result.json et captures associées. Aucun prix/stock ni donnée client modifié.
