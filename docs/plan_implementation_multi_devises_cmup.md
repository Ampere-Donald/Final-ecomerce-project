# Plan d'implementation - Stocks multi-devises & CMUP

Date : 2026-06-02  
Document lie : `docs/brainstorming_multi_devises_cmup.md`

## 1. Objectif du chantier

Mettre en place un moteur de reapprovisionnement multi-devises permettant :

- de definir une devise par defaut sur chaque fournisseur ;
- de creer des achats en `FCFA`, `NGN` ou `CNY` ;
- de recuperer/proposer un taux de change vers FCFA ;
- de convertir les lignes d'achat en FCFA ;
- de valider un achat en mettant a jour le stock ;
- de recalculer le CMUP des produits impactes ;
- de conserver un historique CMUP explicable ;
- de calculer la marge reelle depuis le CMUP ;
- d'interdire le stock negatif.

Le FCFA reste la devise interne de reference.

## 2. Principes non negociables

```text
Chaque achat garde son propre taux historique.
Le taux d'un ancien achat ne change jamais.
Le CMUP est calcule cote backend.
Le stock et le CMUP changent uniquement a la validation d'un achat.
Un achat brouillon n'impacte pas le stock.
Le stock negatif est interdit.
Les mouvements CMUP doivent etre historises.
```

## 3. Decoupage recommande

Le chantier doit etre livre en plusieurs phases pour eviter de casser les flux existants.

```text
Phase 0 - Preparation et sauvegarde du comportement actuel
Phase 1 - Modele de donnees Prisma
Phase 2 - Moteur devise et taux de change
Phase 3 - Moteur CMUP backend
Phase 4 - Evolution des achats/reappro
Phase 5 - UI admin Achats
Phase 6 - UI CMUP & Valorisation
Phase 7 - Tests, migration et verification
Phase 8 - Durcissement V2
```

## 4. Phase 0 - Preparation

### Objectif

Comprendre et securiser l'existant avant modification.

### Actions

- Lire les flux actuels :
  - `Back-end/src/achat/*`
  - `Back-end/src/ligne-achat/*`
  - `Back-end/src/produit/*`
  - `Back-end/src/mouvement-stock/*`
  - `Font-end-admin/.../src/components/Achats.tsx`
  - `Font-end-admin/.../src/services/api.ts`
- Identifier comment un achat actuel :
  - cree ses lignes ;
  - augmente le stock ;
  - cree les mouvements ;
  - gere la caisse/paiement.
- Ajouter ou completer des tests sur le comportement actuel si necessaire.

### Sortie attendue

- Aucune regression du flux achat actuel.
- Liste precise des endroits ou le stock est modifie.

## 5. Phase 1 - Modele de donnees Prisma

### Objectif

Ajouter les champs necessaires sans perdre les anciennes donnees.

### Modeles a modifier

#### `Fournisseur`

Ajouter :

```text
pays
deviseDefaut
```

Valeurs possibles :

```text
FCFA
NGN
CNY
USD optionnel plus tard
```

#### `Achat`

Ajouter :

```text
devise
tauxChange
dateTaux
sourceTaux
montantTotalDevise
montantTotalFcfa
statutAchat
validatedAt
validatedById
annuleeAt
annuleeById
motifAnnulation
```

Statuts proposes :

```text
BROUILLON
VALIDE
ANNULE
```

#### `LigneAchat`

Ajouter :

```text
prixUnitaireDevise
sousTotalDevise
prixUnitaireFcfa
sousTotalFcfa
coutUnitaireEntreeFcfa
stockAvant
stockApres
cmupAvant
cmupApres
```

#### `Produit`

Ajouter :

```text
cmupActuel
valeurStock
dernierCoutAchatFcfa
derniereDeviseAchat
dernierFournisseurId
dernierAchatAt
```

#### Nouveau modele `TauxChange`

Champs proposes :

```text
id
devise
tauxVersFcfa
source
fetchedAt
createdAt
rawPayload
```

#### Nouveau modele `MouvementCmup`

Champs proposes :

```text
id
produitId
achatId
ligneAchatId
typeMouvement
devise
tauxChange
quantiteEntree
coutUnitaireFcfa
stockAvant
stockApres
cmupAvant
cmupApres
valeurStockAvant
valeurStockApres
createdById
createdAt
```

### Migration des anciennes donnees

Valeurs par defaut :

