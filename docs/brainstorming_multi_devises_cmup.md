# Brainstorming - Stocks multi-devises & CMUP

Date : 2026-06-02  
Sujet : Integration d'un moteur multi-devises pour les achats fournisseurs et calcul du CMUP.

## 1. Objectif

Ajouter une fonctionnalite permettant de gerer les achats fournisseurs en plusieurs devises, puis de convertir automatiquement les couts en FCFA pour alimenter le stock, le CMUP et les marges.

Devises principales identifiees :

- Cameroun : `FCFA`
- Nigeria : `NGN`
- Chine : `CNY`

Le FCFA reste la devise de reference interne pour :

- la valorisation du stock ;
- le CMUP ;
- les marges ;
- les prix de vente ;
- les rapports financiers.

## 2. Principe general

La logique part principalement du fournisseur.

Chaque fournisseur possede une devise par defaut :

```text
Fournisseur camerounais -> FCFA
Fournisseur nigerian    -> NGN
Fournisseur chinois     -> CNY
```

Quand un achat est cree, l'application recupere automatiquement la devise par defaut du fournisseur. Cette devise reste modifiable au niveau de l'achat, car un fournisseur chinois peut par exemple facturer exceptionnellement en USD ou dans une autre devise.

Chaque achat garde son propre taux de change historique.

## 3. Taux de change

L'application doit pouvoir recuperer le taux de change actuel en ligne afin de limiter les erreurs manuelles.

Approche retenue :

```text
1. L'utilisateur choisit le fournisseur
2. L'application charge la devise par defaut
3. L'application recupere automatiquement le taux vers FCFA
4. Le taux est affiche dans le formulaire
5. L'utilisateur peut accepter ou modifier le taux
6. Une fois l'achat valide, le taux est fige sur cet achat uniquement
```

Point important : figer le taux ne veut pas dire bloquer les prochains achats au meme taux.

Exemple :

```text
Achat #001 - CNY - taux utilise : 84 FCFA
Achat #002 - CNY - taux utilise : 60 FCFA
```

L'achat #001 garde `84` pour toujours, car c'est le taux reel utilise lors de cet achat. L'achat #002 peut utiliser un nouveau taux.

Champs a conserver sur chaque achat :

```text
Devise d'achat
Taux de change vers FCFA
Date du taux
Source du taux
```

Sources possibles :

```text
API automatique
Manuel
Banque
Bureau de change
Autre
```

L'application pourrait afficher une alerte si le taux saisi manuellement s'eloigne trop du taux automatique.

Exemple :

```text
Attention : le taux saisi est 18% different du taux actuel.
```

## 4. UI - Page Achats / Reapprovisionnement

La page actuelle `Achats (Reappro)` doit rester le point d'entree principal.

Structure possible :

```text
Historique des achats | CMUP & Valorisation | Taux de change
```

Ou, pour une V1 plus simple :

```text
Historique | CMUP
```

Le bouton actuel `Nouvel Achat (Reappro)` ouvre un formulaire/modal enrichi.

## 5. UI - Nouvel achat

Le formulaire de creation d'achat devrait contenir :

```text
Fournisseur
Pays fournisseur
Devise d'achat
Taux de change vers FCFA
Date du taux
Source du taux
Bouton "Actualiser le taux"
```

Exemple d'affichage :

```text
Fournisseur : Shenzhen Parts
Devise : CNY
Taux actuel : 1 CNY = 84 FCFA
Source : Auto
[Actualiser] [Modifier manuellement]
```

La table des produits ravitailles devrait contenir :

```text
Produit
Quantite
Prix unitaire en devise d'achat
Total en devise d'achat
Taux de change
Prix unitaire FCFA
Total FCFA
CMUP avant
CMUP apres
```

Version compacte :

```text
Produit | Quantite | Prix achat | Total achat | Total FCFA | CMUP apres
```

En bas du formulaire :

```text
Total achat devise
Equivalent FCFA
Impact stock
Nombre de produits impactes par le CMUP
```

Exemple :

```text
Total achat : 1 200 CNY
Equivalent : 100 800 FCFA
Impact stock : +85 unites
Impact CMUP : 12 produits mis a jour
```

Avant validation, afficher une confirmation :

```text
Ce reapprovisionnement recalculera le CMUP de 12 produits.
Le taux sera fige apres validation.
```

