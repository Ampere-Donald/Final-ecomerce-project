# État courant du plan A–Z — 23 octobre 2026

Le site est publié. L’utilisateur a demandé de publier sans attendre les étapes métier 1 à 4, qui restent reportées ; il a aussi différé la connexion de gestion et la préproduction Railway. Le périmètre initial de [PLAN-IMPLEMENTATION.md](PLAN-IMPLEMENTATION.md) reste conservé. Cet audit distingue la livraison de logiciels, la disponibilité publique et l’acceptation métier ; aucun pourcentage global n’est déduit des tests.

## Ce que prouve le contrôle de ce jour

[Rapport HTTP](public-readiness-20261023.json) : quinze contrôles anonymes GET réussis. Santé API/base/stockage, contrats de disponibilité des messages et observations, compteur de projets, en-têtes privés sur sept documents, métadonnées initiales sur accueil/catalogue/équivalences, accueil prérendu et HTTP 404 sur un chemin absent. Aucun compte, cookie, commande, envoi, appel d’IA ni donnée client enregistré. Le rapport conserve seulement des assertions et capacités, jamais le corps des réponses.

Le script [verify-public-readiness.mjs](../../scripts/verify-public-readiness.mjs) est une commande ponctuelle, sans programmation récurrente. Depuis la racine du dépôt :

```powershell
node scripts/verify-public-readiness.mjs --output C:/chemin/existant/rapport-nouveau.json
```

Le fichier doit être nouveau, son dossier doit exister. Une erreur réseau ou de contrat est enregistrée comme échec et rend la commande non nulle ; une capacité absente n’est pas inventée. Des canaux `false`, une collecte `false` ou zéro projet sont des états constatés, pas des fonctionnalités validées. Un rapport `passed` signifie uniquement que les quinze contrats sondés répondent ; il ne prouve ni achats complets, autorisations applicatives, performances ni recette physique.

## Exigences et preuves distinctes

| Lots / exigences du plan | Sources et preuves identifiées | Ce qui empêche encore la clôture complète |
| --- | --- | --- |
| L0 : version, préservation, décisions | Historique Git ; [livraison du 16 octobre](release-20261016/README.md), puis PR #11 et #12 documentées | Conserver version et portée lors des prochaines livraisons ; aucune acceptation métier présumée |
| L1 : dictionnaire, sources, prix, réception | [Dictionnaire](technical-dictionary-20261012/README.md), [provenance](technical-provenance-20261010/README.md), [pilote](catalogue-pilot-20261010/DICTIONNAIRE.md) | Références, prix et caractéristiques réellement relus par Mr Jude Fogueng ; règles boutique à confirmer. Aucune valeur absente inventée ; le décompte des prix manquants de l’ancien audit n’est pas un nouveau relevé |
| L2 : réception, fiche, conseil, retrait | [Recette transversale](RECETTE-TRANSVERSALE-L8.md), [guide devis/retrait](GUIDE-TRAITER-DEVIS.md) | Gestes équipe, coordonnées et conditions commerciales validés. Règle approuvée maintenue : Akwa après disponibilité confirmée ; livraison avec frais/délai à confirmer |
| L3 : recherche exacte, comparaison, équivalences | [Recherche publiée](catalogue-relevance-20261021/README.md), [comparaison](COMPARATEUR.md), [registre des remplacements](replacement-client-20261013/README.md), livraison du 16 octobre | Cas physiques, sources et limites réellement relus par le référent ; un score ou une fixture ne certifie jamais un remplacement |
| L4 : projets/BOM et offres réelles | [Contrat des projets](PROJETS.md), recette transversale ; API publique actuelle : zéro projet | Un projet réel complet, relu et achetable ; publication des seules offres réellement établies. Pas de faux projet ajouté pour fermer le critère |
| L5 : devis, affectation, acceptation, réachat | [Demandes de devis](DEMANDES-DEVIS.md), guide et recette transversale | Acceptation opérationnelle par la boutique, responsabilités et règles commerciales réelles |
| L6 : commande invitée, accès privé, reprise et rattachement | [Contrat](SUIVI-INVITE.md), [guide](GUIDE-SUIVI-INVITE.md), recette transversale ; API canaux actuelle : email=false, sms=false | Fournisseurs, configuration et délivrabilité sur destinations autorisées ; procédure de perte d’accès avec l’équipe. Les en-têtes privés contrôlés ce jour ne prouvent pas à eux seuls les droits de toutes les actions |
| L7 : avis, photos, modération, mesure | [Avis](AVIS.md), code `Back-end/src/avis` et `Font-end/src/storefront/ProductReviews.jsx` : signalement présent ; traitement des photos et tests de métadonnées présents. [Mesure](MESURE-PARCOURS.md), [lecture](LECTURE-INDICATEURS.md) | Recette humaine et canaux reportés ; collecte publique=false. Journaux hébergeurs, durée des agrégats, responsable de lecture et période comparable à valider avant d’annoncer un bilan. Aucun visiteur ou taux de vente déduit d’une collecte inactive |
| L8 : migrations, recette, accessibilité, performance, SEO et exploitation | [Serveur](SERVEUR-COMPLET-L8.md), recette transversale, [sauvegarde/restauration et quatre migrations publiées](release-20261016/README.md), métadonnées privées/publiques contrôlées ce jour | Préproduction distante différée ; téléphone réel et gestes équipe non prouvés. Dernière mesure catalogue publiée : médiane LCP 4 704 ms, objectif 2 500 ms non atteint ; [profil et limites](catalogue-prefetch-20261019/README.md). Pas de nouvelle mesure LCP annoncée ce jour |
| L9 : publication, vérification et observation | Livraisons #10/#11/#12 ; [preuves du 21 octobre](catalogue-relevance-20261021/README.md), quinze contrôles publics ce jour | Observation sur trafic réel comparable et traitement des conditions ouvertes. Pas de surveillance récurrente créée |

Cette table relie les lots à leurs preuves datées ; elle ne prétend pas avoir rejoué chaque invariant ni chaque test sur la version courante. Les recettes isolées restent des preuves logicielles de leur version, pas des transactions réellement opérées par NEWOTEG. Les anciennes phrases « non publié » sont historiques ; les dépendances encore ouvertes restent actuelles.

## Suite autorisée

1. Poursuivre le chemin critique du catalogue et mesurer les candidats face au même profil, sans abaisser le budget pour le déclarer atteint. Le renderer hébergé dépend de la gestion Railway reportée ; son absence ne justifie pas de réouvrir cette étape contre la consigne de l’utilisateur.
2. Conserver les guides et dossiers prêts pour les quatre étapes métier reportées : relecture technique par Mr Jude Fogueng, projet réel, messages et recette opérateur/téléphone. Ne pas créer de validations ou comptes en son nom.
3. Maintenir les messages et observations dans leur état explicite jusqu’à disponibilité des services et exploitation validée. Une fois ces conditions réunies, réaliser la recette isolée puis la période d’observation réelle ; aucune donnée fictive en production.

L’objectif complet n’est donc pas déclaré atteint. La publication demandée est acquise ; les conditions de fin du plan restent distinctes.