```text
Fournisseur.deviseDefaut = FCFA
Achat.devise = FCFA
Achat.tauxChange = 1
Achat.montantTotalDevise = montantTotal actuel
Achat.montantTotalFcfa = montantTotal actuel
Achat.statutAchat = VALIDE pour les anciens achats
LigneAchat.prixUnitaireDevise = prixUnitaire actuel
LigneAchat.prixUnitaireFcfa = prixUnitaire actuel
LigneAchat.sousTotalDevise = sousTotal actuel
LigneAchat.sousTotalFcfa = sousTotal actuel
Produit.cmupActuel = prixDetail ou dernier prix achat selon choix initial
```

### Sortie attendue

- Migration Prisma creee.
- Anciennes donnees restent lisibles.
- Les anciens achats apparaissent comme achats FCFA valides.

## 6. Phase 2 - Moteur devise et taux de change

### Objectif

Centraliser la logique de recuperation et d'application du taux de change.

### Backend a ajouter

```text
Back-end/src/taux-change/taux-change.module.ts
Back-end/src/taux-change/taux-change.controller.ts
Back-end/src/taux-change/taux-change.service.ts
Back-end/src/taux-change/dto/*
```

### Endpoints proposes

```text
GET  /api/taux-change/latest?devise=CNY
POST /api/taux-change/refresh
GET  /api/taux-change/history?devise=CNY
```

### Regles

- `FCFA -> FCFA` vaut toujours `1`.
- `NGN` et `CNY` sont convertis vers FCFA.
- Le taux automatique est une proposition.
- L'utilisateur peut saisir un taux manuel.
- L'achat valide garde le taux choisi.

### Source API

Prevoir une abstraction pour ne pas bloquer le projet sur un fournisseur d'API.

Interface logique :

```text
getLatestRate(devise: Devise): Promise<TauxChange>
```

### Fallback

Si l'API de taux est indisponible :

- utiliser le dernier taux connu ;
- afficher un avertissement ;
- permettre une saisie manuelle.

### Sortie attendue

- Le backend peut fournir un taux pour `CNY` et `NGN`.
- Le taux est historise.
- La saisie manuelle reste possible.

## 7. Phase 3 - Moteur CMUP backend

### Objectif

Isoler le calcul CMUP dans un service dedie.

### Backend a ajouter

```text
Back-end/src/cmup/cmup.module.ts
Back-end/src/cmup/cmup.controller.ts
Back-end/src/cmup/cmup.service.ts
Back-end/src/cmup/dto/*
```

### Responsabilites du `CmupService`

```text
Calculer une preview CMUP avant validation
Valider les donnees de stock
Calculer stock avant/apres
Calculer CMUP avant/apres
Mettre a jour Produit.cmupActuel
Mettre a jour Produit.valeurStock
Creer les MouvementCmup
Garantir le stock negatif interdit
```

### Formule

```text
Nouveau CMUP =
(stock avant * ancien CMUP + quantite entree * cout unitaire entree FCFA)
/
(stock avant + quantite entree)
```

Cas particuliers :

```text
Si stock avant = 0, nouveau CMUP = cout unitaire entree FCFA
Si quantite entree <= 0, bloquer
Si cout unitaire entree < 0, bloquer
Si stock apres < 0, bloquer
```

### Endpoints proposes

```text
GET /api/cmup
GET /api/cmup/produits/:id/historique
```

### Sortie attendue

- Le calcul CMUP n'est pas disperse dans `AchatService`.
- L'historique CMUP est consultable.
- Les produits possedent un CMUP actuel fiable.

## 8. Phase 4 - Evolution du flux Achat

### Objectif

Faire passer les achats vers un flux brouillon/validation.

### Backend a modifier

```text
Back-end/src/achat/achat.service.ts
Back-end/src/achat/achat.controller.ts
Back-end/src/achat/dto/*
Back-end/src/ligne-achat/*
```

### Nouveaux endpoints achats

```text
POST /api/achats
GET  /api/achats
GET  /api/achats/:id
PATCH /api/achats/:id
POST /api/achats/:id/preview-cmup
POST /api/achats/:id/valider
POST /api/achats/:id/annuler
```

### Regles de creation

Un achat cree en brouillon :

```text
statutAchat = BROUILLON
aucun impact stock
aucun impact CMUP
aucun mouvement stock
```

### Regles de validation

Lors de `POST /api/achats/:id/valider` :

