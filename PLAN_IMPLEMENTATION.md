# PLAN D'IMPLÉMENTATION — NEWOTEG
## Facturation & Primes vendeurs · Impression tickets & Passation volante

> Document autonome destiné à Codex. Aucune intervention humaine requise pendant l'exécution.
> Auteur du brainstorming : développeur + Claude Sonnet 4.6
> Date : 2026-05-30

---

## 1. CONTEXTE & PÉRIMÈTRE

### Projet

Application e-commerce NEWOTEG — boutique physique de pièces électroniques à Douala, Cameroun.
- **Backend** : NestJS + Prisma + PostgreSQL (`Back-end/`)
- **Frontend admin** : React + Vite (`Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard/`)
- Devise : FCFA — TVA fixe 19,25 %

### Ce qu'on touche

- `Back-end/prisma/schema.prisma` — ajout de modèles et modification de modèles existants
- `Back-end/src/` — nouveaux modules NestJS : `bon-vente`, `facture`, `prime`
- `Back-end/src/vente/vente.service.ts` — ajout `vendeurId`
- `Back-end/src/admin-auth/` — ajout endpoint changement de rôle
- `Font-end-admin/.../src/services/api.ts` — nouveaux appels API
- `Font-end-admin/.../src/components/` — nouveaux composants + corrections
- `Font-end-admin/.../src/utils/permissions.ts` — nouvelles permissions
- `Font-end-admin/.../src/App.tsx` — nouvelles routes

### Ce qu'on ne touche PAS

- Frontend client (boutique e-commerce publique)
- Modules existants : `caisse`, `coffre`, `commande`, `achat`, `produit`, `client`, `fournisseur`, `categorie`, `attribut`, `echeance`
- Aucune suppression de fichier ou de champ existant
- Aucune nouvelle dépendance npm
- La migration Prisma n'est PAS exécutée par Codex — elle sera appliquée manuellement par le responsable projet

---

## 2. MODÈLES PRISMA

### 2.1 Modifier l'enum `AdminRole`

**Fichier :** `Back-end/prisma/schema.prisma`

```prisma
enum AdminRole {
  SUPER_ADMIN
  ADMIN
  CAISSIER    // ← nouveau
  VENDEUR     // ← nouveau
}
```

### 2.2 Modifier le modèle `Vente`

Ajouter uniquement ces deux lignes dans le modèle existant :

```prisma
model Vente {
  // ... tous les champs existants conservés sans modification ...
  vendeurId   String?    @map("vendeur_id")
  vendeur     AdminUser? @relation("VentesVendeur", fields: [vendeurId], references: [id])
}
```

### 2.3 Modifier le modèle `Caisse`

Ajouter uniquement cette ligne dans le modèle existant :

```prisma
model Caisse {
  // ... tous les champs existants conservés sans modification ...
  effectueeParUser AdminUser? @relation("CaisseOperateur", fields: [effectueePar], references: [id])
}
```

### 2.4 Modifier le modèle `AdminUser`

Ajouter uniquement ces relations inverses dans le modèle existant :

```prisma
model AdminUser {
  // ... tous les champs existants conservés sans modification ...
  ventesEffectuees  Vente[]        @relation("VentesVendeur")
  operationsCaisse  Caisse[]       @relation("CaisseOperateur")
  bonsCreees        BonVente[]     @relation("BonsVendeur")
  bonsValides       BonVente[]     @relation("BonsValides")
  facturesVendeur   Facture[]      @relation("FacturesVendeur")
  primesVendeur     PrimeVendeur[] @relation("PrimesVendeur")
  primesValidees    PrimeVendeur[] @relation("PrimesValidees")
}
```

### 2.5 Modifier le modèle `Client`

Ajouter la relation inverse :

```prisma
model Client {
  // ... tous les champs existants conservés sans modification ...
  bons BonVente[]
}
```

### 2.6 Modifier le modèle `Produit`

Ajouter la relation inverse :

```prisma
model Produit {
  // ... tous les champs existants conservés sans modification ...
  lignesBon LigneBon[]
}
```

### 2.7 Nouveau modèle `BonVente`

```prisma
model BonVente {
  id              String      @id @default(uuid())
  numero          String      @unique
  vendeurId       String      @map("vendeur_id")
  clientId        String?     @map("client_id")
  methodePaiement MethodePaiement @map("methode_paiement")
  statut          StatutBon   @default(EN_ATTENTE)
  createdAt       DateTime    @default(now()) @map("created_at")
  valideeAt       DateTime?   @map("validee_at")
  valideeById     String?     @map("validee_by")
  venteId         String?     @unique @map("vente_id")
  vendeur         AdminUser   @relation("BonsVendeur", fields: [vendeurId], references: [id])
  valideeBy       AdminUser?  @relation("BonsValides", fields: [valideeById], references: [id])
  client          Client?     @relation(fields: [clientId], references: [id])
  lignes          LigneBon[]
  facture         Facture?
  vente           Vente?      @relation(fields: [venteId], references: [id])

  @@map("bon_vente")
}

model LigneBon {
  id           String   @id @default(uuid())
  bonId        String   @map("bon_id")
  produitId    String   @map("produit_id")
  nomProduit   String   @map("nom_produit") @db.VarChar(150)
  quantite     Int
  prixUnitaire Decimal  @map("prix_unitaire") @db.Decimal(10, 2)
  sousTotal    Decimal  @map("sous_total") @db.Decimal(12, 2)
  bon          BonVente @relation(fields: [bonId], references: [id], onDelete: Cascade)
  produit      Produit  @relation(fields: [produitId], references: [id])

  @@map("ligne_bon")
}

enum StatutBon {
  EN_ATTENTE
  VALIDE
  ANNULE
}
```

