# Validation responsive des parcours vendeur et caissier

Références visuelles validées par le client :

- `Image générée 1 (8).png` — vendeur mobile
- `Image générée 1 (9).png` — vendeur tablette
- `Image générée 2 (2).png` — caisse tablette

## Contrats visuels reproduits

### Vendeur mobile

- accueil vendeur avec résumé, action « Commencer une vente » et accès rapides ;
- catalogue en deux colonnes avec recherche, catégories et scanner ;
- sélection visible en vert avec quantité persistante ;
- barre « Voir le panier » fixe, sans collision avec la navigation globale ;
- panier en panneau bas avec téléphone client facultatif ;
- scanner plein écran avec cadre, retour immédiat et dernier article.

### Vendeur tablette

- rail latéral compact fourni par le shell applicatif ;
- catalogue sur 65 % et panier toujours visible sur 35 % ;
- grille catalogue en trois colonnes ;
- scanner en disposition 65/35 avec historique à gauche et panier à droite.

### Caissier mobile et tablette

- file des tickets séparée du traitement ;
- quatre étapes explicites : ticket, client, paiement, confirmation ;
- recherche ou création du client par téléphone uniquement dans la caisse ;
- total visible pendant tout l’encaissement ;
- paiement espèces, Mobile Money, carte, virement ou crédit ;
- confirmation avec document, client, téléphone, monnaie, impression et envoi.

## Tailles contrôlées

| Taille | Résultat | Débordement horizontal |
|---|---|---|
| 360 × 800 | validé | aucun |
| 390 × 844 | validé | aucun |
| 430 × 932 | validé | aucun |
| 768 × 1024 | validé | aucun |
| 1024 × 768 | validé | aucun |

Les captures d’acceptation ont été produites sur les parcours vendeur, scanner, file caisse, client, paiement et confirmation. Les interactions ajout d’article, ouverture/fermeture du panier, ouverture/fermeture du scanner, progression caisse et navigation retour ont été contrôlées.
