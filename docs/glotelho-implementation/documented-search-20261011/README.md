# Références fabricant et alias documentés — 11 octobre 2026

## Résultat

L’administration peut désigner explicitement un attribut comme référence fabricant ou alias de recherche, indépendamment de son libellé. Les valeurs d’origine restent dans les attributs existants, avec leur documentation par valeur. Aucune identité n’est déduite du nom, de la photo ou d’un ancien attribut.

Les suggestions et la recherche paginée consultent uniquement les valeurs `DOCUMENTE` ayant un relecteur, une date et les versions actuelles valeur/attribut/produit. Un brouillon, une contradiction ou une relecture obsolète n’ajoute aucun résultat par ce nouveau canal. Les autres champs historiques restent recherchables normalement ; cette exclusion ne masque pas le nom public d’un produit.

Le classement par pertinence privilégie le code interne exact, puis la référence fabricant documentée, le nom exact et l’alias documenté. Un tri explicite par prix ou nom reste prioritaire. Casse, accents, espaces et tirets utilisent la clé de recherche commune ; les suffixes alphanumériques restent présents. Aucun rapprochement flou ni concaténation/suppression de suffixe n’est effectué dans les références/alias documentés. Une valeur par alias, avec origine et relecture. Un alias n’est pas une déclaration d’équivalence.

Les deux routes conservent filtres, stock disponible et prix serveur. La projection publique masque toujours coûts et identité du relecteur. Aucun ajout au panier ou remplacement automatique.

## Migration et livraison

`20261011090000_documented_search_keys` ajoute un enum de deux clés, une colonne nullable sans défaut et un index dans `attribut`. Aucun backfill, aucune valeur/référence/validation automatique. Les attributs historiques restent sans clé. Les changements d’usage incrémentent déjà la version de l’attribut et invalident ses anciennes relectures.

Cette migration suit `20261010210000_technical_provenance`. Appliquer les deux migrations et vérifier le contrat avant le nouveau backend, puis l’administration. Le rollback applicatif conserve colonne, enum, index et table de sources ; ne pas effacer les annotations. Contrat de livraison actualisé uniquement pour les nouvelles structures répétées localement, sans changer les définitions historiques.

La sauvegarde Railway et la répétition PostgreSQL 18.6 du dossier précédent concernent la version à une migration. La nouvelle migration est répétée ici sur schéma historique et fixtures isolées, y compris restauration ; cette preuve ne transforme pas la répétition précédente en preuve distante de la nouvelle version. Préproduction Railway différée à la demande de l’utilisateur ; PR #10 reste en brouillon, aucune publication de cet incrément.

## Vérifications

- Build backend et administration, TypeScript et lint ciblé réussis. 60 suites / 456 tests backend, 13 tests d’interface/service de sources et 13 contrôles des gardes de livraison passent. Les avertissements préexistants de taille des bundles admin restent présents.
- `result.json` : 16 groupes de recette réelle PostgreSQL/Nest/HTTP. Schéma historique exporté puis restauré ; deux migrations exactes appliquées sur original et restauration, valeurs sources conservées, zéro annotation créée par migration. Structure conforme au schéma candidat. Trois bases synthétiques supprimées en fin de recette.
- Requêtes réelles des suggestions et de la recherche paginée : ordre de pertinence, casse/tirets/espaces, suffixes différents, filtres catégorie/prix/stock, archivage, ponctuation et entrées malveillantes paramétrées, brouillons/contradictions/relectures absentes, invalidation par chacune des trois versions et retrait de clé. Contrôleur public réel vérifié sans coûts ni identité du relecteur.
- JWT/DTO réels : écriture anonyme refusée, vendeur refusé, clé inconnue refusée, admin autorisé, suppression de clé par `null` autorisée. Interface : sélection explicite, sauvegarde de clé et remise à `null` lors du retrait.

Recette reproductible : `Back-end/scripts/verify-technical-provenance-local.cjs --update-contract`, avec l’environnement local explicitement contrôlé ; la sous-recette de recherche refuse toute autre base/port/hôte. Aucun appel fournisseur, email/SMS ou écrit dans la boutique.

## Reste à réaliser

La boutique doit accepter le pilote et renseigner/relire de vraies références et alias. Aucun article réel n’a reçu cette annotation. Les clés des autres caractéristiques par famille, données techniques et validation des remplacements restent à finaliser : cet incrément fait avancer L1/L3, sans les déclarer complets. Les autres critères métier et d’exploitation du plan A–Z restent ouverts.
