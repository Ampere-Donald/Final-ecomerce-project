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
