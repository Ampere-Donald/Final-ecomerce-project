# Search Console NEWOTEG — état observé le 31 octobre 2026

Propriété de domaine : `sc-domain:newoteg.com`. Lecture authentifiée dans Chrome et export CSV natif de Google. Rapport de performances : recherche **Web (text-based)**, du **30 juillet au 29 octobre 2026** inclus, soit 92 jours. Les données des 30 et 31 octobre ne figurent pas dans cette période.

## Résultats mesurés

| Indicateur | Valeur |
|---|---:|
| Clics | 58 |
| Impressions | 405 |
| CTR | 14,3 % |
| Position moyenne affichée | 10,4 |

| Période comparable | Clics | Impressions | CTR |
|---|---:|---:|---:|
| 4 septembre–1er octobre, 28 jours | 6 | 42 | 14,3 % |
| 2–29 octobre, 28 jours | 28 | 210 | 13,3 % |
| 16–22 octobre, 7 jours | 2 | 33 | 6,1 % |
| 23–29 octobre, 7 jours | 12 | 104 | 11,5 % |

Sur les deux périodes de 28 jours : +22 clics et +168 impressions, soit respectivement +366,7 % et +400 %. La base est très faible. Cette évolution ne prouve pas l'effet des livraisons SEO des 27–31 octobre : la fenêtre les recouvre à peine et s'arrête avant les dernières publications. La position moyenne agrège des recherches et des pages différentes ; elle ne décrit pas un classement unique sur un mot-clé.

## Où se concentre la visibilité

- Accueil HTTPS : 52 clics ; accueil HTTP : 3 clics. Ensemble, 55 des 58 clics, soit 94,8 %. Cela ne constitue pas une mesure de trafic de marque : le détail des requêtes est insuffisant pour cette attribution.
- Deux fiches produit enregistrent chacune un clic ; la page À propos enregistre un clic. Les 33 lignes de pages exportées totalisent bien 58 clics.
- Cameroun : 54 clics sur 58, soit 93,1 %. Canada : 2 ; États-Unis : 1 ; République centrafricaine : 1.
- Mobile : 50 clics sur 58, soit 86,2 %. Ordinateur : 8 ; tablette : 0.
- Apparence « Product snippets » : 6 impressions, aucun clic. Ce faible échantillon ne valide ni n'invalide l'ensemble du balisage produit.

