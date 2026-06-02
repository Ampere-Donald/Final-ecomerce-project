# Plan d'implementation v2 - Stocks multi-devises & CMUP

Date : 2026-06-02
Documents lies :
- `docs/brainstorming_multi_devises_cmup.md`
- `docs/plan_implementation_multi_devises_cmup.md` (v1, conserve pour historique)
- `docs/audit_complete.md`

Cette v2 reprend le plan v1 et y integre les decisions tranchees ci-dessous,
plus une Phase 1bis dediee a la securisation du stock.

## 0. Decisions figees (a respecter partout)

```text
D1. valeurStock = calculee a la volee (quantiteStock * cmupActuel), JAMAIS stockee.
D2. Seed cmupActuel initial = dernier achat FCFA connu, sinon prixGros, sinon 0.
    Ne JAMAIS initialiser avec prixDetail (prix de vente, fausse les marges).
D3. Retours / ajustements de stock = CMUP inchange en V1.
    Seul un achat VALIDE recalcule le CMUP.
D4. Preview CMUP = endpoint stateless (corps = lignes + taux), sans persister de brouillon.
D5. Stock negatif interdit = garde transactionnel sur les SORTIES
    (Vente / Ticket / Commande), pas dans le CmupService.
D6. Decimal partout pour l'argent.
    tauxChange Decimal(12,6) ; cmupActuel / montants Decimal(12,2).
    Arrondi uniquement a l'affichage.
```

Consequences directes :

- `Produit.valeurStock` n'est PAS une colonne (D1).
- Le seul moment ou le CMUP change est la validation d'un achat (D3).
- Le blocage du stock negatif est un chantier d'entree (Phase 1bis), distinct du CMUP (D5).

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
- d'interdire le stock negatif (sur les sorties).

Le FCFA reste la devise interne de reference.

## 2. Principes non negociables

```text
Chaque achat garde son propre taux historique.
Le taux d'un ancien achat ne change jamais.
Le CMUP est calcule cote backend.
Le stock et le CMUP changent uniquement a la validation d'un achat.
Un achat brouillon n'impacte ni le stock ni le CMUP.
Le stock negatif est interdit (controle sur les sorties).
Les mouvements CMUP doivent etre historises.
Tous les calculs monetaires utilisent Decimal.
```

## 3. Etat actuel verifie (point de depart)

Constate dans le code au 2026-06-02 :

- `Back-end/src/achat/achat.service.ts`
  - `create()` cree l'achat + lignes ET incremente le stock + cree le mouvement
    `ENTREE` immediatement, dans une transaction, SANS aucun statut.
  - `update()` et `remove()` ne reajustent PAS le stock (bug existant :
    supprimer un achat laisse le stock gonfle).
- `Back-end/prisma/schema.prisma`
  - `Produit.prixDetail / prixGros / prixPromo` sont en `Float` (a surveiller).
  - `Achat`, `LigneAchat`, `Vente`, `Caisse` sont en `Decimal`.
  - `Achat` n'a ni devise, ni taux, ni statut metier (seulement `statutPaiement`).
  - `Fournisseur` n'a ni pays ni devise.
- Audit : annulation commande ne restitue pas le stock (P1) ;
  risque de survente sur tickets concurrents (P2).

Implication : le passage en BROUILLON/VALIDE change un comportement reel.
Tous les appelants de l'ancien POST achat devront passer par `/valider`
pour que le stock soit reellement impacte (voir Phase 4).

## 4. Decoupage recommande

```text
Phase 0    - Preparation et cartographie de l'existant
Phase 1    - Modele de donnees Prisma + migration
Phase 1bis - Securisation du stock (negatif interdit + restitution)   <-- NOUVEAU
Phase 2    - Moteur devise et taux de change
Phase 3    - Moteur CMUP backend
Phase 4    - Evolution du flux Achat (brouillon / validation)
Phase 5    - UI admin Achats
Phase 6    - UI CMUP & Valorisation
Phase 7    - Tests, migration et verification
Phase 8    - Durcissement V2
```