### 2.8 Nouveau modèle `Facture`

```prisma
model Facture {
  id              String          @id @default(uuid())
  numero          String          @unique
  type            TypeFacture
  bonId           String?         @unique @map("bon_id")
  venteId         String?         @unique @map("vente_id")
  clientId        String?         @map("client_id")
  vendeurId       String          @map("vendeur_id")
  caissierId      String?         @map("caissier_id")
  dateEmission    DateTime        @default(now()) @map("date_emission")
  totalHT         Decimal         @db.Decimal(12, 2) @map("total_ht")
  tva             Decimal         @db.Decimal(12, 2)
  totalTTC        Decimal         @db.Decimal(12, 2) @map("total_ttc")
  methodePaiement MethodePaiement @map("methode_paiement")
  printCount      Int             @default(0) @map("print_count")
  bon             BonVente?       @relation(fields: [bonId], references: [id])
  vente           Vente?          @relation(fields: [venteId], references: [id])
  client          Client?         @relation(fields: [clientId], references: [id])
  vendeur         AdminUser       @relation("FacturesVendeur", fields: [vendeurId], references: [id])
  lignes          FactureLigne[]

  @@map("facture")
}

model FactureLigne {
  id              String  @id @default(uuid())
  factureId       String  @map("facture_id")
  nomProduit      String  @map("nom_produit") @db.VarChar(150)
  quantite        Int
  prixUnitaireHT  Decimal @map("prix_unitaire_ht") @db.Decimal(10, 2)
  prixUnitaireTTC Decimal @map("prix_unitaire_ttc") @db.Decimal(10, 2)
  sousTotalHT     Decimal @map("sous_total_ht") @db.Decimal(12, 2)
  sousTotalTTC    Decimal @map("sous_total_ttc") @db.Decimal(12, 2)
  facture         Facture @relation(fields: [factureId], references: [id], onDelete: Cascade)

  @@map("facture_ligne")
}

enum TypeFacture {
  FACTURE
  TICKET_CAISSE
}
```

### 2.9 Nouveau modèle `PrimeVendeur`

```prisma
model PrimeVendeur {
  id            String      @id @default(uuid())
  vendeurId     String      @map("vendeur_id")
  periode       String      // format "2026-05"
  nombreTickets Int         @default(0) @map("nombre_tickets")
  statut        StatutPrime @default(EN_COURS)
  valideeById   String?     @map("validee_by")
  valideeAt     DateTime?   @map("validee_at")
  vendeur       AdminUser   @relation("PrimesVendeur", fields: [vendeurId], references: [id])
  valideeBy     AdminUser?  @relation("PrimesValidees", fields: [valideeById], references: [id])

  @@unique([vendeurId, periode])
  @@map("prime_vendeur")
}

enum StatutPrime {
  EN_COURS
  VALIDEE
  PAYEE
}
```

> ⚠️ **RAPPEL** : Ne pas exécuter `prisma migrate dev`. Décrire uniquement. La migration sera appliquée manuellement.

---

## 3. ENDPOINTS

### 3.1 Module `BonVente`

#### POST `/api/bons`
- **Rôle requis** : `VENDEUR`
- **Description** : Créer un bon de vente et notifier la caissière
- **Guards** : `AdminAuthGuard`, `RolesGuard`, `@Roles('VENDEUR')`
- **Règle** : Vérifier qu'aucun bon `EN_ATTENTE` n'existe pour ce vendeur. Si oui → `400 BadRequest`
- **Payload** :
```json
{
  "clientId": "uuid (optionnel)",
  "methodePaiement": "ESPECES | CARTE | MOBILE_MONEY | VIREMENT",
  "lignes": [
    {
      "produitId": "uuid",
      "quantite": 2,
      "prixUnitaire": 3000
    }
  ]
}
```
- **Réponse 201** :
```json
{
  "id": "uuid",
  "numero": "BON-2026-0001",
  "statut": "EN_ATTENTE",
  "vendeur": { "id": "uuid", "nom": "Jean MBARGA" },
  "client": { "id": "uuid", "nom": "Client" },
  "lignes": [...],
  "createdAt": "2026-05-30T14:32:00Z"
}
```
- **Effet** : Émet un événement SSE vers les sessions CAISSIER connectées

