# Audit des KPIs du Dashboard Admin NEWOTEG

Date: 2026-05-28  
Perimetre: `Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard/src/components/Dashboard.tsx` et endpoints lus par `src/services/api.ts`.  
Hors perimetre respecte: aucune modification de `Font-end/`, aucune modification caisse/coffres, aucun nouveau KPI.

## 1. Inventaire des KPIs et graphiques

| Nom affiche | Source API | Source backend | Calcul observe / corrige |
| --- | --- | --- | --- |
| Produits Vendus | `GET /ventes`, `GET /commandes` | `VenteService.findAll()` inclut `lignesVente.produit`; `CommandeService.findAll()` inclut `lignes.produit` | Frontend: somme des `lignesVente.quantite` des ventes boutique dans la periode + somme des `lignes.quantite` des commandes e-commerce `LIVREE` dans la periode. Les commandes annulees sont exclues de ce KPI par le filtre `LIVREE`. |
| Chiffre d'Affaires | `GET /ventes`, `GET /commandes` | Memes services que ci-dessus | Frontend: somme des `montantTotal` des ventes boutique + somme des `montantTotal` des commandes e-commerce `LIVREE`. Les montants Prisma `Decimal` arrivent sous forme de chaines et sont normalises avant addition. Affichage en FCFA sans decimales parasites. |
| Tendance Produits Vendus | `GET /ventes`, `GET /commandes` | Memes services que ci-dessus | Frontend: comparaison du KPI courant avec la periode precedente de meme duree. Division par zero geree. |
| Tendance Chiffre d'Affaires | `GET /ventes`, `GET /commandes` | Memes services que ci-dessus | Frontend: comparaison du CA courant avec la periode precedente de meme duree. Division par zero geree. |
| Evolution du CA | `GET /ventes`, `GET /commandes` | Memes services que ci-dessus | Frontend/Recharts: serie journaliere `{ date, boutique, ecommerce }`. Boutique = ventes; e-commerce = commandes `LIVREE`. Les dates invalides sont ignorees, les montants sont normalises. |
| Commandes par statut | `GET /commandes` | `CommandeService.findAll()` | Frontend/Recharts: comptage par `StatutCommande` sur toutes les commandes de la periode (`EN_ATTENTE`, `CONFIRMEE`, `EN_LIVRAISON`, `LIVREE`, `ANNULEE`). Les annulees restent visibles car ce graphique est une repartition de statut, pas un CA. |
| Top Produits Vendus | `GET /ventes`, `GET /commandes` | `VenteService.findAll()`, `CommandeService.findAll()` | Frontend/Recharts: regroupement par nom de produit, quantites vendues boutique + commandes `LIVREE`, tri descendant, top 5. Quantites nulles/invalides ignorees. |
| Commandes | `GET /commandes` | `CommandeService.findAll()` | Frontend: meme comptage par statut que le pie chart, affiche en cartes. |
| Inventaire - Produits references | `GET /produits?limit=20000` | `ProduitService.findAll()` retourne `{ data, meta }` | Frontend: nombre de produits charges via `toArray()`. |
| Inventaire - Unites disponibles | `GET /produits?limit=20000` | `ProduitService.findAll()` | Frontend: somme de `quantiteStock`, avec normalisation numerique. |
| Inventaire - Produits en alerte | `GET /produits?limit=20000` | `ProduitService.findAll()` expose `seuilAlerte`; `ProduitService.findLowStock()` confirme la logique SQL attendue | Frontend: nombre de produits dont `quantiteStock <= seuilAlerte`, avec fallback `5` si seuil absent. Le compteur n'est plus limite aux 10 lignes affichees. |
| Alertes Stock Bas | `GET /produits?limit=20000` | `ProduitService.findAll()` | Frontend: liste des 10 premiers produits en alerte, tries par stock croissant. Statut `Rupture` si stock <= 0, sinon `Critique`. |
| Commandes Recentes | `GET /commandes` | `CommandeService.findAll()` trie deja par `dateCommande desc` | Frontend: 5 commandes les plus recentes dans la periode courante, avec montant FCFA et date formates de maniere defensive. |