Ordre d'implementation conseille en fin de document (section 17).

## 5. Phase 0 - Preparation

### Objectif

Comprendre et securiser l'existant avant modification.

### Actions

- Lire les flux actuels :
  - `Back-end/src/achat/*`
  - `Back-end/src/ligne-achat/*`
  - `Back-end/src/produit/*`
  - `Back-end/src/mouvement-stock/*`
  - `Back-end/src/vente/*`, `Back-end/src/vente/ticket*` ou module tickets
  - `Back-end/src/commande/*`
  - `Font-end-admin/.../src/components/Achats.tsx`
  - `Font-end-admin/.../src/services/api.ts`
- Lister TOUS les endroits ou le stock est modifie (entrees ET sorties).
- Lister TOUS les appelants de l'API achat (front admin, scripts, imports).
- Identifier comment un achat actuel : cree ses lignes, augmente le stock,
  cree les mouvements, gere la caisse/paiement.

### Sortie attendue

- Carte precise des points de modification du stock.
- Liste des appelants de l'API achat a migrer en Phase 4.
- Aucune regression introduite a cette phase (lecture seule).

## 6. Phase 1 - Modele de donnees Prisma

### Objectif

Ajouter les champs necessaires sans perdre les anciennes donnees.

### Modeles a modifier

#### `Fournisseur`

Ajouter :

```text
pays            String?   (libre ou enum Pays)
deviseDefaut    Devise    @default(FCFA)
```

#### `Achat`

Ajouter :

```text
devise               Devise    @default(FCFA)
tauxChange           Decimal   @db.Decimal(12,6)  @default(1)
dateTaux             DateTime?
sourceTaux           SourceTaux @default(MANUEL)
montantTotalDevise   Decimal   @db.Decimal(12,2)
montantTotalFcfa     Decimal   @db.Decimal(12,2)
statutAchat          StatutAchat @default(BROUILLON)
validatedAt          DateTime?
validatedById        String?
annuleeAt            DateTime?
annuleeById          String?
motifAnnulation      String?
```

#### `LigneAchat`

Ajouter :

```text
prixUnitaireDevise      Decimal @db.Decimal(12,2)
sousTotalDevise         Decimal @db.Decimal(12,2)
prixUnitaireFcfa        Decimal @db.Decimal(12,2)
sousTotalFcfa           Decimal @db.Decimal(12,2)
coutUnitaireEntreeFcfa  Decimal @db.Decimal(12,2)
stockAvant              Int
stockApres              Int
cmupAvant               Decimal @db.Decimal(12,2)
cmupApres               Decimal @db.Decimal(12,2)
```

#### `Produit`

Ajouter :

```text
cmupActuel              Decimal  @db.Decimal(12,2) @default(0)
dernierCoutAchatFcfa    Decimal? @db.Decimal(12,2)
derniereDeviseAchat     Devise?
dernierFournisseurId    String?
dernierAchatAt          DateTime?
```

Important (D1) : ne PAS ajouter de colonne `valeurStock`.
`valeurStock` se calcule a la lecture : `quantiteStock * cmupActuel`.

Note : `prixDetail / prixGros / prixPromo` restent en `Float` pour l'instant.
Migration de ces 3 champs vers `Decimal` = chantier separe (hors V1, voir Risques).

#### Nouveau modele `TauxChange`

```text
id              String   @id @default(uuid())
devise          Devise
tauxVersFcfa    Decimal  @db.Decimal(12,6)
source          SourceTaux
fetchedAt       DateTime
rawPayload      Json?
createdAt       DateTime @default(now())

@@index([devise, fetchedAt])
```

#### Nouveau modele `MouvementCmup`