#### GET `/api/bons/pending`
- **Rôle requis** : `CAISSIER`, `SUPER_ADMIN`, `ADMIN`
- **Description** : Liste des bons `EN_ATTENTE`
- **Réponse 200** : Tableau de bons avec `vendeur`, `client`, `lignes`

#### GET `/api/bons/mes-bons`
- **Rôle requis** : `VENDEUR`
- **Description** : Bons du vendeur connecté (tous statuts)
- **Réponse 200** : Tableau de bons du vendeur authentifié

#### POST `/api/bons/:id/valider`
- **Rôle requis** : `CAISSIER`, `SUPER_ADMIN`
- **Description** : Valider un bon → déclenche la transaction complète
- **Payload** : aucun
- **Réponse 200** :
```json
{
  "bon": { "id": "uuid", "statut": "VALIDE" },
  "vente": { "id": "uuid" },
  "facture": {
    "id": "uuid",
    "numero": "TIC-2026-0042",
    "type": "TICKET_CAISSE",
    "totalHT": 3769.73,
    "tva": 730.27,
    "totalTTC": 4500,
    "vendeur": { "nom": "Jean MBARGA" },
    "lignes": [...]
  }
}
```
- **Effet atomique dans `$transaction`** :
  1. Vérifier stock de chaque produit
  2. Créer `Vente` avec `vendeurId`
  3. Créer `LigneVente[]`
  4. Décrémenter `Produit.quantiteStock`
  5. Créer `MouvementStock` (SORTIE)
  6. Créer `Caisse` (ENTREE)
  7. Générer numéro facture atomique
  8. Créer `Facture` + `FactureLigne[]`
  9. Mettre à jour `BonVente` → statut VALIDE
  10. `PrimeVendeur.upsert` → `nombreTickets + 1`

#### POST `/api/bons/:id/annuler`
- **Rôle requis** : `VENDEUR` (son propre bon uniquement)
- **Description** : Annuler un bon `EN_ATTENTE`
- **Règle** : Vérifier que `bon.vendeurId === req.user.id`. Sinon → `403 Forbidden`
- **Règle** : Impossible si `statut !== EN_ATTENTE` → `400 BadRequest`
- **Réponse 200** : Bon mis à jour avec `statut: ANNULE`

#### GET `/api/bons/stream`
- **Rôle requis** : `CAISSIER`, `SUPER_ADMIN`, `ADMIN`
- **Description** : Stream SSE — pousse un événement à chaque nouveau bon créé
- **Headers réponse** :
  - `Content-Type: text/event-stream`
  - `Cache-Control: no-cache`
  - `Connection: keep-alive`
- **Format événement** : `data: { ...bon }\n\n`

### 3.2 Module `Facture`

#### GET `/api/factures`
- **Rôle requis** : `SUPER_ADMIN`, `ADMIN`
- **Query params** : `type` (FACTURE | TICKET_CAISSE), `vendeurId`, `periode` (YYYY-MM)
- **Réponse 200** : Tableau de factures avec `vendeur`, `client`, `lignes`

#### GET `/api/factures/:id`
- **Rôle requis** : `SUPER_ADMIN`, `ADMIN`, `CAISSIER`
- **Réponse 200** : Facture complète avec toutes les relations

#### POST `/api/factures/:id/print`
- **Rôle requis** : `CAISSIER`, `SUPER_ADMIN`, `ADMIN`
- **Description** : Enregistrer une impression — incrémente `printCount`
- **Réponse 200** : `{ "printCount": 2 }`

### 3.3 Module `Prime`

#### GET `/api/primes/classement`
- **Rôle requis** : `SUPER_ADMIN`, `ADMIN`
- **Query params** : `periode` (YYYY-MM, obligatoire)
- **Réponse 200** :
```json
[
  { "rang": 1, "vendeur": { "nom": "Jean MBARGA" }, "nombreTickets": 47, "statut": "EN_COURS" },
  { "rang": 2, "vendeur": { "nom": "Paul EKANE" }, "nombreTickets": 31, "statut": "EN_COURS" }
]
```

#### GET `/api/primes/mon-score`
- **Rôle requis** : `VENDEUR`
- **Description** : Score du vendeur connecté pour le mois en cours
- **Réponse 200** : `{ "periode": "2026-05", "nombreTickets": 12, "statut": "EN_COURS" }`

#### PATCH `/api/primes/:id/valider`
- **Rôle requis** : `SUPER_ADMIN`
- **Description** : Valider la prime d'un vendeur
- **Réponse 200** : PrimeVendeur avec `statut: VALIDEE`

#### PATCH `/api/primes/:id/payer`
- **Rôle requis** : `SUPER_ADMIN`
- **Description** : Marquer une prime comme payée
- **Réponse 200** : PrimeVendeur avec `statut: PAYEE`

### 3.4 Passation volante — Module `AdminAuth`