Boutons :

```text
Enregistrer brouillon
Valider l'achat
Annuler
```

## 6. UI - Historique des achats

La table actuelle devrait evoluer vers :

```text
ID achat
Fournisseur
Devise
Produits
Date
Total devise
Total FCFA
Statut
Paiement
Actions
```

Exemple :

```text
ead95b4c | Shenzhen Parts | CNY | Cable x20 | 02/06/2026 | 300 CNY | 25 200 FCFA | VALIDE | PAYE
```

Le detail d'un achat devrait afficher :

```text
Informations achat
- Fournisseur
- Devise
- Taux utilise
- Date du taux
- Source du taux
- Statut

Lignes achat
- Produit
- Quantite
- Prix unitaire devise
- Total devise
- Prix unitaire FCFA
- Total FCFA
- CMUP avant
- CMUP apres
```

## 7. CMUP

Le CMUP est calcule uniquement au moment de la validation de l'achat.

Formule :

```text
Nouveau CMUP =
(stock avant * ancien CMUP + quantite recue * cout unitaire FCFA)
/
(stock avant + quantite recue)
```

Exemple :

```text
Stock avant : 10
CMUP avant : 1 000 FCFA

Nouvel achat :
Quantite : 20
Prix unitaire : 15 CNY
Taux : 84 FCFA
Cout unitaire FCFA : 1 260 FCFA

Nouveau CMUP =
(10 * 1000 + 20 * 1260) / 30
= 1 173,33 FCFA
```

Chaque ligne d'achat validee doit conserver :

```text
Stock avant
CMUP avant
Cout unitaire FCFA
Stock apres
CMUP apres
```

## 8. UI - Onglet CMUP & Valorisation

Ajouter un nouvel espace d'analyse :

```text
CMUP & Valorisation
```

Vue principale :

```text
Recherche produit
Filtre categorie
Filtre marge faible
Filtre stock valorise eleve
```

Table :

```text
Produit
Stock actuel
CMUP actuel
Prix detail
Marge FCFA
Marge %
Valeur stock
Dernier fournisseur
Derniere devise
Dernier achat
```

Exemple :

```text
Cable 10mm | 45 | 1 173 FCFA | 2 000 FCFA | 827 FCFA | 41% | 52 785 FCFA | Shenzhen Parts | CNY | 02/06/2026
```

Badges possibles :

```text
Marge saine
Marge faible
Vente a perte
Stock dormant
```

Au clic sur un produit :

```text
Historique CMUP
Date
Type mouvement
Achat lie
Fournisseur
Devise
Quantite entree
Cout unitaire FCFA
CMUP avant
CMUP apres
Utilisateur
```

Ce tab doit permettre de comprendre pourquoi un produit a tel CMUP.

## 9. Marges

Le CMUP permet de calculer la marge reelle.

Formules :

```text
Marge brute = Prix de vente - CMUP
Taux de marge = Marge brute / Prix de vente
```

Exemple :

```text
Prix de vente : 2 000 FCFA
CMUP : 1 200 FCFA
Marge : 800 FCFA
Taux de marge : 40%
```

Utilite :

```text
Savoir si un produit est rentable
Identifier les produits vendus trop bas
Voir l'impact d'un achat plus cher sur la marge
Aider a ajuster les prix de vente
```

## 10. Stock negatif

Decision validee :

```text
Stock negatif interdit
```

L'application doit donc bloquer :

```text
Vente superieure au stock disponible
Encaissement ticket si le stock est devenu insuffisant
Sortie de stock superieure au stock reel
```

Cette regle simplifie le CMUP et evite les incoherences de stock.

## 11. Statut des achats

Un achat ne doit pas modifier le stock et le CMUP pendant sa saisie.

Flux recommande :

```text
BROUILLON -> VALIDE -> ANNULE
```

Regles :

- `BROUILLON` : editable, aucun impact stock/CMUP.
- `VALIDE` : stock augmente, CMUP recalcule, taux fige.
- `ANNULE` : doit passer par une annulation propre ou une contre-ecriture.

Le stock et le CMUP changent uniquement lors de la validation.

## 12. Frais additionnels

Pour une V1, on peut commencer sans frais additionnels complexes.

Mais il faut prevoir l'evolution, surtout pour les fournisseurs chinois :