```text
id                 String   @id @default(uuid())
produitId          String
achatId            String?
ligneAchatId       String?
typeMouvement      String                       // ENTREE_ACHAT, ...
devise             Devise
tauxChange         Decimal  @db.Decimal(12,6)
quantiteEntree     Int
coutUnitaireFcfa   Decimal  @db.Decimal(12,2)
stockAvant         Int
stockApres         Int
cmupAvant          Decimal  @db.Decimal(12,2)
cmupApres          Decimal  @db.Decimal(12,2)
createdById        String?
createdAt          DateTime @default(now())

@@index([produitId, createdAt])
```

Note : pas de `valeurStockAvant/Apres` stockes (D1) ; deductibles si besoin.

#### Nouveaux enums

```text
enum Devise       { FCFA NGN CNY }            // USD plus tard
enum SourceTaux   { API MANUEL BANQUE BUREAU_CHANGE AUTRE }
enum StatutAchat  { BROUILLON VALIDE ANNULE }
```

### Migration des anciennes donnees (D2)

```text
Fournisseur.deviseDefaut       = FCFA
Achat.devise                   = FCFA
Achat.tauxChange               = 1
Achat.dateTaux                 = dateAchat
Achat.sourceTaux               = MANUEL
Achat.montantTotalDevise       = montantTotal
Achat.montantTotalFcfa         = montantTotal
Achat.statutAchat              = VALIDE  (anciens achats deja impactes au stock)
LigneAchat.prixUnitaireDevise  = prixUnitaire
LigneAchat.prixUnitaireFcfa    = prixUnitaire
LigneAchat.sousTotalDevise     = sousTotal
LigneAchat.sousTotalFcfa       = sousTotal
LigneAchat.coutUnitaireEntreeFcfa = prixUnitaire
LigneAchat.stockAvant/cmupAvant/stockApres/cmupApres = NULL ou 0 (historique non reconstruit)
```

Seed `Produit.cmupActuel` (D2), par ordre de preference :

```text
1. dernier prix d'achat FCFA connu du produit (si historique fiable)
2. sinon prixGros
3. sinon 0  + badge UI "CMUP non initialise"
```

Ne pas utiliser `prixDetail`.

### Sortie attendue

- Migration Prisma creee et reversible si possible.
- Anciens achats lisibles, marques FCFA / VALIDE.
- Produits avec un `cmupActuel` initial coherent (jamais un prix de vente).

## 7. Phase 1bis - Securisation du stock (NOUVEAU)

### Pourquoi avant le CMUP

Le CMUP doit etre bati sur un stock fiable. Or l'audit signale deux trous
sur les SORTIES (P1 annulation commande, P2 survente ticket) et le
brainstorming impose "stock negatif interdit". C'est le meme garde
transactionnel. On le traite ici, une fois, avant le moteur CMUP.

### Actions

1. Interdiction du stock negatif sur toutes les sorties.
   Remplacer les decrements simples par un update conditionnel atomique :

   ```text
   UPDATE produit
   SET quantite_stock = quantite_stock - :q
   WHERE id = :id AND quantite_stock >= :q
   ```

   Si 0 ligne affectee -> lever une erreur stock insuffisant et rollback.
   A appliquer dans : VenteService, TicketVenteService (encaissement),
   CommandeService (creation).

2. Restitution du stock a l'annulation de commande (audit P1).
   Dans une transaction :
   - annuler seulement une commande annulable ;
   - incrementer le stock de chaque ligne ;
   - creer un MouvementStock `RETOUR` (ou `AJUSTEMENT`) ;
   - idempotent (ne pas restituer deux fois).
   Rappel D3 : un retour NE recalcule PAS le CMUP.

3. Verification stock dans la transaction d'encaissement ticket (audit P2).
   Le stock est verifie a la creation du ticket mais pas verrouille ;
   re-verifier/decrementer de facon conditionnelle a l'encaissement.

### Sortie attendue

