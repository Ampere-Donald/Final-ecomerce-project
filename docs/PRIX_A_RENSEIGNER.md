# Chantier collectif des prix

La rubrique `/prix-a-renseigner` est une file calculée à partir des articles dont le prix détail est absent, nul ou négatif. Elle ne modifie pas leurs catégories et n’ajoute aucune catégorie provisoire à nettoyer plus tard. Elle inclut les brouillons non publiés, signalés sur chaque fiche, et les articles actifs. Les articles publiés et en stock sont présentés en priorité.

## Accès et saisie

Les cinq rôles du personnel (SUPER_ADMIN, ADMIN, MANAGER, VENDEUR, CAISSIER) disposent de cette rubrique dans le menu et dans l’en-tête. Elle permet uniquement la saisie initiale d’un prix détail manquant, entier, positif, en FCFA (maximum 1 milliard). Les tarifs demi-gros et gros sont facultatifs ; les tarifs existants sont conservés. Le demi-gros ne dépasse pas le détail et le gros ne dépasse pas le demi-gros, ou le détail s’il n’y a pas de demi-gros.

Un prix enregistré retire automatiquement l’article de la file, met à jour la progression et figure dans l’historique récent de l’équipe. Pour un article actif, le prix détail alimente immédiatement le calcul du prix public existant. Un brouillon reste non publié. Le changement des prix déjà présents continue à passer par les droits du propriétaire.

## Intégrité

`GET /api/catalogue-pricing` fournit la pagination, la recherche par nom/référence/marque, le filtre par catégorie et la disponibilité en stock. Le filtre API `visibility=active|draft` est également disponible. Les coûts d’achat ne sont jamais retournés. Les réponses de la file ne sont pas mises en cache.

`PATCH /api/catalogue-pricing/:id` accepte seulement les prix autorisés et la version lue. La transaction vérifie à nouveau que le prix détail manque et que la version correspond lors de l’UPDATE. Un concurrent reçoit une réponse 409 sans écrasement. L’audit `INITIAL_PRODUCT_PRICE_SET` est créé dans la même transaction ; un échec d’audit annule la saisie. L’auteur, les anciens et nouveaux montants, l’article et son état de publication sont conservés dans le journal existant. Aucune migration de base n’est nécessaire.

La page conserve les champs en cas d’erreur réseau et les saisies non enregistrées lors des changements de filtre pendant sa visite. Elle bloque la saisie hors ligne et n’utilise pas la file automatique de ventes pour rejouer des modifications de prix.

## Design partagé

Le menu conserve toutes les rubriques autorisées, ajoute une recherche de rubrique et évite les liens invisibles au clavier quand il est fermé sur mobile. L’en-tête expose le contexte de la page et un accès aux prix. Les statuts de la boutique sont plus compacts ; les surfaces, tableaux, contrôles et boutons utilisent les mêmes règles visuelles. Le chantier et son appel à contribution se déclinent sur ordinateur et téléphone.

## Recette

Les tests unitaires et d’interface couvrent les cinq rôles, les montants invalides, les conflits, les filtres, les saisies conservées et la disparition d’un article tarifé. Le scénario `Back-end/test/preproduction/product-pricing.test.cjs` teste les vrais contrôleur, validation, service et PostgreSQL via HTTP avec une authentification de transport réservée au test. Il vérifie également deux écritures simultanées, l’audit unique et l’annulation du prix si l’audit échoue.

Pour le rejouer, compiler le backend, préparer une base PostgreSQL locale jetable dont le nom commence par `pricing_rehearsal`, y appliquer le schéma Prisma, puis exécuter `node --test test/preproduction/product-pricing.test.cjs` avec `PRICING_REHEARSAL_DATABASE_URL` pointant vers cette base. Le test refuse les hôtes distants. Les comptes et articles de recette restent uniquement dans cette base locale.