#### PATCH `/api/admin-auth/:id/role`
- **Rôle requis** : `SUPER_ADMIN`
- **Description** : Changer le rôle d'un employé
- **Payload** :
```json
{ "role": "CAISSIER | VENDEUR | ADMIN | MANAGER" }
```
- **Réponse 200** : `{ "id": "uuid", "nom": "Marie FOTSO", "role": "CAISSIER" }`

---

## 4. FICHIERS À CRÉER / MODIFIER

### 4.1 Fichiers à créer (backend)

```
Back-end/src/bon-vente/
  bon-vente.module.ts
  bon-vente.controller.ts
  bon-vente.service.ts
  bon-vente.events.service.ts
  dto/
    create-bon.dto.ts

Back-end/src/facture/
  facture.module.ts
  facture.controller.ts
  facture.service.ts

Back-end/src/prime/
  prime.module.ts
  prime.controller.ts
  prime.service.ts
```

### 4.2 Fichiers à modifier (backend)

```
Back-end/prisma/schema.prisma
  → Enum AdminRole : ajouter CAISSIER, VENDEUR
  → Modèle Vente : ajouter vendeurId + relation
  → Modèle Caisse : ajouter effectueeParUser
  → Modèle AdminUser : ajouter relations inverses
  → Modèle Client : ajouter relation bons
  → Modèle Produit : ajouter relation lignesBon
  → Nouveaux modèles : BonVente, LigneBon, Facture, FactureLigne, PrimeVendeur
  → Nouveaux enums : StatutBon, TypeFacture, StatutPrime

Back-end/src/vente/vente.service.ts
  → Dans create() : ajouter vendeurId: actor.id lors du tx.vente.create()

Back-end/src/admin-auth/admin-auth.controller.ts
  → Ajouter PATCH /:id/role

Back-end/src/admin-auth/admin-auth.service.ts
  → Ajouter méthode changerRole(id, role)

Back-end/src/app.module.ts
  → Importer et déclarer BonVenteModule, FactureModule, PrimeModule
```

### 4.3 Fichiers à créer (frontend)

```
Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard/src/components/
  BonVente.tsx
  CaisseValidation.tsx
  Primes.tsx
```

### 4.4 Fichiers à modifier (frontend)

```
Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard/src/
  services/api.ts
    → Ajouter : bonVenteApi, caisseValidationApi, factureApi, primeApi, adminRoleApi

  components/ReceiptGenerator.tsx
    → Corriger bug ligne 331 : 'professionnel' → 'PROFESSIONNEL'
    → Remplacer placeholder NUI (valeur réelle à fournir)
    → Remplacer placeholder RCCM (valeur réelle à fournir)
    → Remplacer placeholder Tél (valeur réelle à fournir)
    → Ajouter props : vendeur?: { nom: string }, caissiere?: { nom: string }
    → Afficher nom vendeur + caissière sur TicketCompact et FacturePro

  components/Ventes.tsx
    → Supprimer import generateReceiptNumber
    → Remplacer generateReceiptNumber(rType) par result.facture.numero
    → Passer vendeur et caissiere aux props de ReceiptGenerator

  components/Invoices.tsx
    → Supprimer MOCK_INVOICES
    → Charger depuis factureApi.getAll()
    → Ajouter filtres : période, type, vendeur
    → Ajouter bouton "Imprimer" → factureApi.print(id)

  components/AdminAccounts.tsx
    → Ajouter dropdown rôle sur fiche employé (CAISSIER / VENDEUR / ADMIN)
    → Bouton "Changer le rôle" → adminRoleApi.changerRole(id, role)

  utils/permissions.ts
    → Ajouter :
      creerBon: (role?) => role === 'VENDEUR'
      validerBon: (role?) => ['CAISSIER','SUPER_ADMIN'].includes(role||'')
      voirPrimes: (role?) => ['SUPER_ADMIN','ADMIN'].includes(role||'')
      validerPrime: (role?) => role === 'SUPER_ADMIN'
      voirMarges: (role?) => ['SUPER_ADMIN','ADMIN'].includes(role||'')
      voirSoldeGlobal: (role?) => ['SUPER_ADMIN','ADMIN'].includes(role||'')

  App.tsx
    → Importer BonVente, CaisseValidation, Primes
    → Ajouter routes :
      /bons          → RoleProtectedRoute(['VENDEUR']) → <BonVente />
      /caisse-validation → RoleProtectedRoute(['CAISSIER','SUPER_ADMIN']) → <CaisseValidation />
      /primes        → RoleProtectedRoute(['SUPER_ADMIN','ADMIN']) → <Primes />
```

---

## 5. COMPOSANTS REACT

### 5.1 `BonVente.tsx` — Interface vendeur (mobile)

**Props** : aucune (lit `admin` depuis `useAdminAuth()`)

