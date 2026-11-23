# Fiches techniques et dossiers universitaires

La fiche utilise l’identité et les données commerciales existantes. Le contenu documentaire est versionné séparément, par UUID. Les données de catalogue, prix, stocks et images ne sont jamais modifiées par le nouvel import documentaire.

## Architecture

- Migration additive `20261123000000_structured_documentary` : `draft_content`, `published_content`, `published_at` dans `product_documentary`.
- Le contenu de version 1 comporte une famille éditoriale et des locales `fr` et éventuellement `en` : résumé, paragraphes, applications, intégration, points de comparaison, informations manquantes, FAQ et documents avec portée référence/famille.
- Les caractéristiques numériques restent dans les attributs techniques. Les seules indications dérivées du titre sont présentées comme « indications de la désignation », sans enregistrement de nouveaux attributs ni déduction de propriétés supplémentaires.
- Une empreinte du titre, de la description, de la marque et de la référence fabricant invalide l’affichage d’un contenu devenu obsolète après une modification de l’article.
- `documentationProduit` est la projection publique explicite. Elle ne contient ni brouillon, ni auteur, ni historique, ni empreinte interne. Le rendu serveur, les données d’hydratation, les métadonnées et le navigateur utilisent la même version publiée.
- Sans contenu publié dans la langue consultée, l’affichage précédent est conservé. Aucun mélange automatique des textes français et anglais.

## Administration et API

Le gestionnaire « Documentation produits » conserve la correction historique et ajoute un éditeur structuré avec aperçu. Les valeurs techniques restent dans leur éditeur avec leurs sources.

`PATCH /api/catalogue-documentary/:id/structured`, réservé aux administrateurs authentifiés :

```json
{
  "operationId": "UUID de tentative",
  "expectedRevision": 2,
  "action": "draft",
  "content": {
    "schemaVersion": 1, "family": "passifs",
    "locales": {"fr": {
      "summary": "Présentation du composant.",
      "paragraphs": ["Fonction et critères de choix du composant."],
      "applications": [], "integration": [], "replacement": [],
      "missing": [], "faq": [], "documents": []
    }}
  }
}
```

Actions : `draft` enregistre sans changer le public ; `publish` publie le brouillon enregistré ; `rollback` restaure la publication précédente si aucune intervention ultérieure ne s’y oppose. Un conflit renvoie HTTP 409. Chaque tentative est idempotente, journalisée et contrôle la révision. Les corrections administrateur protègent la fiche contre les imports automatiques.

Le texte est rendu par React, sans HTML libre. Les documents utilisent des URL HTTPS publiques sans identifiants intégrés. Les anciens outils de retour arrière refusent les nouveaux événements structurés pour éviter de restaurer des colonnes de produit avec un événement documentaire.

## Préparation et publication des contenus

Utiliser un export actif actualisé provenant de l’utilitaire de catalogue existant. Les exports et journaux restent dans un répertoire privé hors Git ; aucune URL privée de base ne doit être passée en argument ou copiée dans les rapports.

Depuis le backend :

```bash
node scripts/documentary/prepare-catalogue.cjs /chemin/catalogue_complet.jsonl /chemin/propositions_cumulees_lots_01_a_19.jsonl /chemin/preparation
node scripts/documentary/project-dossiers.cjs /chemin/catalogue_complet.jsonl /chemin/projets
node scripts/documentary/check-documents.cjs /chemin/preparation/catalogue-prepare.jsonl /chemin/projets/projets-universitaires.json /chemin/documents-verifies.json
node scripts/documentary/review-prepared.cjs /chemin/preparation/catalogue-prepare.jsonl /chemin/catalogue_complet.jsonl /chemin/publication /chemin/documents-verifies.json
```

Le premier passage prépare de la documentation de famille et réutilise les descriptions existantes pertinentes. Il ne transforme pas les paramètres d’une documentation de référence en caractéristiques garanties du produit. Les variantes centrales explicitement non identifiées restent dans `a-clarifier.jsonl`. Les champs `complete: false` et `completeness` distinguent ce premier niveau de guidage d’une fiche dont toutes les données spécifiques auraient été recherchées et établies.

Le contrôle de disponibilité d’un document n’est pas une certification de ses caractéristiques. Les lectures de documents officiels effectuées séparément sont consignées dans les preuves de recherche. La portée des liens reste explicite.

Avant écriture, produire une sauvegarde du catalogue restaurée et vérifiée, avec les outils PostgreSQL natifs déjà disponibles :

```bash
DOCUMENTARY_SOURCE_ENV=/chemin/prive/.env DOCUMENTARY_VERIFY_STRUCTURED_LOCAL=1 node scripts/documentary/backup-native.cjs --backup-catalogue-readonly
```

Cette option applique la migration uniquement à la restauration locale et compare son schéma au contrat de livraison. La sauvegarde exclut les clients et les historiques de vente ; elle ne constitue pas une sauvegarde complète du système.

Publication explicite d’un lot relu de 50 produits maximum :

```bash
DOCUMENTARY_SOURCE_ENV=/chemin/prive/.env DOCUMENTARY_VERIFIED_BACKUP=/chemin/prive/verification.json node scripts/documentary/publish-structured.cjs --publish-reviewed-batch /chemin/lot.jsonl /chemin/catalogue_complet.jsonl /chemin/journal
```

L’import vérifie la sauvegarde, l’intégrité du contenu relu et l’identité documentaire courante. Il utilise au maximum huit connexions de travail, une transaction par produit. Il sauvegarde les états documentaires précédents dans le journal privé et préserve les fiches verrouillées. Rejouer le même lot reprend les opérations déjà appliquées sans duplication.

La publication française précède les lots `anglais/`. La version anglaise préparée traduit le nouveau guidage de famille ; les paragraphes français spécifiques hérités ne sont pas présentés comme ayant été intégralement traduits.

## Projets et enseignants

Six dossiers sont préparés autour des réseaux résistifs, de la réponse RC, de la commutation à transistor, de l’interface relais, du redressement/filtrage et de la régulation linéaire. Les UUID proviennent du catalogue actif. Les références, ressources et conditions doivent être relues avant publication. Aucun dossier n’est annoncé comme montage testé ou kit complet.

Le multiplicateur « nombre de groupes » applique les quantités recommandées, dans la limite de 10 000 unités par ligne. Les quantités restent ajustables. Le parcours panier garde ses contrôles existants. Le devis peut reprendre le matériel requis même lorsque le prix reste à confirmer ; seules les références et quantités sont transférées, jamais une identité ou des données commerciales privées.

La maintenance des dossiers réutilise `ProjetService`, avec ses contrôles de compte administrateur actif, de révision, de références et d’empreintes techniques. L’import exige l’identification non ambiguë du compte responsable et journalise les créations. Les projets déjà gérés manuellement sont préservés.

## Vérification

Tests principaux :

```bash
# Backend : migrations dans une base éphémère, brouillon/publication, intégrité,
# concurrence optimiste, idempotence, protection et retour arrière.
node --test scripts/documentary/structured.test.cjs

# Frontend public : projection, absence de fuite, hydratation, langues et groupes.
node --test tests/productContent.test.mjs tests/projectGroups.test.mjs tests/initialProduct.test.mjs tests/projects.test.mjs
```

Exécuter chaque commande depuis le sous-projet correspondant. Compléter par les tests UI de l’éditeur, les builds, le contrat de schéma, les contrôles visuels à 390/768/1440 pixels et la comparaison des empreintes commerciales avant/après publication.