```text
1. Verifier que l'achat est BROUILLON
2. Verifier lignes non vides
3. Verifier taux valide
4. Convertir les montants en FCFA
5. Augmenter le stock produit
6. Creer les mouvements stock ENTREE
7. Calculer CMUP avant/apres
8. Creer les mouvements CMUP
9. Mettre a jour Produit.cmupActuel / valeurStock
10. Passer Achat en VALIDE
```

Tout doit etre fait dans une transaction Prisma.

### Regles d'annulation

Pour la V1 :

- annulation autorisee seulement si aucune vente ne rend le retour stock incoherent ;
- sinon bloquer et demander correction manuelle controlee.

Version simple possible :

```text
Si achat BROUILLON -> suppression/annulation simple
Si achat VALIDE -> creer une contre-ecriture ou bloquer en V1
```

### Sortie attendue

- Le flux actuel continue de fonctionner, mais avec statut.
- La validation devient le seul moment d'impact stock/CMUP.

## 9. Phase 5 - UI admin Achats

### Objectif

Adapter l'ecran `Achats (Reappro)` a la multi-devise.

### Frontend a modifier

```text
Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard/src/components/Achats.tsx
Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard/src/services/api.ts
Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard/src/types.ts
```

### Formulaire nouvel achat

Ajouter :

```text
Fournisseur
Devise d'achat
Taux de change
Date du taux
Source du taux
Bouton Actualiser le taux
Mode manuel / auto
```

### Table lignes achat

Colonnes :

```text
Produit
Quantite
Prix unitaire devise
Total devise
Prix unitaire FCFA
Total FCFA
CMUP avant
CMUP apres
```

### Resume bas de formulaire

Afficher :

```text
Total devise
Total FCFA
Nombre de produits
Impact stock
Impact CMUP
```

### Historique achats

Colonnes :

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

### Actions

```text
Voir detail
Modifier brouillon
Valider brouillon
Annuler
Exporter CSV
```

### Sortie attendue

- L'utilisateur comprend la devise fournisseur et l'equivalent FCFA.
- L'utilisateur voit le taux avant validation.
- L'utilisateur voit l'impact CMUP avant validation.

## 10. Phase 6 - UI CMUP & Valorisation

### Objectif

Ajouter un espace d'analyse du CMUP et des marges.

### Frontend a ajouter

```text
Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard/src/components/CmupValorisation.tsx
```

Modifier le routing :

```text
Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard/src/App.tsx
Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard/src/components/Sidebar.tsx
```

### Vue principale

Filtres :