- Impossible de rendre un stock negatif via une vente/ticket/commande.
- L'annulation de commande restitue correctement le stock.
- Tests de concurrence sur les sorties (voir Phase 7).

## 8. Phase 2 - Moteur devise et taux de change

### Backend a ajouter

```text
Back-end/src/taux-change/taux-change.module.ts
Back-end/src/taux-change/taux-change.controller.ts
Back-end/src/taux-change/taux-change.service.ts
Back-end/src/taux-change/dto/*
```

### Endpoints

```text
GET  /api/taux-change/latest?devise=CNY
POST /api/taux-change/refresh        (roles restreints, voir securite)
GET  /api/taux-change/history?devise=CNY
```

### Regles

- `FCFA -> FCFA` vaut toujours `1`.
- `NGN` et `CNY` sont convertis vers FCFA.
- Le taux automatique est une PROPOSITION ; l'utilisateur peut le modifier.
- L'achat valide fige le taux choisi.
- Alerte UI si le taux manuel s'ecarte trop du taux auto (ex. > 15%).

### Source API (abstraction)

```text
interface RateProvider {
  getLatestRate(devise: Devise): Promise<{ taux: Decimal; fetchedAt: Date; raw: unknown }>;
}
```

Note metier utile : le FCFA (XAF) est arrime a l'euro
(1 EUR = 655,957 XAF, fixe). CNY->XAF est donc derivable de facon fiable
via l'EUR ; NGN flotte reellement. Choisir un provider qui couvre EUR/CNY/NGN.

### Fallback

Si l'API est indisponible :

- utiliser le dernier taux connu (`TauxChange` le plus recent) ;
- afficher un avertissement ;
- permettre la saisie manuelle.
- Ne jamais bloquer totalement l'achat si l'utilisateur peut saisir un taux.

### Sortie attendue

- Taux disponible pour `CNY` et `NGN`, historise.
- Saisie manuelle toujours possible.

## 9. Phase 3 - Moteur CMUP backend

### Backend a ajouter

```text
Back-end/src/cmup/cmup.module.ts
Back-end/src/cmup/cmup.controller.ts
Back-end/src/cmup/cmup.service.ts
Back-end/src/cmup/dto/*
```

### Responsabilites du `CmupService`

```text
Calculer une preview CMUP stateless (sans persister) [D4]
Calculer stock avant/apres et CMUP avant/apres
Mettre a jour Produit.cmupActuel (transaction, validation achat)
Creer les MouvementCmup
Exposer l'historique CMUP par produit
```

Hors responsabilite (important) :

```text
NE gere PAS l'interdiction de stock negatif (c'est Phase 1bis / sorties) [D5]
NE recalcule PAS le CMUP sur retours/ajustements [D3]
NE stocke PAS valeurStock [D1]
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
Si stock avant = 0  -> nouveau CMUP = cout unitaire entree FCFA
Si quantite entree <= 0 -> bloquer
Si cout unitaire entree < 0 -> bloquer
```

### Concurrence (a ne pas oublier)

Une transaction Prisma seule ne suffit pas contre deux validations
simultanees sur le meme produit (read-modify-write du CMUP).

```text
Au choix :
- verrou pessimiste : SELECT ... FOR UPDATE sur le produit dans la transaction ;
- ou update optimiste via Produit.version (deja present) avec retry.
```

### Endpoints

```text
POST /api/cmup/preview      (stateless : corps = lignes + taux + devise) [D4]
GET  /api/cmup
GET  /api/cmup/produits/:id/historique
```

Note : la preview ne prend PAS d'`:id` d'achat (D4) ; elle se calcule
a partir du corps de la requete pendant la saisie du formulaire.

### Sortie attendue

- Calcul CMUP centralise, hors `AchatService`.
- Historique CMUP consultable et explicable.
- `cmupActuel` fiable et protege contre les races.

## 10. Phase 4 - Evolution du flux Achat (brouillon / validation)