**État interne** :
```typescript
const [produits, setProduits] = useState<any[]>([]);
const [cart, setCart] = useState<CartItem[]>([]);
const [selectedClientId, setSelectedClientId] = useState('');
const [paymentMethod, setPaymentMethod] = useState('ESPECES');
const [mesBons, setMesBons] = useState<any[]>([]);
const [monScore, setMonScore] = useState<number>(0);
const [submitting, setSubmitting] = useState(false);
const [activeTab, setActiveTab] = useState<'vente' | 'historique'>('vente');
```

**Comportement** :
- Charger `produitApi.getAll()` au montage
- Afficher uniquement `prixDetail` (pas `prixAchat`, pas `prixGros`)
- Bouton "Envoyer à la caissière" → `bonVenteApi.create()` → vider le panier + message de confirmation
- Onglet "Mes bons" → `bonVenteApi.mesBons()` avec statuts colorés
- Widget "Mon score ce mois" → `bonVenteApi.monScore()`
- Bouton "Annuler" visible uniquement sur les bons `EN_ATTENTE`

### 5.2 `CaisseValidation.tsx` — Interface caissière

**Props** : aucune (lit `admin` depuis `useAdminAuth()`)

**État interne** :
```typescript
const [bonsEnAttente, setBonsEnAttente] = useState<any[]>([]);
const [badgeCount, setBadgeCount] = useState(0);
const [showPanel, setShowPanel] = useState(false);
const [validating, setValidating] = useState<string | null>(null);
const [lastFacture, setLastFacture] = useState<any | null>(null);
const [showReceipt, setShowReceipt] = useState(false);
const [compteurJour, setCompteurJour] = useState(0);
```

**Comportement** :
- Au montage : charger `caisseValidationApi.pending()` pour les bons déjà en attente
- Au montage : ouvrir connexion SSE vers `GET /api/bons/stream`
  - À chaque événement SSE reçu : ajouter le bon à `bonsEnAttente` + incrémenter `badgeCount`
  - Fermer la connexion SSE au démontage du composant
- Cloche 🔔 avec badge `badgeCount` — clic → afficher/masquer le panel
- Panel : liste des bons en attente avec vendeur, client, produits, total
- Bouton "Valider" sur chaque bon → `caisseValidationApi.valider(id)` → retirer le bon de la liste + décrémenter badge + incrémenter `compteurJour` + ouvrir `ReceiptGenerator` avec la facture retournée
- Afficher `compteurJour` : "X transactions validées aujourd'hui"
- NE PAS afficher le solde global de la caisse

**Intégration SSE** :
```typescript
useEffect(() => {
  const token = localStorage.getItem('newoteg_admin_token');
  const apiUrl = import.meta.env.VITE_API_URL;
  const es = new EventSource(`${apiUrl}/bons/stream`, {
    // NestJS SSE avec JWT : passer le token en query param
  });
  es.onmessage = (event) => {
    const bon = JSON.parse(event.data);
    setBonsEnAttente(prev => [bon, ...prev]);
    setBadgeCount(prev => prev + 1);
  };
  return () => es.close();
}, []);
```

> **Note Codex** : NestJS `@Sse()` ne supporte pas les headers d'authentification HTTP natifs via `EventSource`. Passer le token JWT en query param `?token=xxx` et valider manuellement dans le guard ou créer un guard SSE dédié.

### 5.3 `Primes.tsx` — Classement vendeurs

**Props** : aucune

**État interne** :
```typescript
const [periode, setPeriode] = useState<string>(() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
});
const [classement, setClassement] = useState<any[]>([]);
const [loading, setLoading] = useState(false);
```

**Comportement** :
- Sélecteur mois/année → recharge `primeApi.classement(periode)`
- Tableau : Rang / Nom vendeur / Tickets validés / Statut (badge coloré)
- Mise en évidence du 1er rang (fond doré ou badge 🥇)
- Actions SUPER_ADMIN uniquement :
  - Bouton "Valider" si `statut === EN_COURS` → `primeApi.valider(id)`
  - Bouton "Marquer payée" si `statut === VALIDEE` → `primeApi.payer(id)`

---

## 6. ORDRE D'EXÉCUTION

> Respecter strictement cet ordre. Chaque étape doit compiler sans erreur avant de passer à la suivante.

### Étape 1 — Schema Prisma

1. Ouvrir `Back-end/prisma/schema.prisma`
2. Ajouter `CAISSIER` et `VENDEUR` dans l'enum `AdminRole`
3. Modifier `Vente` : ajouter `vendeurId` + relation `vendeur`
4. Modifier `Caisse` : ajouter `effectueeParUser`
5. Modifier `AdminUser` : ajouter toutes les relations inverses
6. Modifier `Client` : ajouter `bons BonVente[]`
7. Modifier `Produit` : ajouter `lignesBon LigneBon[]`
8. Ajouter les nouveaux modèles : `BonVente`, `LigneBon`, `Facture`, `FactureLigne`, `PrimeVendeur`
9. Ajouter les nouveaux enums : `StatutBon`, `TypeFacture`, `StatutPrime`
10. Exécuter `npx prisma generate` (uniquement — pas `migrate`)
11. Vérifier qu'aucune erreur TypeScript n'est générée

