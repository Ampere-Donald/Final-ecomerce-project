# 📋 CHANGELOG — Branche `feature/catalog-b2b-optimizations`

> **Date** : 19 mars 2026  
> **Auteur** : Donald  
> **Branche** : `feature/catalog-b2b-optimizations`  
> **Objectif** : Ce document décrit **toutes les fonctionnalités et modifications techniques** implémentées dans cette branche pour faciliter la fusion (merge) avec la branche principale.

---

## 🏗️ Architecture Technique du Projet

Le projet est un **e-commerce B2B** pour composants électroniques, structuré en 3 modules :

| Module | Technologie | Port | Répertoire |
|--------|------------|------|------------|
| **Backend API** | NestJS + Prisma + PostgreSQL | `:3000` | `Back-end/` |
| **Dashboard Admin** | React + Vite + TailwindCSS | `:5174` | `Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard/` |
| **Vitrine Client** | React + Vite + SCSS | `:5173` | `Font-end/` |

---

## 📦 Fonctionnalités Implémentées

### 1. Simplification du Modèle Produit (suppression des Variantes)

**Contexte** : L'ancien modèle utilisait un système de `VarianteProduit` pour les prix et stocks. Cela a été remplacé par des champs directs sur le modèle `Produit`.

#### Base de données (`Back-end/prisma/schema.prisma`)
- **Suppression** du modèle `VarianteProduit`
- **Ajout** de champs directs sur le modèle `Produit` :
  - `prixGros` (Float) — Prix de gros
  - `prixDetail` (Float) — Prix de détail
  - `quantiteStock` (Int, default 0) — Stock disponible

#### Backend (`Back-end/src/produit/`)
- `CreateProduitDto` et `UpdateProduitDto` mis à jour avec les nouveaux champs
- `produit.service.ts` : logique CRUD adaptée aux champs directs
- `produit.controller.ts` : parsing FormData pour `prixGros`, `prixDetail`, `quantiteStock`

#### Admin (`Produits.tsx`)
- Formulaire enrichi avec les champs "Prix Détail", "Prix Gros", "Quantité en stock"
- Tableau avec colonnes "PRIX DÉTAIL", "PRIX GROS", "STOCK"

---

### 2. Ventes Flash (Promotions)

**Objectif** : Permettre à l'admin de mettre des produits en promotion avec un prix réduit et une date d'expiration, affichés sur la page d'accueil.

#### Base de données (`schema.prisma`)
```prisma
prixPromo      Float?           @map("prix_promo")
finPromo       DateTime?        @map("fin_promo")
```

#### Backend API
- **DTO** (`create-produit.dto.ts`) : champs `prixPromo` (number, optionnel), `finPromo` (string, optionnel)
- **Service** (`produit.service.ts`) :
  - `findFlash()` : `WHERE prixPromo IS NOT NULL AND finPromo > NOW()` — retourne uniquement les promos actives
  - Conversion `finPromo` string → `Date` dans `create()` et `update()`
- **Contrôleur** (`produit.controller.ts`) :
  - `GET /api/produits/flash` — Route placée **AVANT** `/:id` pour éviter les conflits UUID
  - Parsing intelligent des champs promo depuis FormData : les chaînes vides `""` sont converties en `null`/`undefined` pour éviter les erreurs `NaN`
- **Sécurité importante** : Le parsing FormData gère les cas suivants :
  - `prixPromo = ""` → `undefined` (création) ou `null` (mise à jour = supprimer la promo)
  - `finPromo = ""` → `undefined` ou `null`
  - `isPopulaire = "true"` / `"false"` → conversion en boolean

#### Admin Dashboard (`Produits.tsx`)
- Section **"Promotion & Mise en avant"** dans le formulaire :
  - Champ **"Prix Promotionnel"** (input number, fond amber)
  - Champ **"Date de fin de promo"** (input `datetime-local`, fond amber, **min = date actuelle** pour empêcher les dates passées)
- Badge **"PROMO"** (couleur amber) dans la colonne `Statut` du tableau
- Les champs sont **toujours envoyés** via FormData (même vides) pour permettre de retirer une promo

#### Vitrine Client (`FeaturedProducts.jsx`)
- Appel API vers `/api/produits/flash`
- Affichage des produits flash avec :
  - `prixDetail` **barré** (opacité 0.5)
  - `prixPromo` en **rouge vif**
  - Badge de réduction dynamique (ex: `-33%`)
  - **Countdown timer** calculé depuis `finPromo` (heures : minutes : secondes)
- La section se **masque automatiquement** si aucun produit flash n'est disponible

---

### 3. Produits Populaires (Composants les Plus Demandés)

**Objectif** : Marquer des produits comme "populaires" pour les mettre en avant sur la page d'accueil.

