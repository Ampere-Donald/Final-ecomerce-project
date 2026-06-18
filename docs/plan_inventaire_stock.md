# Plan — Inventaire par catégorie/famille + verrouillage du stock

> **Statut** : à exécuter
> **Base de données** : PostgreSQL Railway (prod). Migrations **idempotentes**, appliquées par `ensure-schema.js` puis `migrate deploy` au démarrage. **Jamais `migrate dev`.**
> **Rappel déploiement** : toute nouvelle table/colonne DOIT être ajoutée **aussi** dans `Back-end/scripts/ensure-schema.js` (sinon crash prod si `migrate deploy` échoue).

## Contexte

Aujourd'hui le stock peut être modifié **sans aucune trace** via le champ « Quantité » de l'édition produit (`PATCH /produits`). On veut :
1. **Verrouiller le stock** : il ne change que par des canaux audités (réappro, vente, ou ajustement justifié).
2. **Inventaire complet** par catégorie/famille : générer une feuille (catalogue + stock temps réel), saisir le comptage physique, calculer les écarts, et valider → génère des **ajustements tracés**.
3. **Coûts (prix d'achat, CMUP) = super admin uniquement.**

Décisions validées : inventaire **complet** (pas juste l'export) ; filtre **catégorie ET famille** (`codeFamille`) ; export **CSV + PDF** ; **stock en lecture seule** hors canaux audités.

---

## Partie 1 — Verrouillage du stock (fondation)

### 1.1 Édition produit ne touche plus au stock
- **`produit.service.ts` `update()`** : retirer `quantiteStock` de `updateData` (comme on l'a fait pour les prix). Le stock ne change jamais par l'édition produit.
- **`create()`** : on **garde** `quantiteStock` (stock d'ouverture, une seule fois). Optionnel : créer un mouvement `AJUSTEMENT` « Stock d'ouverture » à la création pour la trace.
- **Frontend `Produits.tsx`** : champ « Quantité » **désactivé en mode édition** (`disabled={!!editingProduit}`), éditable seulement à la création. Afficher un libellé « Le stock se modifie via Réapprovisionnement ou Inventaire ».

### 1.2 Ajustement manuel = motif obligatoire
- **`create-mouvement-stock.dto.ts`** : rendre `motif` **obligatoire** quand `typeMouvement = AJUSTEMENT` (validation conditionnelle, ou `@IsNotEmpty` + check service). Déjà restreint à `SUPER_ADMIN, ADMIN`.

### 1.3 Coûts = super admin uniquement
- **`produit.controller.ts`** : `peutVoirCouts` → `['SUPER_ADMIN']` (au lieu de `+ADMIN, +MANAGER`).
- **`cmup.controller.ts`** : passer de `@Roles('SUPER_ADMIN','ADMIN')` à `@Roles('SUPER_ADMIN')`.
- ⚠️ Impact : l'admin ne voit plus la valorisation CMUP ni les coûts produits. Le POS admin n'a plus `cmupActuel` (sans incidence : seul le super admin vend à perte).

> Note : la **séparation réappro** (admin saisit les quantités, super admin saisit les coûts) reste un chantier séparé — non couvert ici.

---

## Partie 2 — Module Inventaire

### 2.1 Schéma Prisma
```prisma
enum StatutInventaire { EN_COURS VALIDE ANNULE }

model Inventaire {
  id          String   @id @default(uuid())
  reference   String   @unique                      // INV-YYYYMMDD-NNNN
  statut      StatutInventaire @default(EN_COURS)
  perimetre   String   @db.VarChar(150)             // "Catégorie: X" | "Famille: Y" | "Complet"
  categorieId String?  @map("categorie_id")
  codeFamille String?  @map("code_famille") @db.VarChar(50)
  createdById String   @map("created_by_id")
  createdAt   DateTime @default(now()) @map("created_at")
  valideAt    DateTime? @map("valide_at")
  valideById  String?  @map("valide_by_id")
  lignes      LigneInventaire[]
  @@map("inventaire")
}

model LigneInventaire {
  id           String  @id @default(uuid())
  inventaireId String  @map("inventaire_id")
  produitId    String  @map("produit_id")
  nomProduit   String  @map("nom_produit") @db.VarChar(150)
  codeFamille  String? @map("code_famille") @db.VarChar(50)
  stockSysteme Int     @map("stock_systeme")        // snapshot à la génération
  stockCompte  Int?    @map("stock_compte")         // saisi au comptage
  ecart        Int?                                  // stockCompte - stockSysteme (à la validation)
  inventaire   Inventaire @relation(fields: [inventaireId], references: [id], onDelete: Cascade)
  @@index([inventaireId])
  @@map("ligne_inventaire")
}
```

### 2.2 Migration idempotente
Fichier `Back-end/prisma/migrations/20260616000000_add_inventaire/migration.sql` :
- `CREATE TYPE "StatutInventaire" ...` (via `DO $$ ... IF NOT EXISTS`)
- `CREATE TABLE IF NOT EXISTS "inventaire" (...)`, `"ligne_inventaire" (...)`, index, FK.
- **Répliquer ces statements dans `ensure-schema.js`.**

### 2.3 Backend — module `inventaire`
- `POST /inventaires` `{ categorieId? | codeFamille? }` → snapshot : lit tous les produits du périmètre, crée l'`Inventaire` + une `LigneInventaire` par produit avec `stockSysteme = quantiteStock`. Rôles : `SUPER_ADMIN, ADMIN`.
- `GET /inventaires` → liste (récents). `GET /inventaires/:id` → détail + lignes.
- `PATCH /inventaires/:id/comptage` `{ lignes: [{ id, stockCompte }] }` → enregistre les quantités comptées. Refusé si `statut != EN_COURS`.
- `POST /inventaires/:id/valider` → transaction atomique :
  - calcule `ecart = stockCompte - stockSysteme` par ligne ;
  - pour chaque `ecart != 0` → crée un `MouvementStock` `AJUSTEMENT` (motif `Inventaire {reference}`) + `quantiteStock { increment: ecart }` ;
  - passe l'inventaire à `VALIDE` (+ `valideById/valideAt`) ;
  - **ActivityLog** `INVENTAIRE_VALIDE` { inventaireId, nbEcarts, viaDelegation }.
  - **Autorisation** : `SUPER_ADMIN` ; OU `ADMIN` **disposant d'une délégation active** (voir 2.4).
- `POST /inventaires/:id/annuler` → `ANNULE` (aucun impact stock).
- Notification au super admin à la validation (résumé des écarts).

### 2.4 Délégation temporaire de validation (super admin → admin)

Par défaut **seul le super admin valide** un inventaire. Il peut **déléguer** ce droit à un admin pour une **période précise**, avec traçabilité complète.

**Schéma** :
```prisma
model DelegationInventaire {
  id          String   @id @default(uuid())
  adminUserId String   @map("admin_user_id")   // l'admin délégué
  accordeById String   @map("accorde_par_id")  // le super admin
  debutAt     DateTime @default(now()) @map("debut_at")
  finAt       DateTime @map("fin_at")           // fin de la période
  active      Boolean  @default(true)
  motif       String?  @db.VarChar(255)
  createdAt   DateTime @default(now()) @map("created_at")
  @@index([adminUserId, active])
  @@map("delegation_inventaire")
}
```

**Endpoints** (super admin only) :
- `POST /inventaires/delegations` `{ adminUserId, finAt, motif? }` → accorde.
- `GET /inventaires/delegations` → liste/historique (= traçabilité des délégations).
- `POST /inventaires/delegations/:id/revoquer` → `active=false`.

**Vérification d'accès à la validation** : un `ADMIN` peut valider s'il existe une délégation `active` avec `debutAt <= now <= finAt`. Sinon `ForbiddenException`.

**Traçabilité de ce que fait l'admin** :
- l'inventaire validé porte `valideById` (l'admin) ;
- `ActivityLog INVENTAIRE_VALIDE` à chaque validation ;
- vue « Journal des délégations » : pour une délégation, lister les inventaires validés par l'admin + les ajustements générés.

### 2.5 Frontend
- **Nouvelle page `Inventaire.tsx`** (groupe Catalogue, accès admin+super) :
  - Liste des inventaires (référence, périmètre, statut, écarts totaux).
  - **Nouvel inventaire** : choix **catégorie** (dropdown noms) **ou famille** (dropdown des `codeFamille` distincts) → crée la session.
  - **Détail** : tableau (produit, stock système, **[input] stock compté**), bouton « Enregistrer le comptage », bouton « Valider » (confirmation, affiche les écarts).
  - **Export CSV + PDF** de la feuille (avant comptage = feuille vierge à imprimer ; après = avec écarts). Colonne **valeur de coût (CMUP) uniquement si super admin**.
- **`Sidebar.tsx`** : item « Inventaire » (icône `ClipboardList`), `can.accessInventaire`.
- **`permissions.ts`** : `accessInventaire: (r) => isAdmin(r)`.
- **`services/api.ts`** : `inventaireApi` (create, getAll, getOne, comptage, valider, annuler).
- **Export** : réutiliser le pattern `jspdf` + `papaparse` déjà présent (cf. `MouvementsStock.tsx`, `Produits.tsx`). Centraliser dans `utils/exportInventaire.ts` (CSV + PDF).

### 2.6 Export rapide (bonus, optionnel)
Bouton « Exporter le stock » sur `Produits.tsx` (filtre catégorie/famille) → CSV/PDF instantané du catalogue + stock courant, sans créer de session. Réutilise `utils/exportInventaire.ts`.

---

## Fichiers critiques
| Zone | Fichier |
|------|---------|
| Verrou stock | `produit.service.ts`, `Produits.tsx`, `create-mouvement-stock.dto.ts`, `produit.controller.ts` (peutVoirCouts), `cmup.controller.ts` |
| Schéma + migration | `schema.prisma`, `migrations/20260616000000_add_inventaire/`, `scripts/ensure-schema.js` |
| Backend inventaire | `src/inventaire/` (module, controller, service, dto) + `app.module.ts` |
| Frontend | `Inventaire.tsx` (nouveau), `Sidebar.tsx`, `permissions.ts`, `services/api.ts`, `utils/exportInventaire.ts` |

## Vérification
1. Migration : `npx prisma migrate deploy && npx prisma generate` — tables présentes.
2. Verrou : éditer un produit → champ Quantité grisé ; tenter `PATCH /produits {quantiteStock}` → le stock ne bouge pas.
3. Inventaire E2E : créer (catégorie X) → snapshot correct → saisir un comptage avec écart → valider → vérifier le `MouvementStock AJUSTEMENT` créé + `quantiteStock` mis à jour + inventaire `VALIDE`.
4. Export : CSV ouvrable Excel + PDF imprimable ; colonne coût **absente** pour un admin, **présente** pour un super admin.
5. Coûts : `GET /cmup` et valorisation → 403 pour un admin.
6. Builds : backend `npm run build` + tests ; frontend `tsc --noEmit` + `build`.

## Décisions validées
- Validation d'inventaire : **super admin uniquement**, sauf **délégation temporaire** à un admin (période précise) + traçabilité (cf. 2.4).
- Stock d'ouverture conservé à la **création** produit (sinon tout produit naît à 0 et se remplit par réappro).
- La **séparation des coûts en réappro** (admin quantités / super admin coûts) est un chantier distinct, non inclus ici.