### Étape 2 — Backend : Module `BonVente`

1. Créer `Back-end/src/bon-vente/bon-vente.events.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

@Injectable()
export class BonVenteEventsService {
  private subject = new Subject<any>();

  emit(bon: any) {
    this.subject.next(bon);
  }

  get stream$(): Observable<any> {
    return this.subject.asObservable();
  }
}
```

2. Créer `Back-end/src/bon-vente/dto/create-bon.dto.ts`

```typescript
import { IsUUID, IsOptional, IsEnum, IsArray, ValidateNested, IsInt, Min, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { MethodePaiement } from '@prisma/client';

export class LigneBonDto {
  @IsUUID()
  produitId: string;

  @IsInt()
  @Min(1)
  quantite: number;

  @IsNumber()
  @Type(() => Number)
  prixUnitaire: number;
}

export class CreateBonDto {
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsEnum(MethodePaiement)
  methodePaiement: MethodePaiement;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LigneBonDto)
  lignes: LigneBonDto[];
}
```

3. Créer `Back-end/src/bon-vente/bon-vente.service.ts` avec les méthodes :
   - `create(dto, actor)` : vérifier bon en attente existant → générer numéro → créer BonVente + LigneBon → émettre événement SSE
   - `findPending()` : retourner tous les bons `EN_ATTENTE` avec `vendeur`, `client`, `lignes.produit`
   - `findMesBons(vendeurId)` : bons du vendeur trié par `createdAt desc`
   - `valider(id, actor)` : transaction complète (voir section 3.1)
   - `annuler(id, actor)` : vérifier propriétaire + statut → passer à ANNULE
   - `genererNumeroBon()` : private — `BON-YYYY-XXXX` atomique

4. Créer `Back-end/src/bon-vente/bon-vente.controller.ts`

```typescript
@UseGuards(AdminAuthGuard, RolesGuard)
@Controller('bons')
export class BonVenteController {
  @Roles('VENDEUR')
  @Post()
  create(@Request() req, @Body() dto: CreateBonDto) {
    return this.bonVenteService.create(dto, req.user);
  }

  @Roles('CAISSIER', 'SUPER_ADMIN', 'ADMIN')
  @Get('pending')
  findPending() {
    return this.bonVenteService.findPending();
  }

  @Roles('VENDEUR')
  @Get('mes-bons')
  mesBons(@Request() req) {
    return this.bonVenteService.findMesBons(req.user.id);
  }

  @Roles('CAISSIER', 'SUPER_ADMIN')
  @Post(':id/valider')
  valider(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.bonVenteService.valider(id, req.user);
  }

  @Roles('VENDEUR')
  @Post(':id/annuler')
  annuler(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.bonVenteService.annuler(id, req.user);
  }

  @Roles('CAISSIER', 'SUPER_ADMIN', 'ADMIN')
  @Sse('stream')
  stream(): Observable<MessageEvent> {
    return this.bonVenteEventsService.stream$.pipe(
      map(bon => ({ data: bon } as MessageEvent))
    );
  }
}
```

5. Créer `Back-end/src/bon-vente/bon-vente.module.ts` — déclarer controller, service, events service, importer DatabaseModule
6. Ajouter `BonVenteModule` dans `Back-end/src/app.module.ts`

### Étape 3 — Backend : Module `Facture`

1. Créer `facture.service.ts` avec :
   - `findAll(filters)` : filtrer par `type`, `vendeurId`, `periode`
   - `findOne(id)` : avec toutes les relations
   - `incrementPrintCount(id)` : `printCount + 1`

2. Créer `facture.controller.ts` avec les 3 endpoints (section 3.2)
3. Créer `facture.module.ts`
4. Importer dans `app.module.ts`

### Étape 4 — Backend : Module `Prime`

1. Créer `prime.service.ts` avec :
   - `classement(periode)` : `findMany` ordonné par `nombreTickets desc` + rang calculé
   - `monScore(vendeurId)` : `findFirst` pour mois en cours
   - `valider(id, actorId)` : `statut → VALIDEE`, `valideeById`, `valideeAt`
   - `payer(id)` : `statut → PAYEE`

2. Créer `prime.controller.ts` avec les 4 endpoints (section 3.3)
3. Créer `prime.module.ts`
4. Importer dans `app.module.ts`

### Étape 5 — Backend : Passation volante

1. Dans `admin-auth.service.ts` ajouter :

```typescript
async changerRole(id: string, role: AdminRole) {
  const admin = await this.db.adminUser.findUnique({ where: { id } });
  if (!admin) throw new NotFoundException('Employé introuvable');
  return this.db.adminUser.update({
    where: { id },
    data: { role },
    select: { id: true, nom: true, email: true, role: true, isActive: true }
  });
}
```

2. Dans `admin-auth.controller.ts` ajouter :

```typescript
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Patch(':id/role')
async changerRole(
  @Param('id', ParseUUIDPipe) id: string,
  @Body() body: { role: AdminRole }
) {
  return this.adminAuthService.changerRole(id, body.role);
}
```