### Backend a modifier

```text
Back-end/src/achat/achat.service.ts
Back-end/src/achat/achat.controller.ts
Back-end/src/achat/dto/*
Back-end/src/ligne-achat/*
```

### Endpoints achats

```text
POST  /api/achats                 -> cree un BROUILLON (aucun impact stock/CMUP)
GET   /api/achats
GET   /api/achats/:id
PATCH /api/achats/:id             -> editable seulement si BROUILLON
POST  /api/achats/:id/valider     -> seul moment d'impact stock + CMUP
POST  /api/achats/:id/annuler
DELETE /api/achats/:id            -> autorise seulement si BROUILLON
```

Changement de comportement majeur (vs code actuel) :
`POST /api/achats` n'impacte PLUS le stock. Il faut migrer tous les appelants
listes en Phase 0 pour qu'ils appellent ensuite `/valider`.

### Regles de creation (BROUILLON)

```text
statutAchat = BROUILLON
aucun impact stock
aucun impact CMUP
aucun mouvement stock
```

### Regles de validation (`POST /api/achats/:id/valider`)

Tout dans UNE transaction Prisma :

```text
1.  Verifier statutAchat == BROUILLON
2.  Verifier lignes non vides
3.  Verifier taux valide (> 0)
4.  Convertir chaque ligne en FCFA (fige le taux sur l'achat)
5.  Verrouiller les produits impactes (FOR UPDATE / version)
6.  Augmenter le stock produit
7.  Creer les MouvementStock ENTREE
8.  Calculer CMUP avant/apres (CmupService)
9.  Creer les MouvementCmup
10. Mettre a jour Produit.cmupActuel + champs dernier achat
11. Renseigner LigneAchat (stockAvant/Apres, cmupAvant/Apres, couts FCFA)
12. Passer Achat en VALIDE (validatedAt, validatedById)
13. Tracer dans ActivityLog
```

### Regles d'annulation (V1)

```text
Si achat BROUILLON -> suppression / annulation simple.
Si achat VALIDE    -> contre-ecriture controlee, ou bloquer en V1
                      si le retour stock rendrait un stock incoherent
                      (ventes intervenues entre temps).
```

