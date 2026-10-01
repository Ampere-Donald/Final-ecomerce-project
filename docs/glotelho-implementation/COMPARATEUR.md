# Comparer des composants

Livraison locale du 1er octobre 2026, lot L3 du plan validé. La comparaison est une adaptation propre à NEWOTEG proposée dans le benchmark ; elle n’a pas été observée chez Glotelho.

## Parcours

Depuis une carte ou une fiche, « Comparer » ajoute ou retire une référence. Choisir deux ou trois références de la même famille puis ouvrir « Comparateur ». Chaque colonne conserve le lien vers la pièce ; l’achat et le conseil restent sur sa fiche. La sélection peut être vidée explicitement et synchronise les onglets du même navigateur.

Le tableau relit chaque identifiant via GET `/produits/:id` et exige une référence active, de même identité et de la famille choisie. Actualiser relit aussi prix, stock et caractéristiques. La sélection locale n’est jamais l’autorité des données commerciales. L’interface n’appelle aucun moteur IA, ne convertit aucune unité et ne confirme pas la compatibilité.

## Données et limites

- Persisté : schéma 1, identifiant de catégorie, un à trois identifiants produit ; aucun prix, stock, nom, contact ou adresse. Données corrompues : sélection vide. Stockage refusé : choix temporaire annoncé.
- Caractéristiques : union des libellés exacts renseignés dans le catalogue ; valeur absente distincte du zéro, unité et suffixe conservés. Une différence exige des valeurs présentes dans toutes les colonnes. Les libellés similaires ne sont pas fusionnés sans dictionnaire technique validé.
- Prix détail et état de stock ne prouvent pas une équivalence. Données manquantes, absence de différence et appartenance à une famille ne prouvent pas une compatibilité.
- Suppression/inactivation, changement de catégorie ou réponse invalide : correction explicite avant tableau. Erreur réseau : relance possible sans déclarer le produit supprimé.
- Mobile : tableau défilant horizontalement dans sa région dédiée, critères fixes, navigation clavier. Le document entier ne déborde pas horizontalement.

## Recettes reproductibles

Dans `Font-end` :

```powershell
node --test tests/comparison.test.mjs
node tests/verify-comparison.cjs
```

La seconde recette intercepte toutes les API et bloque les requêtes externes. Elle ne valide pas Railway. Elle couvre sélection, différences, données manquantes, actualisation, erreurs, stockage, FR/EN, onglets, réponses tardives et six largeurs.

Pour les données de prévisualisation, dans `Back-end`, avec le cluster isolé démarré :

```powershell
$env:NEWOTEG_ACCEPTANCE_TEST_DATABASE_URL='postgresql://quote_test@127.0.0.1:55439/newoteg_quote_acceptance_test'
node scripts/seed-comparison-preview.cjs
```

Cette initialisation refuse toute autre base et ne remplace pas les prix ou stocks existants. Les valeurs sont fictives et marquées comme telles. Frontend : `127.0.0.1:5187`, API : `127.0.0.1:3000/api`, uniquement reliée au cluster isolé. Après démarrage, dans `Font-end` :

```powershell
node tests/verify-comparison-live.cjs
```

Cette dernière recette utilise le backend local réel, sans interception des réponses API. Elle autorise uniquement les lectures locales, bloque les mutations et les requêtes externes, puis vérifie les prix et critères fictifs affichés sur mobile et desktop. Les captures et résultats restent sous `output/implementation-work/captures/comparator` dans le workspace principal, hors Git.

L’enrichissement des fiches réelles, la validation fabricant et les cas d’équivalence étalons relèvent toujours de L1/L2/L3. Les contrôles locaux ne constituent pas une autorisation de publication.