### Étape 6 — Backend : Corriger `VenteService`

Dans `Back-end/src/vente/vente.service.ts`, dans la méthode `create()`, ajouter `vendeurId: actor?.id` lors du `tx.vente.create()` :

```typescript
const vente = await tx.vente.create({
  data: {
    ...venteData,
    vendeurId: actor?.id,   // ← ajouter cette ligne
    lignesVente: { ... }
  },
  ...
});
```

### Étape 7 — Frontend : `api.ts`

Dans `Font-end-admin/.../src/services/api.ts`, ajouter à la fin :

```typescript
export const bonVenteApi = {
  create: (data: any) => api.post('/bons', data).then(r => r.data),
  mesBons: () => api.get('/bons/mes-bons').then(r => r.data),
  annuler: (id: string) => api.post(`/bons/${id}/annuler`).then(r => r.data),
  monScore: () => api.get('/primes/mon-score').then(r => r.data),
};

export const caisseValidationApi = {
  pending: () => api.get('/bons/pending').then(r => r.data),
  valider: (id: string) => api.post(`/bons/${id}/valider`).then(r => r.data),
};

export const factureApi = {
  getAll: (params?: any) => api.get('/factures', { params }).then(r => r.data),
  getOne: (id: string) => api.get(`/factures/${id}`).then(r => r.data),
  print: (id: string) => api.post(`/factures/${id}/print`).then(r => r.data),
};

export const primeApi = {
  classement: (periode: string) =>
    api.get('/primes/classement', { params: { periode } }).then(r => r.data),
  monScore: () => api.get('/primes/mon-score').then(r => r.data),
  valider: (id: string) => api.patch(`/primes/${id}/valider`).then(r => r.data),
  payer: (id: string) => api.patch(`/primes/${id}/payer`).then(r => r.data),
};

export const adminRoleApi = {
  changerRole: (id: string, role: string) =>
    api.patch(`/admin-auth/${id}/role`, { role }).then(r => r.data),
};
```

### Étape 8 — Frontend : Créer `BonVente.tsx`

Créer `Font-end-admin/.../src/components/BonVente.tsx` selon la spec section 5.1.

### Étape 9 — Frontend : Créer `CaisseValidation.tsx`

Créer `Font-end-admin/.../src/components/CaisseValidation.tsx` selon la spec section 5.2.

### Étape 10 — Frontend : Créer `Primes.tsx`

Créer `Font-end-admin/.../src/components/Primes.tsx` selon la spec section 5.3.

### Étape 11 — Frontend : Corriger `ReceiptGenerator.tsx`

1. Ligne 331 — corriger la casse :
```typescript
// AVANT :
client?.typeClient === 'professionnel'
// APRÈS :
client?.typeClient === 'PROFESSIONNEL'
```

2. Remplacer les 3 placeholders dans `TicketCompact` et `FacturePro` :
```typescript
// AVANT :
'NUI: P00000000000X (placeholder)'
'RCCM: RC/DLA/2024/X/00000 (placeholder)'
'Tél: +237 6XX XXX XXX'
// APRÈS : valeurs réelles à récupérer auprès du responsable projet
```

3. Ajouter les props `vendeur` et `caissiere` à l'interface `ReceiptProps` :
```typescript
vendeur?: { nom: string };
caissiere?: { nom: string };
```

4. Afficher dans `TicketCompact` après le bloc client :
```tsx
{props.vendeur && <p className="text-[10px]">Vendeur: {props.vendeur.nom}</p>}
{props.caissiere && <p className="text-[10px]">Caissière: {props.caissiere.nom}</p>}
```

5. Afficher dans `FacturePro` dans le bloc informations :
```tsx
{props.vendeur && <p className="text-sm text-gray-600">Vendeur: {props.vendeur.nom}</p>}
{props.caissiere && <p className="text-sm text-gray-600">Caissière: {props.caissiere.nom}</p>}
```

### Étape 12 — Frontend : Modifier `Ventes.tsx`

1. Supprimer la ligne : `import { ReceiptGenerator, generateReceiptNumber } from './ReceiptGenerator';`
2. Remplacer par : `import { ReceiptGenerator } from './ReceiptGenerator';`
3. Dans `handleSubmitSale()`, remplacer :
```typescript
// AVANT :
_receiptNumber: generateReceiptNumber(rType),
// APRÈS :
_receiptNumber: result.facture?.numero || result.id,
```
4. Passer `vendeur` et `caissiere` à `ReceiptGenerator` si disponibles dans `result.facture`

### Étape 13 — Frontend : Modifier `Invoices.tsx`

1. Supprimer `MOCK_INVOICES` et toutes les données statiques
2. Ajouter `useEffect` pour charger `factureApi.getAll()`
3. Ajouter filtres : sélecteur `type` (FACTURE / TICKET_CAISSE), sélecteur `periode`
4. Remplacer le bouton "PDF" par un bouton "Imprimer" qui appelle `factureApi.print(id)` puis ouvre `ReceiptGenerator`