#### Base de données (`schema.prisma`)
```prisma
isPopulaire    Boolean          @default(false) @map("is_populaire")
```

#### Backend API
- **DTO** : champ `isPopulaire` (boolean) avec `@Transform` pour conversion `string → boolean`
- **Service** : `findPopulaires()` → `WHERE isPopulaire = true` (max 20 résultats)
- **Contrôleur** : `GET /api/produits/populaires`

#### Admin Dashboard
- Toggle **"Mettre en avant (Populaire)"** avec icône étoile dans le formulaire
- Badge **"POPULAIRE"** (couleur bleue) dans le tableau

#### Vitrine Client
- Appel API vers `/api/produits/populaires`
- Section "Composants les Plus Demandés" sur la page d'accueil

---

### 4. Slider/Carousel Auto-Play pour les Sections Homepage

**Objectif** : Quand il y a plus de produits que l'espace visible peut afficher, un slider automatique les fait défiler.

#### Implémentation (`FeaturedProducts.jsx`)
- **Hook `useSlider(itemCount, visibleCount, autoPlayInterval)`** :
  - `visibleCount` : nombre de produits visibles à la fois (2 pour Flash, 4 pour Populaires)
  - `autoPlayInterval` : 4 secondes par défaut
  - **Auto-Play** : défilement automatique avec `setInterval`
  - **Boucle infinie** : arrivé à la fin, revient au début
  - **Pause au survol** : `onMouseEnter` met en pause, `onMouseLeave` reprend
- **Flèches de navigation** (`ChevronLeft`, `ChevronRight`) avec compteur (ex: `1–2 / 8`)
- **CSS Transform** : transition `transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)` pour un glissement fluide

#### Styles (`FeaturedProducts.scss`)
- `.slider-nav` : boutons ronds semi-transparents
- `.slider-card-wrapper--flash` : `width: calc(100% / 2)` (2 cartes visibles)
- `.slider-card-wrapper--pop` : `width: calc(100% / 4)` avec breakpoints responsifs (3 sur tablette, 2 sur mobile, 1 sur petit écran)

---

### 5. Import CSV en Masse

**Objectif** : Permettre l'importation rapide de produits via un fichier `.csv` depuis le Dashboard Admin.

#### Dépendances installées
- **Backend** : `csv-parser` (parsing CSV performant)
- **Admin Frontend** : `papaparse` + `@types/papaparse` (parsing côté client)

#### Backend (`produit.service.ts` + `produit.controller.ts`)

**Route** : `POST /api/produits/import`

**Flux complet du service `importCsv(buffer)` :**
1. **Parsing CSV** : lecture du buffer via `csv-parser` en stream (séparateur `;`)
2. **Category Mapping** :
   - Chargement de toutes les catégories existantes (`prisma.categorie.findMany()`)
   - Comparaison insensible à la casse (`toLowerCase().trim()`) du nom dans le CSV
   - Si la catégorie n'existe pas → **création automatique** dans Prisma
   - Si ni le CSV ni la base n'a de catégorie → assignation à "Divers" (créé si nécessaire)
3. **Mapping flexible des colonnes CSV** — accepte plusieurs formats :
   - `nomProduit`, `nom_produit`, `NomProduit`, `Nom`
   - `Categorie`, `categorie`, `Catégorie`, `categorieNom`
   - etc. (voir code source pour la liste complète)
4. **Image URL** : concaténation `/uploads/` + valeur du champ `nomImage`
5. **Insertion** : `prisma.produit.createMany({ skipDuplicates: true })`
6. **Réponse JSON** :
```json
{
  "message": "Import terminé avec succès",
  "totalLignesCsv": 5,
  "produitsImportes": 5,
  "produitsIgnores": 0,
  "nouvellesCategories": ["Semi-conducteurs", "Capteurs"]
}
```

**Contrôleur** : utilise `FileInterceptor('file')` avec `memoryStorage()` (pas de stockage disque pour le CSV, seulement le buffer mémoire).

#### Admin Frontend (`Produits.tsx`)
- **Bouton vert "Import CSV"** avec icône `FileSpreadsheet` (lucide-react)
- **Modale de prévisualisation** (inspirée du design existant) :
  - Parsing côté client avec **PapaParse** (`header: true, preview: 5, skipEmptyLines: true`)
  - Tableau montrant les 5 premières lignes avec colonnes détectées
  - Affichage du nom du fichier et du nombre de colonnes
- **Bouton "Confirmer l'import"** :
  - Envoie le fichier brut en `FormData` via `produitApi.importCsv(file)`
  - Affiche le résultat (succès vert avec `CheckCircle2` ou erreur rouge avec `XCircle`)
  - Rafraîchit automatiquement la liste des produits et catégories après import