## 2. Bugs trouves

| Gravite | Probleme | Fichier(s) concerne(s) |
| --- | --- | --- |
| Haute | Le compteur `Produits en alerte` utilisait `lowStockItems.length` apres un `.slice(0, 10)`. Le KPI pouvait donc afficher au maximum 10, meme si davantage de produits etaient en alerte. | `Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard/src/components/Dashboard.tsx` |
| Haute | Le seuil de stock bas etait code en dur a `5`, alors que le modele `Produit` expose `seuilAlerte` et l'ecran stock l'utilise deja. Les alertes pouvaient donc etre fausses par produit. | `Dashboard.tsx`, `Back-end/prisma/schema.prisma`, `Back-end/src/produit/produit.service.ts` |
| Moyenne | Les montants Prisma `Decimal` arrivent sous forme de chaines (`"6000"`, `"1800"` observe en API). Les additions et affichages utilisaient `parseFloat` a plusieurs endroits, mais sans garde centralisee contre `null`, chaine vide ou valeur invalide. | `Dashboard.tsx` |
| Moyenne | Les tendances `Ce mois` et `Ce trimestre` comparaient une periode courante partielle a une periode precedente complete, ce qui rendait les pourcentages trompeurs. | `Dashboard.tsx` |
| Moyenne | Le graphique `Evolution du CA` affichait une courbe vide comme si une serie existait, car les jours etaient toujours preinitialises. | `Dashboard.tsx` |
| Moyenne | Le graphique `Top Produits Vendus` disparaissait totalement quand la periode etait vide, au lieu d'afficher un etat vide stable. | `Dashboard.tsx` |
| Basse | Les dates et statuts inattendus pouvaient produire `Invalid Date`, `NaN FCFA` ou un crash d'affichage sur les commandes recentes. | `Dashboard.tsx` |

## 3. Corrections appliquees

| Fichier modifie | Resume du fix |
| --- | --- |
| `Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard/src/components/Dashboard.tsx` | Ajout de helpers defensifs `toNumber`, `toInteger`, `toValidDate`, `formatNumber`, `formatFCFA`, `getSaleLines`, `getOrderLines`. |
| `Dashboard.tsx` | Typage local des donnees dashboard (`VenteDashboard`, `ProduitDashboard`, `StockAlertItem`) pour aligner le frontend avec les formats reels de l'API. |
| `Dashboard.tsx` | Correction des sommes de produits vendus et de CA avec normalisation numerique unique. Les commandes e-commerce restent filtrees sur `LIVREE` pour les KPIs de vente/CA. |
| `Dashboard.tsx` | Correction de la periode precedente: elle a maintenant la meme duree que la periode courante selectionnee. |
| `Dashboard.tsx` | Correction de l'inventaire: `seuilAlerte` est respecte par produit, le compteur d'alertes utilise la liste complete, et la liste visible reste limitee aux 10 premiers produits. |
| `Dashboard.tsx` | Correction des etats vides Recharts: `Evolution du CA` affiche un message quand toutes les valeurs sont a zero; `Top Produits Vendus` garde son bloc avec un message vide. |
| `Dashboard.tsx` | Formatage FCFA sans decimales parasites et fallback sur dates/statuts/montants invalides dans les commandes recentes. |

## 4. Cas non corriges

Aucun cas bloquant non corrige dans le perimetre de cette livraison.

Notes:
- Aucun endpoint n'a ete renomme.
- Aucun calcul n'a ete deplace vers le backend, car les endpoints existants fournissent deja les donnees brutes necessaires et le dashboard etait historiquement concu en calcul frontend.
- Les ventes boutique n'ont pas de statut d'annulation dans le schema actuel; elles sont donc toutes comptees dans les KPIs de vente.

## Verification

Commandes lancees:

```bash
cd Back-end && npm run build
cd Back-end && npm test -- --runInBand
cd Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard && npm run build
```

Resultat:
- Backend build: OK
- Backend tests Jest: OK, 3 suites / 3 tests
- Dashboard admin build Vite/TypeScript: OK
- Warning Vite restant: chunks > 500 kB, non lie a cette correction