Ne JAMAIS modifier directement un achat VALIDE (casse l'historique).

### Securite / permissions

```text
valider / annuler un achat        -> SUPER_ADMIN, ADMIN, MANAGER
rafraichir un taux (refresh)      -> SUPER_ADMIN, ADMIN, MANAGER
Toute validation/annulation -> ActivityLog.
```

### Sortie attendue

- Le stock/CMUP ne bouge qu'a la validation.
- Les anciens achats restent consultables (VALIDE FCFA).
- Aucun appelant ne laisse un achat sans impact par oubli de `/valider`.

## 11. Phase 5 - UI admin Achats

### Frontend a modifier

```text
Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard/src/components/Achats.tsx
Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard/src/services/api.ts
Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard/src/types.ts
```

### Formulaire nouvel achat

```text
Fournisseur (charge sa devise par defaut)
Devise d'achat (modifiable)
Taux de change (auto propose, modifiable)
Date du taux
Source du taux
Bouton Actualiser le taux
Mode manuel / auto
Alerte si ecart taux manuel vs auto
```

### Table lignes achat

```text
Produit | Quantite | Prix u. devise | Total devise
        | Prix u. FCFA | Total FCFA | CMUP avant | CMUP apres
```

La preview CMUP (colonnes avant/apres) vient de `POST /api/cmup/preview` (D4),
appele a la volee pendant la saisie, sans creer de brouillon.

### Resume bas de formulaire

```text
Total devise | Total FCFA | Nombre de produits | Impact stock | Impact CMUP
```

### Historique achats

```text
ID | Fournisseur | Devise | Produits | Date | Total devise | Total FCFA
   | Statut | Paiement | Actions
```

Actions : Voir detail | Modifier brouillon | Valider brouillon | Annuler | Exporter CSV.

### Sortie attendue

- L'utilisateur voit devise fournisseur, taux, equivalent FCFA et impact CMUP
  AVANT de valider.

## 12. Phase 6 - UI CMUP & Valorisation

### Frontend a ajouter

```text
Font-end-admin/.../src/components/CmupValorisation.tsx
```

Routing :

```text
Font-end-admin/.../src/App.tsx
Font-end-admin/.../src/components/Sidebar.tsx
```

### Table principale

```text
Produit | Stock actuel | CMUP actuel | Prix detail | Marge FCFA | Marge %
        | Valeur stock | Dernier fournisseur | Derniere devise | Dernier achat
```

Rappel D1 : `Valeur stock = Stock actuel * CMUP actuel`, calcule a l'affichage.

### Filtres

```text
Recherche produit | Categorie | Marge faible | Vente a perte
                  | Stock valorise eleve | Derniere devise
```

### Detail produit (historique CMUP)

```text
Date | Type mouvement | Achat | Fournisseur | Devise | Taux
     | Quantite entree | Cout unitaire FCFA | CMUP avant | CMUP apres | Utilisateur
```

### Badges

```text
Marge saine | Marge faible | Vente a perte | Stock dormant | CMUP non initialise
```

Le badge "CMUP non initialise" s'affiche pour les produits seedes a 0 (D2).

### Sortie attendue

- CMUP explicable ligne par ligne.
- Produits rentables / risques identifies rapidement.

## 13. Phase 7 - Tests et verification

### Tests backend prioritaires

```text
TauxChangeService (auto, fallback, manuel)
CmupService.preview (stateless)
CmupService validation (mise a jour cmupActuel + MouvementCmup)
AchatService creation BROUILLON (aucun impact)
AchatService validation (impact stock + CMUP)
Concurrence : 2 validations simultanees sur meme produit
Phase 1bis : stock negatif refuse sur vente/ticket/commande
Phase 1bis : annulation commande restitue le stock
Migration : ancien achat FCFA VALIDE
Achat CNY / Achat NGN
Stock initial zero (CMUP = cout unitaire)
Plusieurs achats successifs avec taux differents (chacun garde son taux)
```

### Scenarios chiffres

```text
S1 Achat FCFA : stock 0 + 10 a 1000 -> CMUP 1000, stock 10
S2 Achat CNY  : stock 10 / CMUP 1000 ; +20 a 15 CNY taux 84 (=1260 FCFA)
                -> CMUP 1173,33 ; stock 30
S3 Deux achats CNY taux 84 puis 60 -> #1 garde 84, #2 garde 60
S4 Brouillon  : creer -> stock et CMUP inchanges
S5 Validation : valider -> stock + CMUP a jour, mouvements stock + CMUP crees
S6 Negatif    : vente > stock -> refusee, rollback (Phase 1bis)
S7 Retour     : annulation commande -> stock restitue, CMUP inchange (D3)
```

### Verifications frontend

```text
npm.cmd run lint
npm.cmd run build
```

Checklist manuelle :

```text
Achat FCFA / NGN / CNY
Taux auto affiche + taux manuel possible + alerte ecart
Preview CMUP affichee pendant la saisie (sans brouillon)
Validation achat -> impact visible
Historique achats + statuts
Onglet CMUP : valeur stock = stock * CMUP, marges, badges
```

## 14. Migration et compatibilite

Voir section 6 (Phase 1) pour les valeurs par defaut detaillees.

Rappels :

```text
Anciens achats        -> devise FCFA, taux 1, statut VALIDE.
Anciens fournisseurs  -> deviseDefaut FCFA.
cmupActuel initial    -> dernier achat FCFA, sinon prixGros, sinon 0 (D2).
valeurStock           -> non stockee, calculee a la lecture (D1).
```

## 15. Risques techniques

```text
R1 Float vs Decimal
   Money en Decimal (D6). Les prix Produit restent Float en V1 ;
   migration Float->Decimal = chantier separe, hors V1.

R2 Recalcul retroactif
   Interdire la modification d'un achat VALIDE ; annulation/contre-ecriture.

R3 API de taux indisponible
   Dernier taux connu + saisie manuelle ; ne jamais bloquer totalement.

R4 Concurrence stock/CMUP
   Transaction Prisma + verrou (FOR UPDATE ou version) sur les produits.

R5 Frais d'import non repartis (V2)
   En V1, le CMUP des fournisseurs CNY est SOUS-EVALUE (transport/douane absents),
   donc marges SUR-EVALUEES. A assumer explicitement (badge "hors frais d'import")
   pour ne pas piloter les prix sur un CMUP incomplet.

R6 UI trop dense
   Table compacte par defaut ; details CMUP en panneau/modal.

R7 Appelants oublies de l'API achat
   Un achat cree sans /valider n'impacte plus le stock. Migrer tous les appelants.
```

## 16. Criteres d'acceptation V1

```text
Un fournisseur a une devise par defaut.
Un achat peut etre cree en FCFA, NGN ou CNY.
Un taux auto ou manuel est associe a l'achat et fige a la validation.
Les lignes affichent montants devise ET FCFA.
Un achat BROUILLON n'impacte ni stock ni CMUP.
La validation augmente le stock ET recalcule le CMUP (transaction + verrou).
Un historique CMUP (MouvementCmup) est cree et consultable.
L'onglet CMUP affiche stock, CMUP, marge, et valeur stock (calculee a la volee).
Le stock negatif est refuse sur vente/ticket/commande (Phase 1bis).
L'annulation de commande restitue le stock sans toucher le CMUP.
Les anciens achats restent consultables.
Permissions : seuls SUPER_ADMIN/ADMIN/MANAGER valident/annulent.
Les tests backend critiques passent ; front admin typecheck/build passe.
```

## 17. Ordre d'implementation conseille

```text
1.  Champs Prisma + enums + migration (Phase 1)
2.  Migration des anciennes donnees + seed cmupActuel (D2)
3.  Phase 1bis : stock negatif interdit (sorties) + restitution commande
4.  TauxChangeService (auto + fallback + manuel)
5.  CmupService : preview stateless (D4)
6.  CmupService : validation (cmupActuel + MouvementCmup + verrou)
7.  AchatService : flux BROUILLON / valider / annuler
8.  Migrer les appelants de l'ancien POST achat
9.  api.ts + types.ts front admin
10. UI Achats (formulaire + preview + historique + statuts)
11. UI CMUP & Valorisation
12. Tests backend (dont concurrence + Phase 1bis)
13. Corriger typecheck/build front admin
14. Recette manuelle complete
```

## 18. Hors scope V1 (V2)

```text
Frais douane / transport / transit repartis automatiquement (landed cost)
Plusieurs devises dans un meme achat
Recalcul retroactif d'anciens achats
Recommandation automatique de prix de vente
Migration des prix Produit Float -> Decimal
Rapports financiers / valorisation avances
Synchronisation comptable
```

## 19. Conclusion

Le coeur du chantier est metier, pas cosmetique :

```text
Fournisseur -> devise
Achat       -> taux historique fige
Ligne achat -> conversion FCFA
Validation  -> stock + CMUP (transaction + verrou)
Produit     -> CMUP actuel ; valeur stock calculee a la volee
Historique  -> preuve du calcul (MouvementCmup)
Stock       -> negatif interdit sur les sorties (Phase 1bis)
UI          -> saisir, previsualiser, comprendre (jamais calculer le final)
```

Le backend reste la source de verite. Le frontend aide a saisir, previsualiser
et comprendre, mais ne calcule jamais le resultat definitif.
