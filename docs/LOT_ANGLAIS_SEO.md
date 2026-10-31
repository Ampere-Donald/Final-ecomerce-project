# Lot anglais — raccordement local au 31 octobre 2026

État : **routage, HTML serveur et annotations intégrés sur `codex/seo-languages`, non publiés**. La recette interactive reste partielle ; aucune nouvelle URL anglaise en production n’est affirmée. Le plan complet reste actif.

## Comportement préparé

Les URL existantes restent françaises. Les versions anglaises utilisent `/en/` pour l’accueil, les pages de service traduites, les cinq familles, les vingt fiches revues et les quatre guides. Le sélecteur est un lien vers une autre URL ; les préférences du navigateur ou `appLang` ne réécrivent plus la langue après hydratation. Aucun préfixe n’est ajouté aux endpoints API, aux images ou aux sources externes.

Le routeur conserve les parcours de compte, panier, devis et conseil sous la langue courante. Les liens vers un produit ou projet sans version anglaise rejoignent son URL française. Une URL anglaise inconnue reçoit 404 et noindex ; elle ne publie pas implicitement une copie française. Lorsque la page n’a pas de traduction, le sélecteur propose explicitement l’accueil anglais sans y transporter ses paramètres ou fragments.

Chaque version admissible porte sa propre canonical, `html lang`, locale Open Graph et annotations fr/en réciproques et autoréférentes. Les paramètres de pagination admissibles suivent les deux versions ; les recherches et filtres restent noindex. Les comptes et commandes conservent noindex/nofollow, no-store et no-referrer dans les deux langues. Le fragment d’accès invité est retiré avant montage de l’application sur `/suivi-invite` et `/en/suivi-invite`.

Les rendus produit et catalogue prennent en charge les URL anglaises avec leur langue initiale. Les données anonymes d’hydratation restent liées à l’URL complète : un snapshot français ne peut pas amorcer une page anglaise. L’injection refuse une enveloppe d’une autre langue. L’accueil anglais est généré séparément au build ; les guides utilisent les mêmes composants et styles avec leur texte revu.

## Contenu et fraîcheur

Vingt fiches et quatre guides ont une traduction complète liée par SHA-256 à leur source française. Les sources documentaires et leur ordre sont hérités ; une traduction n’apporte aucune preuve technique nouvelle. Les cinq familles possèdent leurs titres, descriptions et repères anglais. Les caractéristiques manquantes, modèles incomplets et limites documentaires restent explicites.

La vérification du build refuse une traduction obsolète et un index de routes périmé. Le petit index public ne contient aucun corps de guide ; les textes complets restent dans la partie éditoriale chargée à la demande. Les quatre dossiers de remplacement non validés restent hors des artefacts publics et du sitemap.

À l’exécution, la traduction produit dépend du nom, de l’image, de la description, de la marque, du lien documentaire et de l’absence de nouveaux attributs, même encore vides. Une identité modifiée retire la version anglaise : 404 côté Worker et moteur de rendu, retrait des annotations anglaises sur la fiche française et retrait du sitemap. Le navigateur utilise le même critère de présence d’attributs. Un changement de prix ou de stock ne périme pas la traduction : ces valeurs restent les données commerciales courantes.

Le sitemap lit uniquement les identités actives et, pour cette décision, les champs publics nécessaires ainsi qu’un identifiant d’attribut au maximum. Il ne lit ni prix, ni stock, ni données fournisseur. Seuls les produits dont l’identité revue correspond encore obtiennent une URL anglaise.

## Vérifications

- 184 tests frontend réussis, lint et build ; 15 tests ciblés du backend et build Nest/Prisma réussis. Ces résultats portent aussi sur la correction finale de présence d’attributs.
- 32 contrôles sur le Worker réel avec le moteur CJS compilé : vingt fiches anglaises et leurs équivalents français, cinq familles, quatre guides, accueil, index des guides et retrait sur identité périmée. Fixtures documentées ; un prix/stock fictif local seulement, les dix-neuf autres inconnus ; aucune écriture de production.
- Contrôle des onze documents éditoriaux sélectionnés et quatre brouillons 404 ; 2 280 recherches de fuite de brouillons et huit vérifications de corps de guides hors du graphe JavaScript initial.
- Quinze contrôles HTTP locaux : onze pages, trois chemins non publiés/inconnus et une redirection ; HEAD, sources et styles contrôlés. Une première tentative a révélé une origine de redirection incorrecte dans le serveur de recette ; ce serveur a été corrigé, sans changer les destinations de production.
- Vingt rendus de composants anglais et contrat indépendant du paquet CJS réussis. Les identités du frontend et du paquet backend doivent rester identiques avant toute livraison.

## Recette navigateur et limites