### Étape 14 — Frontend : Modifier `AdminAccounts.tsx`

Dans la fiche de chaque employé, ajouter :
1. Affichage du rôle actuel
2. Dropdown avec options : `VENDEUR`, `CAISSIER`, `ADMIN`, `MANAGER`
3. Bouton "Changer le rôle" → `adminRoleApi.changerRole(id, role)` → rafraîchir la liste

### Étape 15 — Frontend : Modifier `permissions.ts`

Ajouter dans l'objet `can` :
```typescript
creerBon:        (role?: string) => role === 'VENDEUR',
validerBon:      (role?: string) => ['CAISSIER', 'SUPER_ADMIN'].includes(role || ''),
voirPrimes:      (role?: string) => ['SUPER_ADMIN', 'ADMIN'].includes(role || ''),
validerPrime:    (role?: string) => role === 'SUPER_ADMIN',
voirMarges:      (role?: string) => ['SUPER_ADMIN', 'ADMIN'].includes(role || ''),
voirSoldeGlobal: (role?: string) => ['SUPER_ADMIN', 'ADMIN'].includes(role || ''),
```

### Étape 16 — Frontend : Modifier `App.tsx`

Ajouter les imports et les routes :
```typescript
import { BonVente } from './components/BonVente';
import { CaisseValidation } from './components/CaisseValidation';
import { Primes } from './components/Primes';

// Dans <Routes> :
<Route path="bons" element={
  <RoleProtectedRoute allowedRoles={['VENDEUR']}>
    <BonVente />
  </RoleProtectedRoute>
} />
<Route path="caisse-validation" element={
  <RoleProtectedRoute allowedRoles={['CAISSIER', 'SUPER_ADMIN']}>
    <CaisseValidation />
  </RoleProtectedRoute>
} />
<Route path="primes" element={
  <RoleProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
    <Primes />
  </RoleProtectedRoute>
} />
```

---

## 7. VÉRIFICATIONS FINALES

### Backend
```bash
cd Back-end
npx tsc --noEmit          # zéro erreur TypeScript
npm run build             # build réussi
npm run lint              # zéro warning bloquant
```

### Frontend
```bash
cd Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard
npm run build             # build réussi
npx tsc --noEmit          # zéro erreur TypeScript
```

### Tests fonctionnels à effectuer manuellement

1. **Vendeur → créer un bon** : se connecter avec un compte VENDEUR → créer un bon avec 2 produits → vérifier qu'un second bon est bloqué tant que le premier est EN_ATTENTE
2. **SSE → notification** : ouvrir CaisseValidation → créer un bon en tant que vendeur → vérifier que la cloche s'incrémente sans recharger la page
3. **Caissière → valider** : cliquer "Valider" sur un bon → vérifier que la facture s'affiche avec un numéro `TIC-2026-XXXX` ou `FAC-2026-XXXX`
4. **Numéro fixe** : réimprimer la même facture depuis l'historique → vérifier que le numéro est identique
5. **Prime** : valider 3 bons pour le vendeur A et 1 bon pour le vendeur B → aller dans Primes → vérifier que le vendeur A est en rang 1
6. **Passation volante** : changer le rôle de Marie de CAISSIER à VENDEUR → vérifier que son interface change au prochain login
7. **Interface par rôle** : vérifier que le VENDEUR ne voit pas `prixAchat`, `prixGros`, le solde global, les coffres, les échéances

---

## 8. CONTRAINTES

1. **Aucune nouvelle dépendance npm** — tout doit utiliser les packages déjà installés dans `package.json`
2. **Commits atomiques** — un commit par étape numérotée. Format : `feat(bon-vente): add service and controller`
3. **Ne pas toucher au frontend client** — uniquement le dashboard admin (`Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard/`)
4. **Ne rien supprimer** — aucun champ existant, aucun fichier existant ne doit être supprimé
5. **Ne pas exécuter la migration** — `prisma generate` uniquement, pas `prisma migrate dev`
6. **Pas de `any` non justifié** — typer correctement les DTOs et les retours de service
7. **Guards sur tous les endpoints** — chaque endpoint doit avoir `@UseGuards(AdminAuthGuard, RolesGuard)` + `@Roles(...)`
8. **TVA fixe à 19,25%** — constante partagée, ne pas la dupliquer :
```typescript
// Dans bon-vente.service.ts (et réutiliser partout)
const TVA_TAUX = 0.1925;
const totalTTC = montantTotal;
const totalHT = totalTTC / (1 + TVA_TAUX);
const tva = totalTTC - totalHT;
```
9. **Numérotation atomique** — toujours compter dans la même `$transaction` pour éviter les doublons en concurrence
10. **SSE et authentification** — le token JWT doit être validé pour l'endpoint SSE. Passer le token en query param `?token=xxx` et créer un guard SSE qui valide ce token

---

*Fin du plan — version validée le 2026-05-30*
