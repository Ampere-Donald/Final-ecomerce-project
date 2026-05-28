# Livraison 2 - Caisse principale, coffres virtuels et transferts

Date: 2026-05-28

## 1. Fichiers crees / modifies

Migration et schema:
- `Back-end/prisma/schema.prisma`
- `Back-end/prisma/migrations/20260528083219_add_coffre_and_caisse_immutability/migration.sql`
- `Back-end/scripts/ensure-schema.js`

Backend:
- `Back-end/src/app.module.ts`
- `Back-end/src/caisse/caisse.controller.ts`
- `Back-end/src/caisse/caisse.service.ts`
- `Back-end/src/caisse/dto/annuler-caisse.dto.ts`
- `Back-end/src/coffre/coffre.module.ts`
- `Back-end/src/coffre/coffre.controller.ts`
- `Back-end/src/coffre/coffre.service.ts`
- `Back-end/src/coffre/dto/create-coffre.dto.ts`
- `Back-end/src/coffre/dto/update-coffre.dto.ts`
- `Back-end/src/coffre/dto/transfert.dto.ts`
- `Back-end/src/coffre/dto/sortie-coffre.dto.ts`
- `Back-end/src/vente/vente.service.ts`
- `Back-end/src/commande/commande.service.ts`
- `Back-end/package.json`

Tests:
- `Back-end/src/caisse/caisse.service.spec.ts`
- `Back-end/src/coffre/coffre.service.spec.ts`

Dashboard admin:
- `Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard/src/services/api.ts`
- `Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard/src/components/Caisse.tsx`
- `Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard/src/components/Coffres.tsx`
- `Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard/src/components/Dashboard.tsx`
- `Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard/src/components/Sidebar.tsx`
- `Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard/src/App.tsx`
- `Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard/src/utils/permissions.ts`

## 2. Migration generee

Nom:
- `20260528083219_add_coffre_and_caisse_immutability`

Resume SQL:
- Cree l'enum `CoffreStatut` avec `ACTIF`, `ATTEINT`, `CLOTURE`.
- Cree la table `coffre`.
- Ajoute a `caisse`:
  - `id_coffre`
  - `transfert_group_id`
  - `annulee`
  - `motif_annulation`
  - `annulee_by`
  - `annulee_at`
  - `effectuee_par`
- Ajoute les index:
  - `caisse_id_coffre_idx`
  - `caisse_transfert_group_id_idx`
- Ajoute la FK `caisse_id_coffre_fkey` vers `coffre(id)`.
- `ensure-schema.js` a ete etendu avec les memes ajouts en mode idempotent pour la prod.

## 3. Endpoints finaux et roles

### Caisse

Toutes les routes caisse restent sous `AdminAuthGuard + RolesGuard`.

| Route | Roles | Description |
| --- | --- | --- |
| `POST /api/caisse` | `SUPER_ADMIN`, `ADMIN` | Cree une ecriture manuelle dans la caisse principale. |
| `GET /api/caisse` | `SUPER_ADMIN`, `ADMIN` | Liste les ecritures, avec `vente`, `achat`, `coffre`, champs d'annulation et transfert. |
| `GET /api/caisse/solde` | `SUPER_ADMIN`, `ADMIN` | Solde caisse principale uniquement: `coffreId = null`, `annulee = false`. |
| `GET /api/caisse/solde-global` | `SUPER_ADMIN`, `ADMIN` | Retourne caisse principale, soldes coffres non clotures, total tresorerie. |
| `POST /api/caisse/transferer` | `SUPER_ADMIN`, `ADMIN` | Transfert caisse principale vers coffre, 2 ecritures atomiques liees par `transfertGroupId`. |
| `POST /api/caisse/:id/annuler` | `SUPER_ADMIN` | Annule une ecriture. Si transfert, annule les 2 lignes du groupe. |
| `GET /api/caisse/:id` | `SUPER_ADMIN`, `ADMIN` | Detail d'une ecriture. |

Routes volontairement retirees du controller:
- `PATCH /api/caisse/:id`
- `DELETE /api/caisse/:id`

### Coffres

Toutes les routes coffres sont sous `AdminAuthGuard + RolesGuard`.

| Route | Roles | Description |
| --- | --- | --- |
| `POST /api/coffres` | `SUPER_ADMIN`, `ADMIN` | Cree un coffre actif. |
| `GET /api/coffres` | `SUPER_ADMIN`, `ADMIN` | Liste tous les coffres avec `soldeActuel` et progression. |
| `GET /api/coffres/:id` | `SUPER_ADMIN`, `ADMIN` | Detail coffre + historique des ecritures. |
| `PATCH /api/coffres/:id` | `SUPER_ADMIN`, `ADMIN` | Modifie uniquement les champs descriptifs. |
| `POST /api/coffres/:id/sortie` | `SUPER_ADMIN`, `ADMIN` | Sortie coffre vers exterieur, solde negatif interdit. |
| `POST /api/coffres/:id/cloturer` | `SUPER_ADMIN` | Cloture un coffre si solde nul, avec confirmation force si warning. |

## 4. Verifications

Commandes lancees:

```bash
cd Back-end && npm run build
cd Back-end && npm test -- --runInBand
cd Back-end && npx prisma migrate dev
cd Back-end && npx prisma migrate deploy
cd Back-end && npx prisma migrate status
cd Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard && npm run build
cd Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard && npm run lint
```

Resultats:
- Backend build: OK.
- Backend tests: OK, 5 suites / 9 tests.
- Frontend admin build: OK.
- Frontend admin typecheck `tsc --noEmit`: OK.
- `prisma migrate dev`: refuse par Prisma a cause d'un drift preexistant sur la base Railway et de migrations appliquees en base absentes du dossier local. Aucun reset destructeur n'a ete lance.
- `prisma migrate deploy`: OK, migration `20260528083219_add_coffre_and_caisse_immutability` appliquee.
- `prisma migrate status`: OK, schema a jour.

Tests unitaires ajoutes:
- Transfert caisse vers coffre: 2 ecritures dans une transaction et meme `transfertGroupId`.
- Transfert refuse si solde caisse insuffisant.
- Annulation d'un transfert: annule les 2 lignes du groupe.
- Solde global: caisse principale + coffres non clotures.
- Sortie coffre refusee si solde insuffisant.
- Cloture coffre refusee si solde non nul.

## 5. Points d'attention / decisions

- Le registre `Caisse` reste la seule source de verite; aucun modele `TransactionCaisse` n'a ete cree.
- Les achats ne creent toujours pas de sortie caisse automatiquement.
- Les ventes et `processPickup` conservent l'entree caisse automatique; elles renseignent maintenant aussi `effectueePar` quand l'acteur admin est disponible.
- Les notifications utilisent les types existants `CAISSE_CREEE` et `CAISSE_MAJ`; aucun nouvel enum de notification n'a ete ajoute.
- Le test manuel complet avec creation de vraies ecritures n'a pas ete execute contre Railway pour eviter de polluer les donnees reelles; les flux critiques sont couverts par tests unitaires et la migration a ete appliquee sur la base configuree.
- Le warning Vite sur les chunks > 500 kB existait deja et n'est pas lie a cette livraison.