Les 16 requêtes visibles n'expliquent que 19 impressions et aucun clic, alors que le total du rapport est de 405 impressions et 58 clics. Il ne faut donc pas conclure à une absence de recherches génératrices de clics ni classer tous les clics en marque/hors marque. Google documente l'anonymisation et les limites des tables, qui peuvent expliquer un écart avec les totaux ; le détail manquant ne peut pas être reconstitué ici. [Explication officielle des limites](https://developers.google.com/search/blog/2022/10/performance-data-deep-dive).

Les impressions des lignes de pages ne doivent pas être additionnées pour remplacer le total agrégé de la propriété. Conserver les dimensions et périodes lors de toute comparaison. [Dimensions du rapport](https://support.google.com/webmasters/answer/17011259?hl=en).

## Indexation : un état antérieur aux livraisons

Rapport Pages observé : **dernière actualisation le 23 octobre 2026**, avant les travaux publiés à partir du 27 octobre. Google affiche 129 pages indexées et 143 non indexées :

| Motif | URL |
|---|---:|
| Exclusion par noindex | 122 |
| Autre page avec balise canonique correcte | 13 |
| Introuvable, 404 | 5 |
| Explorée, actuellement non indexée | 3 |

Les 122 exclusions noindex ont été exportées intégralement : 106 URL `/equivalences`, 8 `/catalogue`, 3 `/login`, 2 `/signup`, 2 `/forgot-password` et 1 `/favourites`. Ce sont des recherches, filtres ou pages de compte relevant de la politique d'exclusion prévue. Aucune validation globale de correction n'a été déclenchée et les protections noindex ne sont pas retirées pour réduire le compteur.

Les cinq anciennes 404 et les trois pages explorées non indexées restent à examiner individuellement. Les 13 alternatives canoniques ne sont pas, par leur seul motif, une erreur à corriger. On ne peut pas diviser les 129 pages indexées de cet état ancien par les 1 952 URL du sitemap actuel pour calculer une couverture à jour.

## Sitemap : soumission effectuée et lecture confirmée

Avant l'action, le rapport mentionnait une soumission le 22 mars, une dernière lecture le 29 mars et 12 pages découvertes. Un contrôle HTTP du sitemap public le 31 octobre à 11:50:35 UTC a trouvé 1 952 URL uniques, dont 1 933 produits, toutes sur l'origine HTTPS attendue.

Le sitemap `https://newoteg.com/sitemap.xml` a été soumis à nouveau. Google a affiché la confirmation de soumission, puis la table a indiqué : **soumis le 31 octobre, lu le 31 octobre, statut Success, 1 952 pages découvertes**. Les captures de confirmation sont conservées localement. Cette action clôt la soumission prévue par SEO-12 ; elle ne prouve pas l'indexation de ces URL ni une progression de classement. [Signification du rapport Sitemaps](https://support.google.com/webmasters/answer/7451001).

## Décisions pour l'implémentation

1. Développer les entrées par familles et fiches : l'accueil concentre aujourd'hui presque tous les clics. Conserver le pilote existant et relier les guides documentés aux familles utiles.
2. Garder le mobile prioritaire : il apporte 86,2 % des clics. Les mesures de laboratoire restent distinctes des données terrain ; aucune amélioration de vitesse n'est déduite de ce rapport.
3. Consolider le Cameroun comme premier marché observable. Ces données ne justifient pas encore de multiplier des pages commerciales pays sans capacité de livraison confirmée.
4. Compléter le contrôle des variantes HTTP/www présentes dans l'historique avant toute modification. Une lecture actuelle de la fiche `4d0332f0-9b7a-47b0-9aba-1ea453de85a0` répond 200 sur www et sur le domaine principal, avec dans les deux cas une canonical HTTPS sans www. L'accueil principal répond également 200 avec la bonne canonical. Les deux lectures HTTP expirent et la lecture de l'accueil www ferme la connexion ; ce passage ne permet pas de certifier leur chaîne de redirection. Ne pas transformer ces échecs de mesure en conclusion de panne globale.
5. Reprendre l'inspection d'un échantillon de familles et produits, les anciennes 404 et les Core Web Vitals lorsque le contrôle Chrome sera rétabli. L'outil a indiqué sa désactivation dans les paramètres Work après les exports et la confirmation du sitemap ; aucun résultat d'inspection ou de CrUX n'est déclaré acquis.

## Preuves et reproductibilité

Répertoire local : `C:/Users/pc/Documents/Newoteg/output/seo-implementation/search-console-2026-10-31/`.

- `performance-export.zip` : export natif, 3 466 octets ; original conservé.
- `tables.json` et `analysis.json` : tables décodées et calculs sur les 92 jours, sans jour manquant ; sommes des clics/appareils/pays contrôlées.
- `noindex-export.zip` : export natif, 5 392 octets ; `noindex-tables.json` et `noindex-analysis.json` : classification des 122 URL.
- `current-sitemap-check.json` : contrôle public avant soumission.
- `origin-check.json` : six lectures HTTP publiques, dont trois réponses exploitables et trois échecs de transport conservés.
- `sitemap-submitted.png` et `sitemap-confirmed.png` : confirmation de l'action et état final visible.

Les exports bruts restent dans le dossier de preuves local, hors Git. Ce document ne prétend pas établir un retour commercial ni le classement de NEWOTEG en Afrique.


## Complément : rapport Core Web Vitals consulté

Lors du rétablissement temporaire de Chrome le 31 octobre, le rapport Core Web Vitals de la propriété a été lu. Dernière mise à jour affichée : 29 octobre 2026. Google indiquait une quantité insuffisante de données d’utilisation sur les 90 derniers jours pour mobile et pour ordinateur ; les boutons de rapport étaient désactivés. Il n’y a donc pas de métriques terrain LCP/INP/CLS à extraire de cet écran pour NEWOTEG à ce stade. Cela ne valide pas les performances du site et ne remplace pas les mesures de laboratoire.

La lecture du rapport Performances dans son autre onglet expirait à l’attachement, tandis que Core Web Vitals était accessible. Le contrôle navigateur a de nouveau été désactivé dans Work ensuite. L’inspection d’URL reste à compléter. Aucun nouvel export de performances n’est affirmé.