```text
Recherche produit
Categorie
Marge faible
Vente a perte
Stock valorise eleve
Derniere devise
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

### Detail produit

Afficher :

```text
Historique CMUP
Date
Type mouvement
Achat
Fournisseur
Devise
Taux
Quantite entree
Cout unitaire FCFA
CMUP avant
CMUP apres
Utilisateur
```

### Badges

```text
Marge saine
Marge faible
Vente a perte
Stock dormant
```

### Sortie attendue

- L'admin voit rapidement les produits rentables ou risqués.
- Le CMUP devient explicable ligne par ligne.

## 11. Phase 7 - Tests et verification

### Tests backend prioritaires

Ajouter des tests sur :

```text
TauxChangeService
CmupService
AchatService validation
AchatService preview CMUP
Stock negatif interdit
Ancien achat FCFA
Achat CNY
Achat NGN
Stock initial zero
Plusieurs achats successifs avec taux differents
```

### Scenarios minimum

#### Scenario 1 - Achat FCFA

```text
Stock avant : 0
Achat : 10 unites a 1 000 FCFA
CMUP attendu : 1 000 FCFA
Stock attendu : 10
```

#### Scenario 2 - Achat CNY

```text
Stock avant : 10
CMUP avant : 1 000 FCFA
Achat : 20 unites a 15 CNY
Taux : 84
Cout unitaire FCFA : 1 260
CMUP attendu : 1 173,33 FCFA
Stock attendu : 30
```

#### Scenario 3 - Deux achats avec taux differents

```text
Achat #1 : CNY taux 84
Achat #2 : CNY taux 60
Verifier que l'achat #1 garde 84
Verifier que l'achat #2 garde 60
```

#### Scenario 4 - Brouillon

```text
Creer achat BROUILLON
Verifier stock inchange
Verifier CMUP inchange
```

#### Scenario 5 - Validation

```text
Valider achat BROUILLON
Verifier stock mis a jour
Verifier CMUP mis a jour
Verifier mouvements stock et CMUP crees
```

### Verifications frontend

Commandes :

```text
npm.cmd run lint
npm.cmd run build
```

Verifier :

```text
Creation achat FCFA
Creation achat NGN
Creation achat CNY
Taux automatique affiche
Taux manuel possible
Preview CMUP affichee
Validation achat
Historique achats
Onglet CMUP
```

## 12. Migration et compatibilite

### Objectif

Ne pas casser les achats existants.

### Regles

Tous les achats existants sont consideres comme :

```text
devise = FCFA
tauxChange = 1
statutAchat = VALIDE
montantTotalDevise = montantTotal
montantTotalFcfa = montantTotal
```

Tous les fournisseurs existants :

```text
deviseDefaut = FCFA
```

Tous les produits existants :

```text
cmupActuel = valeur initiale a definir
valeurStock = quantiteStock * cmupActuel
```

Decision a prendre avant implementation :

```text
Initialiser cmupActuel avec prixDetail ?
Initialiser cmupActuel avec dernier prix achat connu ?
Initialiser cmupActuel a 0 et laisser les futurs achats l'etablir ?
```

Recommandation :

```text
Si historique achats fiable : dernier prix achat FCFA.
Sinon : prixDetail comme valeur temporaire, avec badge "CMUP initialise".
```

## 13. Risques techniques

### Risque 1 - Calculs financiers en Float

Le schema actuel utilise parfois `Float` et parfois `Decimal`.

Recommendation :

```text
Utiliser Decimal pour les montants et taux importants.
Limiter les arrondis au moment de l'affichage.
```

### Risque 2 - Recalcul retroactif

Modifier un ancien achat valide peut casser l'historique.

Recommendation :

```text
Interdire la modification directe d'un achat VALIDE.
Utiliser annulation ou contre-ecriture.
```

### Risque 3 - API de taux indisponible

Recommendation :

```text
Dernier taux connu + saisie manuelle.
Ne jamais bloquer totalement l'achat si l'utilisateur peut saisir un taux.
```

### Risque 4 - Incoherence stock/CMUP

Recommendation :

```text
Transaction Prisma obligatoire a la validation.
Tests sur chaque scenario critique.
```

### Risque 5 - UI trop dense

Recommendation :

```text
Afficher une table compacte par defaut.
Mettre les details CMUP dans un panneau detail ou modal.
```

## 14. Critères d'acceptation V1

La V1 est terminee si :

```text
Un fournisseur peut avoir une devise par defaut.
Un achat peut etre cree en FCFA, NGN ou CNY.
Un taux automatique ou manuel peut etre associe a l'achat.
Le taux est conserve sur l'achat valide.
Les lignes affichent les montants devise et FCFA.
Un achat brouillon n'impacte pas le stock.
La validation d'un achat augmente le stock.
La validation recalcule le CMUP.
Un historique CMUP est cree.
L'onglet CMUP affiche stock, CMUP, marge et valeur stock.
Le stock negatif reste interdit.
Les anciens achats restent consultables.
Les tests backend critiques passent.
Le front admin typecheck/build passe.
```

## 15. Ordre d'implementation conseille

```text
1. Ajouter champs Prisma + migration
2. Mettre a jour seed/migration anciennes donnees
3. Creer TauxChangeService
4. Creer CmupService
5. Ajouter preview CMUP backend
6. Ajouter validation achat backend
7. Adapter AchatService sans casser l'historique
8. Adapter api.ts front admin
9. Adapter UI Achats
10. Ajouter UI CMUP & Valorisation
11. Ajouter tests backend
12. Corriger typecheck/build front admin
13. Faire recette manuelle complete
```

## 16. Hors scope V1

Pour eviter une premiere version trop lourde, garder hors V1 :

```text
Frais douane / transport repartis automatiquement
Plusieurs devises dans un meme achat
Recalcul retroactif d'anciens achats
Recommandation automatique de prix de vente
Synchronisation comptable avancee
Rapports financiers complets
```

Ces elements sont a traiter en V2 apres validation du coeur multi-devise + CMUP.

## 17. Conclusion

La bonne implementation doit eviter de simplement ajouter des colonnes visuelles. Le vrai changement est metier :

```text
Fournisseur -> devise
Achat -> taux historique
Ligne achat -> conversion FCFA
Validation -> stock + CMUP
Produit -> CMUP actuel + valeur stock
Historique -> preuve du calcul
UI -> comprehension et controle
```

Le backend doit rester la source de verite. Le frontend doit aider a saisir, previsualiser et comprendre, mais il ne doit pas etre responsable du calcul final.