#### API Service (`api.ts`)
```typescript
importCsv: (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/produits/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(res => res.data);
},
```

#### Format CSV attendu (séparateur `;`)
```csv
nomProduit;marque;Categorie;prixDetail;prixGros;quantiteStock;nomImage;description
Résistance 10K;Generic;Composants Passifs;500;300;100;resistor.png;Description ici
```

---

### 6. Sécurité Visuelle — Image Fallback

**Objectif** : Si l'image d'un produit est introuvable (404), afficher un placeholder au lieu d'une icône cassée.

#### Implémentation
- **`ProductCard.jsx`** : `onError={(e) => setImgSrc(PLACEHOLDER_IMG)}`
- **`FeaturedProducts.jsx`** (Flash + Populaires) : `onError={(e) => { e.target.src = PLACEHOLDER_IMG; }}`
- **Placeholder** : image Unsplash haute qualité (composants électroniques)

---

## 📁 Liste Complète des Fichiers Modifiés

### Backend (`Back-end/`)

| Fichier | Type | Description |
|---------|------|-------------|
| `prisma/schema.prisma` | MODIFIÉ | Ajout `prixPromo`, `finPromo`, `isPopulaire` au modèle `Produit` |
| `src/produit/dto/create-produit.dto.ts` | MODIFIÉ | Nouveaux champs + `@Transform` pour `isPopulaire` |
| `src/produit/dto/update-produit.dto.ts` | INCHANGÉ | Hérite via `PartialType(CreateProduitDto)` |
| `src/produit/produit.service.ts` | MODIFIÉ | `findFlash()`, `findPopulaires()`, `importCsv(buffer)` |
| `src/produit/produit.controller.ts` | MODIFIÉ | Routes `/flash`, `/populaires`, `/import` + parsing FormData |
| `package.json` | MODIFIÉ | Ajout de `csv-parser` |

### Dashboard Admin (`Font-end-admin/...`)

| Fichier | Type | Description |
|---------|------|-------------|
| `src/components/Produits.tsx` | MODIFIÉ | Champs promo/populaire + Import CSV modal + PapaParse |
| `src/services/api.ts` | MODIFIÉ | Ajout `produitApi.importCsv()` |
| `package.json` | MODIFIÉ | Ajout de `papaparse`, `@types/papaparse` |

### Vitrine Client (`Font-end/`)

| Fichier | Type | Description |
|---------|------|-------------|
| `src/components/FeaturedProducts/FeaturedProducts.jsx` | MODIFIÉ | API Flash/Populaires, Slider auto-play, hook `useSlider` |
| `src/components/FeaturedProducts/FeaturedProducts.scss` | MODIFIÉ | Styles slider, navigation, responsive cards |

---

## 🔧 Commandes de Migration Base de Données

```bash
cd Back-end
npx prisma db push      # Applique le schéma à la base PostgreSQL
npx prisma generate      # Régénère le client Prisma
```

---

## ⚠️ Points d'Attention pour la Fusion (Merge)

1. **`schema.prisma`** : 3 nouveaux champs sur le modèle `Produit`. Si la branche cible a aussi modifié ce modèle, résoudre le conflit en gardant les deux ensembles de champs, puis relancer `prisma db push`.

2. **`produit.controller.ts`** : les routes `/flash`, `/populaires` et `/import` **doivent être placées AVANT** la route `/:id` pour éviter que NestJS interprète "flash" comme un UUID.

3. **`Produits.tsx`** : fichier le plus gros (~800 lignes). S'il y a des conflits, veillez à garder :
   - Les imports `PapaParse`, `FileSpreadsheet`, `CheckCircle2`, `XCircle`
   - Les state variables `isCsvModalOpen`, `csvPreview`, etc.
   - Le JSX de la modale CSV (bloc `{isCsvModalOpen && (...)}`)

4. **Dépendances npm** : après le merge, relancer `npm install` dans les 3 répertoires :
   ```bash
   cd Back-end && npm install
   cd Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard && npm install
   cd Font-end && npm install
   ```

5. **Variables d'environnement** : aucune nouvelle variable ajoutée. La DB PostgreSQL doit être accessible (voir `.env` dans `Back-end/`).

---

## 🧪 Comment Tester après le Merge

1. Démarrer la DB PostgreSQL (Docker ou local)
2. `cd Back-end && npx prisma db push && npx prisma generate && npm run start:dev`
3. `cd Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard && npm run dev`
4. `cd Font-end && npm run dev`
5. Aller sur `http://localhost:5174/produits` → Tester le bouton "Import CSV"
6. Aller sur `http://localhost:5173` → Vérifier les sections Ventes Flash et Populaires