Le guide condensateur anglais a été observé à 390 × 844 : texte anglais, liens locaux, canonical anglaise, annotations réciproques et largeur de document 375 px. Le sélecteur a ouvert le guide français ; Retour a retrouvé l’URL anglaise. Deux lectures des journaux n’ont montré ni erreur ni avertissement. Le retrait des anciennes balises de métadonnées après démarrage a été constaté.

Cette observation **ne constitue pas une recette d’hydratation complète**. Après Retour, la recherche de la commande de pause des animations n’a pas trouvé sa cible ; aucune interaction réussie n’est déduite de cet essai. La position exacte du tableau/ancre et la stabilité finale doivent être revérifiées. Le navigateur a ensuite été désactivé dans Work avant le contrôle suivant. Aucun contournement n’a été tenté. L’override de viewport n’a pas pu être réinitialisé après cette interruption.

Le code préserve désormais les ancres à l’entrée/changement de langue, y compris le contenu chargé tardivement, et laisse le navigateur restaurer sa position sur Retour. Cette correction est testée automatiquement mais sa recette visuelle finale reste à faire. Restent aussi les fiches, conseil, panier local, filtres, stockage refusé/opposé et bureau 1440 px.

Preuves : `C:/Users/pc/Documents/Newoteg/output/seo-implementation/localized-*` et `language-routing-*`. `localized-browser/report.json` distingue explicitement observations et contrôles manquants ; les captures sont locales.

## Livraison restante

La branche distante conserve le travail sans modifier la production. L’outil GitHub connecté a été revérifié : indisponible pour le modèle ; la PR anglaise n’est pas créée. Aucune CI distante nouvelle n’est annoncée. La PR #34 conserve son périmètre français déjà testé sur `1906f54e`.

Avant publication : finir la recette interactive, ouvrir la PR et obtenir les contrôles CI/runtime des trois profils, préparer une livraison coordonnée backend/Worker avec la même identité et le retour arrière, puis vérifier les URL publiques et leur sitemap. Ne pas publier le Worker anglais avec le moteur backend actuellement en production : le contrat refuse volontairement les versions différentes. Aucun retour arrière de base de données n’est nécessaire pour ce lot sans migration.

Identité du moteur préparé vérifiée après les dernières corrections : `22932018c51fb99e7870521a8785212e42924b087eca56b9fe5a237e6baa94fe`. Les constructions indépendantes frontend/backend sont identiques. Cette identité ne désigne pas le moteur actuellement déployé.


## Complément de maillage et reprise de GitHub

L’accueil et les fiches relient maintenant les guides sélectionnés dans leur langue. Les index transportent aussi les identifiants des références explicitement liées, sans les corps de contenu. Le graphe HTML compilé atteint les 31 destinations du pilote par langue ; le scénario de pagination vérifie une fiche en page 2. Voir MAILLAGE_SEO_PILOTE.md. Dernière identité préparée après ce complément : `4074a51a91537a23a44776f3f2ed382cce7346e6e98748bc1c451bf323874b17` ; 186 tests frontend réussis.

GitHub connecté a été rétabli après le constat d’indisponibilité ci-dessus. La création de PR et la CI peuvent donc reprendre. Le contrôle du navigateur reste désactivé au dernier essai ; aucune recette visuelle finale n’est déclarée complète.


## CI obtenue et synchronisation de la correction d’origine

La PR #35 est ouverte : https://github.com/Ampere-Donald/Final-ecomerce-project/pull/35. Sur `f004194838f59de8774f89d69fbc4dfb0aac767f`, CI générale #374 et runtime #98 entièrement réussis, y compris les trois profils Docker. Le lot reste en brouillon pour la recette visuelle/interactive.

La PR #36, indépendante, a depuis publié les redirections des variantes HTTP/www sur les pages publiques françaises. Sa correction est réintégrée dans la branche bilingue ; les nouvelles routes /en/ et les protections privées font partie de ses tests. Les contrôles distants du nouvel état doivent être relevés avant toute publication du lot anglais. La publication des redirections ne publie pas les guides ou les URL anglaises.

## Synchronisation des publications du 31 octobre

Sur `c352405971f3111e9ae2c02555652099285f5c93`, après intégration des redirections, les 190 tests frontend et la CI générale #377/runtime #101 ont réussi intégralement. Ces résultats décrivent cet état précis.

La PR #37 a ensuite publié le graphe Organization commun, avec sept contrôles publics réussis. Son intégration dans la branche bilingue conserve les validations des contenus FR/EN et ajoute le générateur et son contrôle du véritable HTML en CI. Le conflit d’import du fichier Vite est résolu en conservant ces deux ensembles. La nouvelle suite comporte 194 tests réussis ; la CI du nouveau commit est à relever séparément. La recette interactive finale reste bloquée par l’accès au navigateur local désactivé dans Work ; la PR #35 reste donc en brouillon.
