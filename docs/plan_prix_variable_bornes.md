# Plan d'implémentation — Prix variable par bornes selon le rôle

> **Statut** : à exécuter
> **Auteur** : brainstorm validé avec Ampère
> **Base de données** : PostgreSQL Railway (prod). Migrations **hand-authored, idempotentes**, appliquées avec `prisma migrate deploy` — **jamais `migrate dev`**.

---

## 0. Objectif

Permettre de vendre un même article à un prix variable, **borné selon le rôle** de la personne qui vend. Le prix n'est plus une valeur fixe : c'est un **intervalle autorisé** qui dépend du rôle (et, pour l'admin, d'une autorisation accordée par le super admin).

---

## 1. Décisions validées

| # | Décision |
|---|----------|
| 1 | **Demi-gros = plancher de prix par rôle, saisi manuellement** au moment de la vente (ce n'est PAS un palier automatique selon la quantité). |
| 2 | **Autorisation « bande jaune » réservée à l'ADMIN.** Le vendeur reste toujours en bande verte. |
| 3 | **Motif écrit obligatoire** dès qu'on vend **sous le prix de détail**. |
| 4 | **Mécanisme d'autorisation = Option A** : un simple flag `peutVendreSousDemiGros` sur le compte, basculé par le super admin depuis la page Employés. |

---

## 2. Le modèle des 3 bandes

Échelle des prix d'un article (du plus bas au plus haut) :

```
prix GROS  <  prix DEMI-GROS  <  prix DÉTAIL  <  (détail ouvert, vers le haut)
  1000           1200              1500
```

| Bande | Intervalle | Qui peut y vendre |
|-------|-----------|-------------------|
| 🟢 **VERTE** (normale) | `[demi-gros, +∞[` | Vendeur, Admin, Super Admin |
| 🟡 **JAUNE** (réduite) | `]gros, demi-gros[` | **Admin autorisé** + Super Admin |
| 🔴 **ROUGE** (coûtant / perte) | `]−∞, gros]` | **Super Admin uniquement** |

- **Aucun plafond** pour personne : tout le monde peut monter au-dessus du détail (« détail ouvert »).
- Le **prix de gros est la frontière exclusive du super admin** : l'admin autorisé peut s'en approcher (1100) mais **jamais l'atteindre**.
- **Vraie perte** = vente **sous le CMUP** (`cmupActuel`), pas seulement sous le gros. On exploite le CMUP déjà présent pour lever une alerte rouge spécifique.

---

## 3. Modèle de données (Prisma)

### 3.1 `Produit` — ajouter le demi-gros
```prisma
prixDemiGros  Float?  @map("prix_demi_gros")
```
(à côté de `prixDetail`, `prixGros`, `prixPromo` existants)

### 3.2 `AdminUser` — flag d'autorisation
```prisma
peutVendreSousDemiGros  Boolean  @default(false)  @map("peut_vendre_sous_demi_gros")
```

### 3.3 Lignes de vente — colonnes d'audit (sur `LigneBon`, `LigneVente`, `LigneTicket`)
```prisma
prixReference  Decimal?  @map("prix_reference")  @db.Decimal(10, 2)  // prix détail au moment de la vente
bandePrix      String?   @map("bande_prix")      @db.VarChar(20)     // PLEIN | VERTE | JAUNE | ROUGE | PERTE
motifRemise    String?   @map("motif_remise")    @db.VarChar(255)
```

### 3.4 Migration SQL idempotente
Fichier : `Back-end/prisma/migrations/20260603_prix_variable_bornes/migration.sql`
```sql
-- Prix demi-gros + autorisation
ALTER TABLE "produit"     ADD COLUMN IF NOT EXISTS "prix_demi_gros" DOUBLE PRECISION;
ALTER TABLE "admin_user"  ADD COLUMN IF NOT EXISTS "peut_vendre_sous_demi_gros" BOOLEAN NOT NULL DEFAULT false;

-- Audit des remises sur chaque type de ligne
ALTER TABLE "ligne_bon"    ADD COLUMN IF NOT EXISTS "prix_reference" DECIMAL(10,2);
ALTER TABLE "ligne_bon"    ADD COLUMN IF NOT EXISTS "bande_prix"     VARCHAR(20);
ALTER TABLE "ligne_bon"    ADD COLUMN IF NOT EXISTS "motif_remise"   VARCHAR(255);

ALTER TABLE "ligne_vente"  ADD COLUMN IF NOT EXISTS "prix_reference" DECIMAL(10,2);
ALTER TABLE "ligne_vente"  ADD COLUMN IF NOT EXISTS "bande_prix"     VARCHAR(20);
ALTER TABLE "ligne_vente"  ADD COLUMN IF NOT EXISTS "motif_remise"   VARCHAR(255);

ALTER TABLE "ligne_ticket" ADD COLUMN IF NOT EXISTS "prix_reference" DECIMAL(10,2);
ALTER TABLE "ligne_ticket" ADD COLUMN IF NOT EXISTS "bande_prix"     VARCHAR(20);
ALTER TABLE "ligne_ticket" ADD COLUMN IF NOT EXISTS "motif_remise"   VARCHAR(255);
```
Appliquer avec `npx prisma migrate deploy` puis `npx prisma generate`.

---

## 4. Backend — logique centrale

### 4.1 Helper de bornes (source de vérité unique)
Créer `Back-end/src/pricing/pricing.util.ts` :

```ts
export type Bande = 'PLEIN' | 'VERTE' | 'JAUNE' | 'ROUGE' | 'PERTE';

export interface Bornes { min: number; max: number | null; } // max null = ouvert

export function bornesPrix(
  produit: { prixGros: number | null; prixDemiGros: number | null; prixDetail: number | null },
  role: 'SUPER_ADMIN' | 'ADMIN' | 'CAISSIER' | 'VENDEUR',
  peutVendreSousDemiGros: boolean,
): Bornes {
  const gros = produit.prixGros ?? 0;
  const demiGros = produit.prixDemiGros ?? gros; // fallback si non renseigné

  if (role === 'SUPER_ADMIN') return { min: 0, max: null };          // peut vendre à perte
  if (role === 'ADMIN' && peutVendreSousDemiGros)
    return { min: gros + 1, max: null };                              // jaune autorisée, jamais le gros
  return { min: demiGros, max: null };                                // verte (admin non autorisé, vendeur)
}

export function classerBande(
  prix: number,
  produit: { prixGros: number | null; prixDemiGros: number | null; prixDetail: number | null; cmupActuel: number | null },
): Bande {
  const gros = produit.prixGros ?? 0;
  const demiGros = produit.prixDemiGros ?? gros;
  const detail = produit.prixDetail ?? demiGros;
  const cmup = Number(produit.cmupActuel ?? 0);

  if (cmup > 0 && prix < cmup) return 'PERTE';
  if (prix <= gros)            return 'ROUGE';
  if (prix < demiGros)         return 'JAUNE';
  if (prix < detail)           return 'VERTE';
  return 'PLEIN';
}
```

### 4.2 Validation à la création de bon / vente / ticket
Dans `bon-vente.service.ts` (et tout autre point qui crée une ligne avec `prixUnitaire`) :

Pour **chaque ligne** :
1. Charger le produit (avec `prixGros`, `prixDemiGros`, `prixDetail`, `cmupActuel`).
2. Calculer `bornes = bornesPrix(produit, vendeur.role, vendeur.peutVendreSousDemiGros)`.
3. **Rejeter** si `prixUnitaire < bornes.min` → `ForbiddenException('Prix inférieur à votre minimum autorisé (X FCFA) pour ce produit.')`.
4. `bande = classerBande(prixUnitaire, produit)`.
5. Si `prixUnitaire < produit.prixDetail` et **motif vide** → `BadRequestException('Un motif est requis pour vendre sous le prix de détail.')`.
6. Persister `prixReference = produit.prixDetail`, `bandePrix = bande`, `motifRemise = motif`.
7. Si `bande === 'PERTE'` → créer une **notification** au(x) SUPER_ADMIN (réutiliser le service de notifications existant) : « Vente à perte : {produit} vendu {prix} (CMUP {cmup}) par {vendeur} ».

> ⚠️ La validation **doit** être côté serveur. Le client ne fait que pré-remplir / pré-valider pour l'UX.

---

## 5. API

| Méthode | Route | Changement |
|---------|-------|-----------|
| `POST` | `/bons` (create) | accepte `prixUnitaire` + `motifRemise` par ligne ; valide les bornes |
| `POST` | `/tickets` | idem si le ticket porte un prix |
| `PATCH` | `/admins/:id` | accepte `peutVendreSousDemiGros` (super admin only) |
| `GET` | `/produits/:id/bornes` *(optionnel)* | renvoie `{ min, max }` pour le rôle courant — pratique pour le POS |

DTO `create-bon.dto.ts` — par ligne : ajouter `prixUnitaire: number` (déjà présent) et `motifRemise?: string`.
DTO `update-admin.dto.ts` — ajouter `peutVendreSousDemiGros?: boolean`.

---

## 6. Frontend (admin)

### 6.1 Fiche produit (`Produits.tsx` / formulaire)
Ajouter le champ **Prix demi-gros** entre Prix de gros et Prix de détail.

### 6.2 Page Employés (`Employes.tsx`)
Pour un compte **ADMIN**, afficher un interrupteur **« Autoriser la vente sous le demi-gros (bande jaune) »** → `PATCH /admins/:id { peutVendreSousDemiGros }`. Visible/éditable **par le super admin uniquement**.

### 6.3 POS (`POSVendeur.tsx`)
- Le prix de chaque ligne du panier devient **un champ éditable** (input nombre), pré-rempli au prix de détail.
- Afficher la **borne min** sous le champ : « min {bornes.min} FCFA ». Bloquer la saisie sous le min (et message).
- **Code couleur** du champ selon `classerBande(prix)` : vert plein / vert / orange / rouge.
- Si une ligne passe sous le détail → afficher un champ **« Motif »** obligatoire avant l'envoi.
- Calculer les bornes côté client à partir des prix du produit + rôle courant (`admin.role`, `admin.peutVendreSousDemiGros`) — mais **le serveur reste l'autorité**.

### 6.4 `services/api.ts`
- `adminAccountApi` : étendre l'update pour `peutVendreSousDemiGros`.
- (optionnel) `produitApi.getBornes(id)`.

---

## 7. Permissions (`utils/permissions.ts`)
- `peutModifierPrixVente(role)` → tous les rôles qui vendent.
- `peutAutoriserPrixReduit(role)` → `SUPER_ADMIN` seulement (pour l'interrupteur Employés).
- La logique fine des bornes vit dans `bornesPrix`, pas dans `permissions.ts`.

---

## 8. Traçabilité & notifications
- Chaque ligne vendue sous le détail conserve **qui** (via le bon/vente), **prix réel**, **prix de référence**, **bande**, **motif**.
- Vente en **bande PERTE** → notification automatique au super admin (service notifs existant).
- *(Bonus plus tard)* écran « Remises & ventes à perte » filtrable par vendeur / période, à partir de `bandePrix`.

---

## 9. Cas limites à gérer
1. **Prix manquants** (`prixDemiGros` null) → fallback sur `prixGros` (déjà dans le helper).
2. **Promo active** : décider si `prixPromo` devient le nouveau plafond de référence ou reste indépendant. → défaut : la promo ne change pas les bornes, elle pré-remplit juste le champ.
3. **Multi-devises (CMUP)** : toutes les bornes sont en **FCFA** ; cohérent avec `cmupActuel` (FCFA).
4. **Quantité** : aucune incidence automatique sur le prix (décision Q1).
5. **Arrondi FCFA** : pas de décimales à l'affichage (format `1 200 FCFA`).

---

## 10. Checklist d'exécution (ordre conseillé)
1. [ ] Schéma Prisma : `prixDemiGros`, `peutVendreSousDemiGros`, 3× colonnes d'audit.
2. [ ] Migration SQL idempotente + `migrate deploy` + `generate`.
3. [ ] `pricing.util.ts` (`bornesPrix` + `classerBande`) + tests unitaires.
4. [ ] Validation serveur dans `bon-vente.service.ts` (+ ticket/vente).
5. [ ] Notification « vente à perte » au super admin.
6. [ ] DTOs (`create-bon`, `update-admin`).
7. [ ] Frontend : champ demi-gros (fiche produit).
8. [ ] Frontend : interrupteur autorisation (Employés).
9. [ ] Frontend : POS — prix éditable borné + couleurs + motif.
10. [ ] `permissions.ts` + `api.ts`.
11. [ ] Test bout-en-bout des 3 bandes pour chaque rôle.