```text
Transport
Douane
Transit
Frais bancaire
Commission agent
Livraison locale
Pertes / casse
```

Ces frais devront ensuite etre repartis sur les lignes d'achat pour obtenir un cout reel plus precis.

Methodes de repartition possibles :

```text
Par valeur d'achat
Par quantite
Par poids / volume
Manuelle
```

Pour une V2, la repartition par valeur d'achat semble la meilleure base.

## 13. Parties du code a modifier

Backend :

```text
Back-end/prisma/schema.prisma
Back-end/src/fournisseur/*
Back-end/src/achat/*
Back-end/src/ligne-achat/*
Back-end/src/produit/*
Back-end/src/mouvement-stock/*
```

Champs probablement a ajouter ou modifier sur :

```text
Fournisseur
Achat
LigneAchat
Produit
MouvementStock
```

Nouveaux modules backend possibles :

```text
Back-end/src/taux-change/taux-change.module.ts
Back-end/src/taux-change/taux-change.controller.ts
Back-end/src/taux-change/taux-change.service.ts

Back-end/src/cmup/cmup.module.ts
Back-end/src/cmup/cmup.controller.ts
Back-end/src/cmup/cmup.service.ts
```

Prisma migration :

```text
Back-end/prisma/migrations/..._multi_devise_cmup/migration.sql
```

Frontend admin :

```text
Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard/src/components/Achats.tsx
Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard/src/services/api.ts
Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard/src/types.ts
```

Nouveaux composants possibles :

```text
src/components/CmupValorisation.tsx
src/components/TauxChange.tsx
```

Petits composants UI possibles :

```text
CurrencyBadge
ExchangeRateInput
CmupPreviewTable
MarginBadge
```

## 14. API a prevoir

Endpoints possibles :

```text
GET    /api/taux-change/latest?devise=CNY
POST   /api/taux-change/refresh
GET    /api/taux-change/history

POST   /api/achats/:id/preview-cmup
POST   /api/achats/:id/valider
POST   /api/achats/:id/annuler

GET    /api/cmup
GET    /api/cmup/produits/:id/historique
```

Le frontend peut afficher les calculs, mais le backend doit rester la source de verite pour :

- conversion ;
- validation ;
- mise a jour du stock ;
- calcul CMUP ;
- historique CMUP ;
- blocage du stock negatif.

## 15. Flux technique recommande

```text
1. L'utilisateur choisit le fournisseur
2. L'application charge sa devise par defaut
3. L'application recupere le taux actuel
4. L'utilisateur ajoute les lignes d'achat
5. Le backend renvoie une previsualisation CMUP
6. L'utilisateur valide l'achat
7. Le backend fige le taux
8. Le backend convertit les montants en FCFA
9. Le backend met a jour le stock
10. Le backend calcule le CMUP
11. Le backend ecrit l'historique CMUP
12. L'interface affiche l'achat valide et son impact
```

## 16. V1 proposee

Fonctionnalites a inclure dans une premiere version solide :

```text
Devise par defaut sur fournisseur
Devise modifiable sur achat
Taux automatique propose
Taux modifiable manuellement
Taux fige par achat valide
Conversion devise -> FCFA
Table achat avec total devise et total FCFA
Validation achat avec impact stock
CMUP simple
Historique CMUP
Marge calculee depuis le CMUP
Stock negatif interdit
```

## 17. V2 proposee

Evolutions futures :

```text
Frais transport
Douane
Transit
Frais bancaire
Commission agent
Repartition des frais sur les produits
Historique avance des taux
Alertes sur ecart taux automatique / taux manuel
Simulation de marge avant validation achat
Recommandation de prix de vente
Rapport de valorisation stock
```

## 18. Synthese

La direction retenue est :

```text
Les fournisseurs donnent une devise par defaut.
Chaque achat garde sa propre devise et son propre taux historique.
Tout est converti en FCFA pour le stock, le CMUP et les marges.
Le CMUP est recalcule uniquement a la validation de l'achat.
Le stock negatif est interdit.
L'onglet CMUP & Valorisation sert a expliquer et analyser les couts.
```

Le point cle est de separer clairement :

- la realite fournisseur : devise d'achat ;
- la realite interne : FCFA ;
- la tracabilite : taux historique et CMUP avant/apres.
