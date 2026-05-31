# LIVRAISON 4 — Refonte UX/UI Admin

> Plan d'implémentation détaillé pour Codex (ChatGPT) — basé sur le brainstorm validé du 30 mai 2026 par le dirigeant NEWOTEG.
>
> **Objectif** : refondre l'interface admin NEWOTEG (boutique d'électronique Cameroun) pour qu'elle soit user-friendly, multi-rôles, adaptée au contexte africain (login par nom, PIN pour personnel boutique, FCFA, Douala), et alignée sur le workflow réel (vendeur prépare → caissier encaisse, caisse du jour qui se réinitialise, coffres virtuels).

---

## 0. Contexte projet (résumé)

- **Stack backend** : NestJS 11 + Prisma 7 + PostgreSQL (Railway) — `Back-end/`
- **Stack frontend admin** : React 19 + TypeScript + Vite 6 + Tailwind 4 — `Font-end-admin/NEWOTEG-ECOMMERCE-feature-new-dashboard/`
- **Stack frontend client** : `Font-end/` (intact, hors scope L4)
- **Devise unique** : FCFA
- **Timezone** : Africa/Douala (UTC+1)
- **Boutique physique** + **e-commerce** sur le même catalogue
- Modèles existants à conserver : `AdminUser`, `Caisse`, `Coffre`, `Echeance`, `AlerteEcheance`, `Notification`, `Produit`, `Vente`, `Client`, `Commande`, etc.

---

## 1. Décisions architecturales verrouillées

### 1.1 Authentification
- Login par **nom d'utilisateur unique** (créé manuellement par le dirigeant) + **mot de passe** (8+ caractères) pour SUPER_ADMIN / ADMIN
- Login par **PIN à 4–6 chiffres** pour CAISSIER / VENDEUR (saisie clavier numérique sur tablette)
- **Email totalement optionnel** sur tous les comptes
- **Nom complet** saisi par le dirigeant (ex. « Jean Mbarga »)
- **Photo / avatar** uploadable (Cloudinary, comme produits)
- Message **« Session expirée »** explicite quand JWT expire
- **Journal d'activité** par utilisateur (audit trail)

### 1.2 Rôles & permissions
- **4 rôles** : `SUPER_ADMIN`, `ADMIN`, `CAISSIER`, `VENDEUR`
- **Pas de cumul** : un employé = un seul rôle à la fois
- **Changement de rôle facile** : le dirigeant change le rôle d'un employé en 1 clic depuis sa fiche
- **Interface adaptative** : chaque utilisateur ne voit **que** les menus et écrans auxquels il a accès — rien de grisé, rien de masqué partiellement
- **Désactivation** sans suppression (champ `actif: boolean`)
- **Historique des rôles** sur la fiche employé

### 1.3 Caisse du jour & Caisse globale
- **Caisse du jour** repart à **0 FCFA chaque matin** (auto-création)
- **Une seule caisse du jour active par date** (pas de sessions concurrentes — un caissier à la fois)
- **Caissier voit sa caisse du jour** ; **SUPER_ADMIN et ADMIN voient aussi en temps réel** (supervision)
- **Pas de comptage manuel** à la fermeture — le système fait foi
- **Fermeture caisse** : bouton « Fermer la caisse » → transfert auto du solde vers Caisse Globale → fin de session
- **Alerte 19h00** si caisse pas fermée (boutique ferme 18h30)
- **Sorties pendant la journée** : libres pour le caissier, **traçabilité obligatoire** (motif + horodatage + identité)

### 1.4 Workflow Vendeur → Caissier
- **Vendeur** prépare la commande (produits, client) et clique **« Envoyer au caissier »**
- Le ticket apparaît dans la **file d'attente du caissier**
- **Validité 15 min** — au-delà, expiration automatique
- **Vendeur peut annuler** un ticket en attente avant encaissement
- **Caissier encaisse** : choisit méthode (espèces, mobile money, etc.), clôture la vente

### 1.5 Matrice d'accès finale

| Fonctionnalité | SUPER_ADMIN | ADMIN | CAISSIER | VENDEUR |
|---|:---:|:---:|:---:|:---:|
| Caisse — encaisser une vente | ✅ | ✅ | ✅ | ❌ |
| Caisse — sortie / dépense | ✅ | ✅ | ✅ | ❌ |
| Caisse — annuler une transaction | ✅ | ❌ | ❌ | ❌ |
| Caisse — voir caisse globale | ✅ | ✅ | ❌ | ❌ |
| Caisse — voir caisse du jour | ✅ | ✅ | ✅ (la sienne) | ❌ |
| Coffres — voir / créer / virer | ✅ | ✅ | ❌ | ❌ |
| Coffres — sortie | ✅ | ✅ | ❌ | ❌ |
| Échéances — voir / créer / modifier | ✅ | ✅ | ❌ | ❌ |
| Échéances — supprimer | ✅ | ❌ | ❌ | ❌ |
| Produits — voir stock | ✅ | ✅ | ✅ | ✅ |
| Produits — voir prix d'achat | ✅ | ✅ | ❌ | ❌ |
| Produits — créer / modifier | ✅ | ✅ | ❌ | ❌ |
| Produits — supprimer | ✅ | ❌ | ❌ | ❌ |
| Commandes en ligne | ✅ | ✅ | ❌ | ✅ |
| Clients (fichier) | ✅ | ✅ | ❌ | ✅ |
| Dashboard (KPIs) | ✅ | ✅ | ❌ | ❌ |
| Analyses / graphes | ✅ | ✅ | ❌ | ❌ |
| Vendeur — créer ticket | ✅ | ✅ | ❌ | ✅ |
| Caissier — file d'attente | ✅ | ✅ | ✅ | ❌ |
| Employés — gérer | ✅ | ❌ | ❌ | ❌ |
| Paramètres système | ✅ | ❌ | ❌ | ❌ |

### 1.6 Sidebar — 7 groupes thématiques

```
📊 PILOTAGE      → Tableau de bord, Analyses, Notifications
💰 FINANCE       → Caisse du jour, Caisse globale, Coffres, Échéances
🏬 BOUTIQUE      → Vente en cours (POS vendeur), File d'attente caissier, Tickets du jour
🌐 E-COMMERCE    → Commandes en ligne, Promotions
📦 CATALOGUE     → Produits, Stocks, Catégories, Attributs (partagé physique + en ligne)
👥 RELATION      → Clients, Employés
⚙ SYSTÈME       → Paramètres, Profil
```

### 1.7 Suppressions définitives
- `Font-end-admin/.../src/components/Addresses.tsx` (mock)
- `Font-end-admin/.../src/components/Invoices.tsx` (mock)
- `Font-end-admin/.../src/components/Support.tsx` (mock)
- `Font-end-admin/.../src/components/PlaceholderPage.tsx`
- Routes `/addresses`, `/invoices`, `/support` dans `App.tsx`
- Imports correspondants

### 1.8 Cohérence linguistique & formats
- **100% français** partout en UI
- **Devise** : `1 234 567 FCFA` (séparateur = espace insécable ` `)
- **Dates** : `30 mai 2026` (format long lisible)
- **Heures** : `19h00` ou `19:00` (24h, jamais AM/PM)
- **Accents corrects** en UI (échéances, opérations, créé, modifié…)
- **Empty states** : icône + message FR + bouton action si pertinent

---

## PHASE 1 — Fondations (rôles + auth)

### Chantier 1.1 — Refonte enum `AdminRole` et table utilisateurs

#### Modifier : `Back-end/prisma/schema.prisma`

**1.1.A — Étendre l'enum `AdminRole`** (ligne ~455) :

```prisma
enum AdminRole {
  SUPER_ADMIN
  ADMIN
  CAISSIER
  VENDEUR
  MANAGER       // conservé pour rétrocompat, NE PAS utiliser pour nouveaux comptes
}
```

**1.1.B — Étendre le modèle `AdminUser`** (ligne ~442) :

```prisma
model AdminUser {
  id            String    @id @default(uuid())
  email         String?   @unique @db.VarChar(100)   // <-- devient optionnel
  username      String    @unique @db.VarChar(50)    // <-- NOUVEAU obligatoire
  motDePasse    String?   @map("mot_de_passe")       // <-- optionnel (PIN-only users)
  pinCode       String?   @map("pin_code") @db.VarChar(255) // <-- NOUVEAU (hashé bcrypt)
  nom           String    @db.VarChar(100)
  photoUrl      String?   @map("photo_url")          // <-- NOUVEAU
  role          AdminRole @default(ADMIN)
  isActive      Boolean   @default(true) @map("is_active")
  lastLoginAt   DateTime? @map("last_login_at")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at") // <-- NOUVEAU
  createdById   String?   @map("created_by")         // <-- NOUVEAU (auto-traçabilité)

  roleHistory   RoleHistory[]
  activityLog   ActivityLog[]

  @@map("admin_user")
}
```

**1.1.C — Nouveau modèle `RoleHistory`** (audit changements de rôle) :

```prisma
model RoleHistory {
  id            String    @id @default(uuid())
  adminUserId   String    @map("admin_user_id")
  oldRole       AdminRole @map("old_role")
  newRole       AdminRole @map("new_role")
  changedById   String    @map("changed_by")
  changedAt     DateTime  @default(now()) @map("changed_at")
  motif         String?   @db.VarChar(255)

  adminUser     AdminUser @relation(fields: [adminUserId], references: [id], onDelete: Cascade)

  @@index([adminUserId])
  @@map("role_history")
}
```

**1.1.D — Nouveau modèle `ActivityLog`** (journal d'activité) :

```prisma
model ActivityLog {
  id            String    @id @default(uuid())
  adminUserId   String    @map("admin_user_id")
  action        String    @db.VarChar(100)   // ex: "LOGIN", "CAISSE_OPEN", "VENTE_CREATE"
  details       Json?
  ipAddress     String?   @map("ip_address") @db.VarChar(45)
  userAgent     String?   @map("user_agent") @db.VarChar(255)
  createdAt     DateTime  @default(now()) @map("created_at")

  adminUser     AdminUser @relation(fields: [adminUserId], references: [id], onDelete: Cascade)

  @@index([adminUserId, createdAt])
  @@index([action, createdAt])
  @@map("activity_log")
}
```

#### Créer : `Back-end/prisma/migrations/20260601_refonte_roles_auth/migration.sql`

```sql
-- Ajout des nouveaux rôles à l'enum
ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'CAISSIER';
ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'VENDEUR';

-- Rendre email optional sur admin_user
ALTER TABLE "admin_user" ALTER COLUMN "email" DROP NOT NULL;

-- Ajouter les nouvelles colonnes
ALTER TABLE "admin_user" ADD COLUMN IF NOT EXISTS "username" VARCHAR(50);
ALTER TABLE "admin_user" ADD COLUMN IF NOT EXISTS "pin_code" VARCHAR(255);
ALTER TABLE "admin_user" ADD COLUMN IF NOT EXISTS "photo_url" TEXT;
ALTER TABLE "admin_user" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "admin_user" ADD COLUMN IF NOT EXISTS "created_by" TEXT;
ALTER TABLE "admin_user" ALTER COLUMN "mot_de_passe" DROP NOT NULL;

-- Pour les comptes existants : username = part-before-@ de l'email
UPDATE "admin_user" SET "username" = SPLIT_PART("email", '@', 1) WHERE "username" IS NULL;

-- Rendre username NOT NULL + UNIQUE
ALTER TABLE "admin_user" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "admin_user_username_key" ON "admin_user"("username");

-- Table role_history
CREATE TABLE IF NOT EXISTS "role_history" (
  "id" TEXT NOT NULL,
  "admin_user_id" TEXT NOT NULL,
  "old_role" "AdminRole" NOT NULL,
  "new_role" "AdminRole" NOT NULL,
  "changed_by" TEXT NOT NULL,
  "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "motif" VARCHAR(255),
  CONSTRAINT "role_history_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "role_history_admin_user_id_idx" ON "role_history"("admin_user_id");
ALTER TABLE "role_history" ADD CONSTRAINT "role_history_admin_user_id_fkey"
  FOREIGN KEY ("admin_user_id") REFERENCES "admin_user"("id") ON DELETE CASCADE;

-- Table activity_log
CREATE TABLE IF NOT EXISTS "activity_log" (
  "id" TEXT NOT NULL,
  "admin_user_id" TEXT NOT NULL,
  "action" VARCHAR(100) NOT NULL,
  "details" JSONB,
  "ip_address" VARCHAR(45),
  "user_agent" VARCHAR(255),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "activity_log_admin_user_id_created_at_idx" ON "activity_log"("admin_user_id", "created_at");
CREATE INDEX IF NOT EXISTS "activity_log_action_created_at_idx" ON "activity_log"("action", "created_at");
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_admin_user_id_fkey"
  FOREIGN KEY ("admin_user_id") REFERENCES "admin_user"("id") ON DELETE CASCADE;
```

#### Modifier : `Back-end/scripts/ensure-schema.js`

Ajouter les statements idempotents équivalents (mêmes statements SQL avec `IF NOT EXISTS`).

#### Critères d'acceptation Chantier 1.1
- [ ] `npx prisma migrate dev` passe sans erreur
- [ ] Comptes admin existants ont un `username` valide (extrait de l'email)
- [ ] `npx prisma studio` montre les nouveaux champs
- [ ] Aucun admin existant ne perd l'accès

---

### Chantier 1.2 — Backend authentification (username/password + PIN)

#### Modifier : `Back-end/src/admin-auth/admin-auth.controller.ts`

Endpoints à modifier/ajouter :

```typescript
// POST /api/admin/auth/login
// Body: { username: string, password?: string, pin?: string }
// Logique : si pin fourni → vérifier pinCode hashé ; sinon vérifier motDePasse
//           seul un des deux est requis selon le rôle de l'utilisateur trouvé

// POST /api/admin/auth/login-pin
// Body: { username: string, pin: string }
// Pour les tablettes boutique : login PIN simplifié, JWT court (4h)

// GET /api/admin/auth/me
// Retourne user courant (existant, à conserver)
```

#### Modifier : `Back-end/src/admin-auth/admin-auth.service.ts`

Méthodes principales :

```typescript
async loginWithPassword(username: string, password: string) {
  const user = await this.prisma.adminUser.findUnique({ where: { username } });
  if (!user || !user.isActive) throw new UnauthorizedException('Nom d\'utilisateur ou mot de passe incorrect');
  if (!user.motDePasse) throw new UnauthorizedException('Ce compte ne peut pas se connecter par mot de passe');
  const valid = await bcrypt.compare(password, user.motDePasse);
  if (!valid) throw new UnauthorizedException('Nom d\'utilisateur ou mot de passe incorrect');

  await this.prisma.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await this.activityLog.log(user.id, 'LOGIN_PASSWORD');

  return this.issueJwt(user, '24h');
}

async loginWithPin(username: string, pin: string) {
  const user = await this.prisma.adminUser.findUnique({ where: { username } });
  if (!user || !user.isActive) throw new UnauthorizedException('Identifiants invalides');
  if (!user.pinCode) throw new UnauthorizedException('Ce compte n\'a pas de PIN configuré');
  if (!['CAISSIER', 'VENDEUR'].includes(user.role)) throw new UnauthorizedException('Le PIN n\'est autorisé que pour le personnel de boutique');

  const valid = await bcrypt.compare(pin, user.pinCode);
  if (!valid) throw new UnauthorizedException('Identifiants invalides');

  await this.prisma.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await this.activityLog.log(user.id, 'LOGIN_PIN');

  return this.issueJwt(user, '4h');
}

private issueJwt(user: AdminUser, expiresIn: string) {
  const token = this.jwtService.sign(
    { sub: user.id, username: user.username, role: user.role, nom: user.nom },
    { expiresIn }
  );
  return {
    token,
    user: { id: user.id, username: user.username, nom: user.nom, role: user.role, photoUrl: user.photoUrl }
  };
}
```

#### Créer : `Back-end/src/admin-auth/activity-log.service.ts`

```typescript
@Injectable()
export class ActivityLogService {
  constructor(private prisma: PrismaService) {}

  async log(adminUserId: string, action: string, details?: any, ip?: string, ua?: string) {
    try {
      await this.prisma.activityLog.create({
        data: { adminUserId, action, details, ipAddress: ip, userAgent: ua }
      });
    } catch (e) {
      // ne jamais bloquer l'action principale à cause d'un log
    }
  }

  async list(adminUserId?: string, limit = 50) {
    return this.prisma.activityLog.findMany({
      where: adminUserId ? { adminUserId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { adminUser: { select: { username: true, nom: true, role: true } } }
    });
  }
}
```

#### Modifier : `Back-end/src/admin-auth/roles.guard.ts`
Aucun changement structurel — fonctionne avec les nouveaux rôles automatiquement.

#### Modifier : `Back-end/src/admin-auth/admin-auth.module.ts`
Ajouter `ActivityLogService` dans providers et exports.

#### Critères d'acceptation Chantier 1.2
- [ ] `POST /api/admin/auth/login` accepte `{username, password}` et retourne JWT
- [ ] `POST /api/admin/auth/login-pin` accepte `{username, pin}` et retourne JWT (4h)
- [ ] Login PIN refusé pour SUPER_ADMIN et ADMIN
- [ ] `lastLoginAt` mis à jour à chaque login
- [ ] `ActivityLog` créée à chaque login
- [ ] Comptes SUPER_ADMIN existants peuvent toujours se connecter (avec leur username extrait)

---

### Chantier 1.3 — Frontend login refondu

#### Modifier : `Font-end-admin/.../src/components/AdminLogin.tsx`

Refonte complète :
- **Tab 1 : Mot de passe** (par défaut) — champs `Nom d'utilisateur` + `Mot de passe`
- **Tab 2 : PIN boutique** — champ `Nom d'utilisateur` + clavier numérique 0–9 + zone d'affichage du PIN (•••• ou •••••• selon longueur)
- Logo NEWOTEG, fond gradient bleu/blanc, design épuré
- Message d'erreur en rouge sous le bouton si échec
- **Message « Session expirée »** affiché en bandeau orange si l'utilisateur arrive ici après expiration JWT (query param `?expired=1`)

Logique :
```typescript
const handlePasswordLogin = async (e: FormEvent) => {
  try {
    await adminAuthApi.login(username, password);
    navigate('/');
  } catch (err: any) {
    setError(err.response?.data?.message || 'Échec de la connexion');
  }
};

const handlePinLogin = async () => {
  if (pin.length < 4 || pin.length > 6) return;
  try {
    await adminAuthApi.loginPin(username, pin);
    navigate('/');
  } catch (err: any) {
    setError(err.response?.data?.message || 'PIN incorrect');
  }
};
```

#### Modifier : `Font-end-admin/.../src/services/api.ts`

Ajouter `adminAuthApi.loginPin(username, pin)`.
Modifier `adminAuthApi.login(username, password)` (remplacer `email` par `username` dans le body).

#### Modifier : `Font-end-admin/.../src/context/AdminAuthContext.tsx`

Ajouter intercepteur axios :
```typescript
axios.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && window.location.pathname !== '/login') {
      window.location.href = '/login?expired=1';
    }
    return Promise.reject(err);
  }
);
```

#### Critères d'acceptation Chantier 1.3
- [ ] Login par mot de passe fonctionne pour SUPER_ADMIN existants
- [ ] Login par PIN affiche un clavier numérique (4 ou 6 cases)
- [ ] JWT expiré → redirection `/login?expired=1` avec bandeau orange
- [ ] Pas de mention « email » dans l'UI (que « Nom d'utilisateur »)

---

## PHASE 2 — Caisse du jour & Workflow vendeur→caissier

### Chantier 2.1 — Modèle `CaisseJour`

#### Modifier : `Back-end/prisma/schema.prisma`

```prisma
model CaisseJour {
  id              String          @id @default(uuid())
  date            DateTime        @unique @db.Date  // 1 seule par jour
  ouvertureAt     DateTime        @map("ouverture_at")
  fermetureAt     DateTime?       @map("fermeture_at")
  caissierId      String?         @map("caissier_id")
  soldeCloture    Decimal?        @map("solde_cloture") @db.Decimal(12, 2)
  statut          StatutCaisseJour @default(OUVERTE)
  createdAt       DateTime        @default(now()) @map("created_at")
  updatedAt       DateTime        @updatedAt @map("updated_at")

  operations      Caisse[]        @relation("CaisseJourOperations")

  @@index([statut])
  @@index([date])
  @@map("caisse_jour")
}

enum StatutCaisseJour {
  OUVERTE
  FERMEE
}
```

#### Modifier le modèle `Caisse` (ajouter le lien) :

```prisma
model Caisse {
  // ... champs existants ...
  caisseJourId      String?     @map("caisse_jour_id")
  caisseJour        CaisseJour? @relation("CaisseJourOperations", fields: [caisseJourId], references: [id])

  @@index([caisseJourId])
}
```

#### Migration SQL associée

```sql
CREATE TYPE "StatutCaisseJour" AS ENUM ('OUVERTE', 'FERMEE');

CREATE TABLE "caisse_jour" (
  "id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "ouverture_at" TIMESTAMP(3) NOT NULL,
  "fermeture_at" TIMESTAMP(3),
  "caissier_id" TEXT,
  "solde_cloture" DECIMAL(12,2),
  "statut" "StatutCaisseJour" NOT NULL DEFAULT 'OUVERTE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "caisse_jour_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "caisse_jour_date_key" UNIQUE ("date")
);
CREATE INDEX "caisse_jour_statut_idx" ON "caisse_jour"("statut");
CREATE INDEX "caisse_jour_date_idx" ON "caisse_jour"("date");

ALTER TABLE "caisse" ADD COLUMN "caisse_jour_id" TEXT;
ALTER TABLE "caisse" ADD CONSTRAINT "caisse_caisse_jour_id_fkey"
  FOREIGN KEY ("caisse_jour_id") REFERENCES "caisse_jour"("id");
CREATE INDEX "caisse_caisse_jour_id_idx" ON "caisse"("caisse_jour_id");
```

#### Créer : `Back-end/src/caisse-jour/caisse-jour.service.ts`

```typescript
@Injectable()
export class CaisseJourService {
  constructor(private prisma: PrismaService) {}

  // Récupère ou crée la caisse du jour pour aujourd'hui (Africa/Douala)
  async getOrCreateToday(caissierId?: string): Promise<CaisseJour> {
    const today = this.getDateDouala();
    let cj = await this.prisma.caisseJour.findUnique({ where: { date: today } });
    if (!cj) {
      cj = await this.prisma.caisseJour.create({
        data: {
          date: today,
          ouvertureAt: new Date(),
          caissierId: caissierId ?? null,
        }
      });
    }
    return cj;
  }

  // Solde calculé en temps réel
  async getSoldeJour(caisseJourId: string): Promise<number> {
    const ops = await this.prisma.caisse.findMany({
      where: { caisseJourId, annulee: false }
    });
    return ops.reduce((acc, op) => {
      const sign = op.typeOperation === 'ENTREE' ? 1 : -1;
      return acc + sign * Number(op.montant);
    }, 0);
  }

  async fermer(caisseJourId: string, fermeParId: string) {
    const cj = await this.prisma.caisseJour.findUnique({ where: { id: caisseJourId } });
    if (!cj) throw new NotFoundException('Caisse du jour introuvable');
    if (cj.statut === 'FERMEE') throw new BadRequestException('Caisse déjà fermée');

    const solde = await this.getSoldeJour(caisseJourId);

    return this.prisma.$transaction(async (tx) => {
      // 1. Marquer la caisse jour comme fermée
      const updated = await tx.caisseJour.update({
        where: { id: caisseJourId },
        data: {
          statut: 'FERMEE',
          fermetureAt: new Date(),
          soldeCloture: solde,
        }
      });

      // 2. Créer la ligne de transfert vers caisse globale
      if (solde !== 0) {
        await tx.caisse.create({
          data: {
            typeOperation: solde > 0 ? 'ENTREE' : 'SORTIE',
            montant: Math.abs(solde),
            motif: `Clôture caisse du jour ${cj.date.toISOString().slice(0, 10)}`,
            effectueePar: fermeParId,
            // Pas de caisseJourId — c'est la globale
          }
        });
      }

      return updated;
    });
  }

  private getDateDouala(): Date {
    const now = new Date();
    const douala = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Douala' }));
    return new Date(douala.getFullYear(), douala.getMonth(), douala.getDate());
  }
}
```

#### Créer : `Back-end/src/caisse-jour/caisse-jour.controller.ts`

```typescript
@Controller('caisse-jour')
@UseGuards(AdminAuthGuard)
export class CaisseJourController {
  constructor(private service: CaisseJourService) {}

  @Get('aujourdhui')
  async aujourdhui(@CurrentUser() user: AdminUser) {
    const cj = await this.service.getOrCreateToday(user.id);
    const solde = await this.service.getSoldeJour(cj.id);
    return { ...cj, solde };
  }

  @Get(':id/operations')
  async operations(@Param('id') id: string) {
    return this.service.getOperations(id);
  }

  @Post(':id/fermer')
  @Roles('CAISSIER', 'ADMIN', 'SUPER_ADMIN')
  async fermer(@Param('id') id: string, @CurrentUser() user: AdminUser) {
    return this.service.fermer(id, user.id);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN')
  async historique(@Query('from') from?: string, @Query('to') to?: string) {
    return this.service.historique(from, to);
  }
}
```

#### Créer : `Back-end/src/caisse-jour/caisse-jour-scheduler.service.ts`

```typescript
@Injectable()
export class CaisseJourSchedulerService {
  private readonly logger = new Logger(CaisseJourSchedulerService.name);

  constructor(
    private caisseJourService: CaisseJourService,
    private mailService: MailService,
    private prisma: PrismaService,
  ) {}

  @Cron('0 19 * * *', { timeZone: 'Africa/Douala' })
  async alerteCaisseNonFermee() {
    const today = new Date();
    const cj = await this.prisma.caisseJour.findFirst({
      where: { statut: 'OUVERTE' },
      orderBy: { date: 'desc' }
    });
    if (cj) {
      // Notif + email aux SUPER_ADMIN
      await this.prisma.notification.create({
        data: {
          type: 'CAISSE_MAJ',
          message: `⚠ La caisse du jour n'est pas encore fermée (boutique fermée depuis 18h30).`,
          lue: false,
        }
      });
      const admins = await this.prisma.adminUser.findMany({ where: { role: 'SUPER_ADMIN', email: { not: null } } });
      for (const a of admins) {
        if (a.email) {
          await this.mailService.sendMail(a.email, '⚠ Caisse non fermée', `La caisse du jour ${cj.date.toISOString().slice(0,10)} n'est pas fermée. Merci de vérifier.`);
        }
      }
    }
  }
}
```

#### Modifier : `Back-end/src/caisse/caisse.service.ts`

Toutes les opérations « caisse du jour » (encaissement vente boutique, sortie) doivent être liées à `caisseJourId = caisseJour.id du jour`. Les opérations « caisse globale » (transferts vers coffres, sorties exceptionnelles) restent sans `caisseJourId`.

#### Critères d'acceptation Chantier 2.1
- [ ] `GET /api/caisse-jour/aujourdhui` retourne la caisse du jour (auto-créée si besoin) avec son solde temps réel
- [ ] `POST /api/caisse-jour/:id/fermer` fait le transfert vers globale et passe statut à `FERMEE`
- [ ] Une caisse fermée ne peut plus recevoir d'opération
- [ ] Cron 19h00 envoie alerte si caisse non fermée
- [ ] Le solde affiché en temps réel = somme des opérations du jour

---

### Chantier 2.2 — Tickets vendeur → caissier

#### Ajouter au schema Prisma :

```prisma
model TicketVente {
  id              String           @id @default(uuid())
  numeroTicket    String           @unique @db.VarChar(20)  // ex: T-20260601-0042
  vendeurId       String           @map("vendeur_id")
  caissierId      String?          @map("caissier_id")
  clientId        String?          @map("client_id")
  nomClient       String?          @map("nom_client") @db.VarChar(150)
  telephoneClient String?          @map("telephone_client") @db.VarChar(30)
  montantTotal    Decimal          @map("montant_total") @db.Decimal(12, 2)
  methodePaiement MethodePaiement? @map("methode_paiement")
  statut          StatutTicket     @default(EN_ATTENTE)
  venteId         String?          @unique @map("vente_id")  // créée à l'encaissement
  expiresAt       DateTime         @map("expires_at")
  createdAt       DateTime         @default(now()) @map("created_at")
  encaisseAt      DateTime?        @map("encaisse_at")
  annuleAt        DateTime?        @map("annule_at")
  motifAnnulation String?          @map("motif_annulation") @db.VarChar(255)

  lignes          LigneTicket[]
  vente           Vente?           @relation(fields: [venteId], references: [id])

  @@index([statut, expiresAt])
  @@index([vendeurId, createdAt])
  @@map("ticket_vente")
}

model LigneTicket {
  id           String      @id @default(uuid())
  ticketId     String      @map("ticket_id")
  produitId    String      @map("produit_id")
  nomProduit   String      @map("nom_produit") @db.VarChar(150)
  quantite     Int
  prixUnitaire Decimal     @map("prix_unitaire") @db.Decimal(10, 2)
  sousTotal    Decimal     @map("sous_total") @db.Decimal(12, 2)
  ticket       TicketVente @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  @@map("ligne_ticket")
}

enum StatutTicket {
  EN_ATTENTE
  ENCAISSE
  EXPIRE
  ANNULE
}
```

#### Migration SQL : créer types, tables, indexes et FKs.

#### Créer : `Back-end/src/ticket-vente/ticket-vente.service.ts`

Méthodes clés :
- `create(vendeurId, dto)` — crée ticket avec `expiresAt = now + 15min`, génère `numeroTicket`
- `listEnAttente()` — liste pour la file caissier
- `listMine(vendeurId)` — liste pour le vendeur
- `annuler(ticketId, vendeurId)` — uniquement si statut EN_ATTENTE et vendeurId match
- `encaisser(ticketId, caissierId, methodePaiement)` — transaction Prisma :
  1. Vérifier statut = EN_ATTENTE et not expired
  2. Créer `Vente` + `LigneVente` correspondantes
  3. Créer `Caisse` ENTREE liée à `CaisseJour` du jour
  4. Mettre à jour le ticket : statut = ENCAISSE, venteId, encaisseAt
  5. Décrémenter le stock des produits

#### Créer : `Back-end/src/ticket-vente/ticket-vente-scheduler.service.ts`

```typescript
@Cron('*/1 * * * *', { timeZone: 'Africa/Douala' })
async expirerTickets() {
  const now = new Date();
  await this.prisma.ticketVente.updateMany({
    where: { statut: 'EN_ATTENTE', expiresAt: { lt: now } },
    data: { statut: 'EXPIRE' }
  });
}
```

#### Critères d'acceptation Chantier 2.2
- [ ] `POST /api/tickets` (vendeur) crée un ticket avec expiration 15 min
- [ ] `GET /api/tickets/en-attente` (caissier) retourne les tickets actifs non expirés
- [ ] `POST /api/tickets/:id/encaisser` (caissier) crée la vente et l'opération caisse
- [ ] `POST /api/tickets/:id/annuler` (vendeur propriétaire) annule un ticket en attente
- [ ] Cron 1 minute fait passer tickets expirés à `EXPIRE`
- [ ] Encaissement crée une vraie ligne dans `Caisse` liée à `CaisseJour`

---

## PHASE 3 — Interface adaptative

### Chantier 3.1 — Mettre à jour `permissions.ts`

#### Remplacer : `Font-end-admin/.../src/utils/permissions.ts`

```typescript
export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'CAISSIER' | 'VENDEUR';

const isAdmin = (role?: string) => ['SUPER_ADMIN', 'ADMIN'].includes(role || '');
const isSuper = (role?: string) => role === 'SUPER_ADMIN';
const isCaissier = (role?: string) => role === 'CAISSIER';
const isVendeur = (role?: string) => role === 'VENDEUR';

export const can = {
  // Pilotage
  accessDashboard: (r?: string) => isAdmin(r),
  accessAnalyses: (r?: string) => isAdmin(r),
  accessNotifications: (r?: string) => isAdmin(r),

  // Finance
  accessCaisseGlobale: (r?: string) => isAdmin(r),
  accessCaisseJour: (r?: string) => isAdmin(r) || isCaissier(r),
  accessCoffres: (r?: string) => isAdmin(r),
  accessEcheances: (r?: string) => isAdmin(r),
  deleteEcheance: (r?: string) => isSuper(r),
  annulerTransaction: (r?: string) => isSuper(r),

  // Boutique
  accessPOSVendeur: (r?: string) => isAdmin(r) || isVendeur(r),
  accessFileCaissier: (r?: string) => isAdmin(r) || isCaissier(r),

  // E-commerce
  accessCommandesEnLigne: (r?: string) => isAdmin(r) || isVendeur(r),
  accessPromotions: (r?: string) => isAdmin(r),

  // Catalogue
  voirProduits: (r?: string) => true, // tous
  voirPrixAchat: (r?: string) => isAdmin(r),
  modifierProduits: (r?: string) => isAdmin(r),
  supprimerProduits: (r?: string) => isSuper(r),

  // Relation
  accessClients: (r?: string) => isAdmin(r) || isVendeur(r),
  accessEmployes: (r?: string) => isSuper(r),

  // Système
  accessParametres: (r?: string) => isSuper(r),
};
```

### Chantier 3.2 — Refonte `Sidebar.tsx`

#### Remplacer la structure du sidebar par 7 groupes filtrés par rôle

```typescript
const groups = [
  {
    label: 'Pilotage',
    show: can.accessDashboard(role) || can.accessAnalyses(role),
    items: [
      can.accessDashboard(role) && { label: 'Tableau de bord', icon: LayoutDashboard, path: '/' },
      can.accessAnalyses(role) && { label: 'Analyses', icon: BarChart3, path: '/analyses' },
      can.accessNotifications(role) && { label: 'Notifications', icon: Bell, path: '/notifications' },
    ].filter(Boolean),
  },
  {
    label: 'Finance',
    show: can.accessCaisseJour(role) || can.accessCoffres(role),
    items: [
      can.accessCaisseJour(role) && { label: 'Caisse du jour', icon: Wallet, path: '/caisse-jour' },
      can.accessCaisseGlobale(role) && { label: 'Caisse globale', icon: Landmark, path: '/caisse' },
      can.accessCoffres(role) && { label: 'Coffres', icon: PiggyBank, path: '/coffres' },
      can.accessEcheances(role) && { label: 'Échéances', icon: AlarmClock, path: '/echeances' },
    ].filter(Boolean),
  },
  {
    label: 'Boutique',
    show: can.accessPOSVendeur(role) || can.accessFileCaissier(role),
    items: [
      can.accessPOSVendeur(role) && { label: 'Vente en cours', icon: ShoppingBag, path: '/pos' },
      can.accessFileCaissier(role) && { label: "File d'attente", icon: ListChecks, path: '/file-caissier' },
      isAdmin(role) && { label: 'Tickets du jour', icon: Receipt, path: '/tickets' },
    ].filter(Boolean),
  },
  {
    label: 'E-commerce',
    show: can.accessCommandesEnLigne(role),
    items: [
      can.accessCommandesEnLigne(role) && { label: 'Commandes en ligne', icon: Globe, path: '/orders' },
      can.accessPromotions(role) && { label: 'Promotions', icon: Tag, path: '/promotions' },
    ].filter(Boolean),
  },
  {
    label: 'Catalogue',
    show: true, // tous
    items: [
      { label: 'Produits', icon: Package, path: '/produits' },
      can.modifierProduits(role) && { label: 'Catégories', icon: Tags, path: '/categories' },
      can.modifierProduits(role) && { label: 'Attributs', icon: Palette, path: '/attributs' },
      isAdmin(role) && { label: 'Stocks', icon: Activity, path: '/stock' },
      isAdmin(role) && { label: 'Alertes Stock', icon: AlertTriangle, path: '/stock-alerts' },
      isAdmin(role) && { label: 'Achats (Réappro)', icon: Truck, path: '/achats' },
    ].filter(Boolean),
  },
  {
    label: 'Relation',
    show: can.accessClients(role) || can.accessEmployes(role),
    items: [
      can.accessClients(role) && { label: 'Clients', icon: Users, path: '/clients' },
      isAdmin(role) && { label: 'Fournisseurs', icon: Factory, path: '/fournisseurs' },
      can.accessEmployes(role) && { label: 'Employés', icon: UserCog, path: '/employes' },
    ].filter(Boolean),
  },
  {
    label: 'Système',
    show: true,
    items: [
      can.accessParametres(role) && { label: 'Paramètres', icon: Settings, path: '/settings' },
      { label: 'Profil', icon: User, path: '/profil' },
    ].filter(Boolean),
  },
];

return (
  <nav>
    {groups.filter(g => g.show && g.items.length > 0).map(g => (
      <div key={g.label}>
        <p className="px-3 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">{g.label}</p>
        <div className="space-y-1">{renderNavItems(g.items)}</div>
      </div>
    ))}
  </nav>
);
```

### Chantier 3.3 — Suppression des mocks

```bash
# À supprimer :
rm Font-end-admin/.../src/components/Addresses.tsx
rm Font-end-admin/.../src/components/Invoices.tsx
rm Font-end-admin/.../src/components/Support.tsx
rm Font-end-admin/.../src/components/PlaceholderPage.tsx
```

#### Modifier `App.tsx` :
- Supprimer imports `Invoices`, `Addresses`, `Support`
- Supprimer routes `/invoices`, `/addresses`, `/support`

### Chantier 3.4 — Page POS Vendeur

#### Créer : `Font-end-admin/.../src/components/POSVendeur.tsx`

Spec :
- Layout 2 colonnes : à gauche recherche produits + grille, à droite panier en cours
- Recherche par nom/code → résultats avec ajout au panier (+1)
- Panier : produit, quantité, sous-total, total
- Champ optionnel « Nom client » + « Téléphone client »
- Bouton « Envoyer au caissier » → POST `/api/tickets`
- Après envoi : toast succès, redirection vers `/mes-tickets` montrant le ticket en attente avec compte à rebours 15 min
- Vendeur peut annuler un ticket en attente depuis cet écran

### Chantier 3.5 — Page File caissier

#### Créer : `Font-end-admin/.../src/components/FileCaissier.tsx`

Spec :
- Liste des tickets en attente (auto-refresh toutes les 10s)
- Carte par ticket : numéro, vendeur, nom client, montant, compte à rebours (passe en rouge < 3 min)
- Clic sur carte → ouvre modal « Encaisser »
- Modal : récap ligne par ligne + sélecteur méthode paiement (ESPECES / MOBILE_MONEY / CARTE / VIREMENT) + bouton « Encaisser »
- Après encaissement : toast succès, ticket disparait de la file, opération créée dans caisse du jour
- Indicateur en haut : solde caisse du jour en temps réel + bouton « Fermer la caisse » (visible seulement si CAISSIER ou ADMIN)

### Critères d'acceptation Phase 3
- [ ] Un compte CAISSIER ne voit que : Caisse du jour, File d'attente, Profil
- [ ] Un compte VENDEUR ne voit que : Vente en cours, Mes tickets, Commandes en ligne, Clients, Produits (sans prix achat), Profil
- [ ] Un compte ADMIN voit tout sauf Employés, Paramètres
- [ ] SUPER_ADMIN voit tout
- [ ] Aucun lien sidebar mort
- [ ] Plus aucune référence à Addresses/Invoices/Support

---

## PHASE 4 — Dashboard split

### Chantier 4.1 — Dashboard épuré

#### Modifier : `Font-end-admin/.../src/components/Dashboard.tsx`

Refonte pour qu'il contienne UNIQUEMENT :

```typescript
<div className="space-y-6">
  {/* 4 KPIs en gros */}
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <KpiCard icon={Wallet} label="Caisse du jour" value={fmt(soldeCaisseJour)} />
    <KpiCard icon={Landmark} label="Caisse globale" value={fmt(soldeCaisseGlobale)} />
    <KpiCard icon={ShoppingCart} label="Commandes en ligne" value={`${nbCommandesEnAttente}`} sub="en attente" />
    <KpiCard icon={Receipt} label="Tickets boutique" value={`${nbTickets}`} sub="à encaisser" />
  </div>

  {/* Actions urgentes */}
  <div className="bg-white rounded-2xl p-6 border border-slate-200">
    <h3>🔔 Actions urgentes</h3>
    <ul>
      {actionsUrgentes.map(a => <ActionItem key={a.id} {...a} />)}
    </ul>
  </div>

  {/* Échéances à venir 7j */}
  <EcheancesAvenir limit={5} />
</div>
```

**Supprimer** du Dashboard :
- Tous les graphes Recharts
- Top produits
- Dernières commandes
- Alertes stock détaillées

### Chantier 4.2 — Nouvelle page `/analyses`

#### Créer : `Font-end-admin/.../src/components/Analyses.tsx`

Spec :
- Filtre période en haut : `Aujourd'hui / 7j / 30j / 90j / Mois en cours / Trimestre en cours / Année à date / Personnalisé`
- 4 KPIs avec comparaison vs période précédente : CA, Commandes, Panier moyen, Marge brute
- LineChart : Évolution CA dans le temps
- BarChart : Top 10 produits
- PieChart : Répartition ventes par canal (Boutique vs E-commerce)
- BarChart : Évolution coffres (montants alloués/dépensés)
- Heatmap : Heures de pointe boutique (jour × heure)

#### Créer endpoint backend : `GET /api/analyses?from=…&to=…`
Retourne un objet `{ kpis, evolutionCA, topProduits, repartitionCanal, evolutionCoffres, heatmap }`.

#### Modifier `App.tsx` :
```tsx
<Route path="analyses" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}><Analyses /></RoleProtectedRoute>} />
```

### Critères d'acceptation Phase 4
- [ ] Dashboard tient sur un écran sans scroll (1080p)
- [ ] Dashboard chargé en < 1s
- [ ] Page Analyses accessible seulement SUPER_ADMIN + ADMIN
- [ ] Filtre période modifie tous les graphes en cascade
- [ ] Heatmap affiche les heures de pointe (lundi 14h, mardi 14h, etc.)

---

## PHASE 5 — Polish & cohérence

### Chantier 5.1 — Utilitaires de formatage

#### Créer : `Font-end-admin/.../src/utils/format.ts`

```typescript
export const fmtFCFA = (n: number | string | null | undefined): string => {
  if (n == null) return '— FCFA';
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(num)) return '— FCFA';
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
    .format(num)
    .replace(/\s/g, ' ') + ' FCFA';
};

export const fmtDateLong = (d: Date | string): string => {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  }).format(date);
};

export const fmtDateCourt = (d: Date | string): string => {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(date);
};

export const fmtHeure = (d: Date | string): string => {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit', minute: '2-digit', hour12: false
  }).format(date).replace(':', 'h');
};
```

#### Remplacer dans tous les composants :
- `montant.toLocaleString() + ' FCFA'` → `fmtFCFA(montant)`
- `new Date(d).toLocaleDateString()` → `fmtDateCourt(d)` ou `fmtDateLong(d)`
- Toutes les chaînes en anglais → français

### Chantier 5.2 — Composants UI unifiés

#### Créer : `Font-end-admin/.../src/components/ui/`
- `Button.tsx` (3 variantes : primary, secondary, danger)
- `EmptyState.tsx` (icône + message + action)
- `Toast.tsx` (succès vert / erreur rouge / info bleu / warning ambre)
- `ConfirmDialog.tsx` (avec saisie nom pour destructif)

#### Remplacer les anciennes implémentations boutons/empty states/toasts par ces composants.

### Chantier 5.3 — Page gestion employés

#### Créer : `Font-end-admin/.../src/components/Employes.tsx`

Spec (SUPER_ADMIN uniquement) :
- Liste des employés (table) : photo, nom, username, rôle, statut (actif/inactif), dernière connexion
- Bouton « Ajouter un employé » → modal :
  - Nom complet (texte)
  - Nom d'utilisateur (texte, unique, validation côté serveur)
  - Rôle (select : SUPER_ADMIN / ADMIN / CAISSIER / VENDEUR)
  - Si CAISSIER ou VENDEUR → champ PIN (4–6 chiffres) ; sinon → champ Mot de passe (8+ caractères)
  - Email (optionnel)
  - Photo (upload Cloudinary, optionnel)
- Clic sur ligne → vue détaillée avec :
  - Édition champs ci-dessus
  - Bouton « Changer le rôle » → modal avec ancien rôle, nouveau rôle, motif optionnel
  - Bouton « Désactiver » (toggle `isActive`)
  - Onglet « Historique des rôles » (depuis `RoleHistory`)
  - Onglet « Journal d'activité » (depuis `ActivityLog`)

#### Créer endpoint backend : `Back-end/src/employes/employes.controller.ts`

```typescript
@Controller('employes')
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class EmployesController {
  @Get() list() {…}
  @Post() create(@Body() dto: CreateEmployeDto) {…}
  @Get(':id') one(@Param('id') id: string) {…}
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateEmployeDto) {…}
  @Patch(':id/role') changeRole(@Param('id') id: string, @Body() dto: ChangeRoleDto, @CurrentUser() user) {
    // Insertion RoleHistory + update du user
  }
  @Patch(':id/toggle-active') toggleActive(@Param('id') id: string) {…}
  @Get(':id/activity') activity(@Param('id') id: string, @Query('limit') limit?: number) {…}
}
```

### Chantier 5.4 — Routes finales

#### Modifier : `App.tsx`

Routes finales :
```tsx
<Routes>
  <Route path="/login" element={<AdminLogin />} />
  <Route path="/" element={<AdminProtectedRoute><Layout /></AdminProtectedRoute>}>
    <Route index element={<Dashboard />} />
    <Route path="analyses" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN','ADMIN']}><Analyses /></RoleProtectedRoute>} />
    <Route path="notifications" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN','ADMIN']}><NotificationsPage /></RoleProtectedRoute>} />

    <Route path="caisse-jour" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN','ADMIN','CAISSIER']}><CaisseJour /></RoleProtectedRoute>} />
    <Route path="caisse" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN','ADMIN']}><CaisseGlobale /></RoleProtectedRoute>} />
    <Route path="coffres" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN','ADMIN']}><Coffres /></RoleProtectedRoute>} />
    <Route path="echeances" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN','ADMIN']}><Echeances /></RoleProtectedRoute>} />

    <Route path="pos" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN','ADMIN','VENDEUR']}><POSVendeur /></RoleProtectedRoute>} />
    <Route path="file-caissier" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN','ADMIN','CAISSIER']}><FileCaissier /></RoleProtectedRoute>} />
    <Route path="tickets" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN','ADMIN']}><TicketsJour /></RoleProtectedRoute>} />

    <Route path="orders" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN','ADMIN','VENDEUR']}><Orders /></RoleProtectedRoute>} />

    <Route path="produits" element={<Produits />} />
    <Route path="categories" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN','ADMIN']}><Categories /></RoleProtectedRoute>} />
    <Route path="attributs" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN','ADMIN']}><Attributs /></RoleProtectedRoute>} />
    <Route path="stock" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN','ADMIN']}><MouvementsStock /></RoleProtectedRoute>} />
    <Route path="stock-alerts" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN','ADMIN']}><StockAlerts /></RoleProtectedRoute>} />
    <Route path="achats" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN','ADMIN']}><Achats /></RoleProtectedRoute>} />

    <Route path="clients" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN','ADMIN','VENDEUR']}><Clients /></RoleProtectedRoute>} />
    <Route path="fournisseurs" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN','ADMIN']}><Fournisseurs /></RoleProtectedRoute>} />
    <Route path="employes" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN']}><Employes /></RoleProtectedRoute>} />

    <Route path="settings" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN']}><Settings /></RoleProtectedRoute>} />
    <Route path="profil" element={<Profil />} />
  </Route>
</Routes>
```

Supprimer routes : `/invoices`, `/addresses`, `/support`, `/comptes` (remplacée par `/employes`), `/roles` (intégrée dans `/employes`), `/ventes` (intégrée dans `/tickets` et caisse).

### Critères d'acceptation Phase 5
- [ ] Tous les montants utilisent `fmtFCFA()` — aucune occurrence de `€` ou `.toLocaleString()` brut
- [ ] Toutes les dates utilisent `fmtDateLong()` ou `fmtDateCourt()`
- [ ] Aucune chaîne en anglais dans les pages actives
- [ ] Page Employés permet création, édition, changement rôle, désactivation
- [ ] Confirmation destructive demande la saisie du nom

---

## CHECKLIST GLOBALE DE LIVRAISON

### Backend
- [ ] Migration `20260601_refonte_roles_auth` appliquée
- [ ] Migration `20260601_caisse_jour` appliquée
- [ ] Migration `20260601_tickets_vente` appliquée
- [ ] `ensure-schema.js` étendu idempotent pour tous les nouveaux objets
- [ ] Endpoints `/admin/auth/login` (username), `/admin/auth/login-pin`, `/caisse-jour/*`, `/tickets/*`, `/employes/*`, `/analyses` tous testés
- [ ] Crons `19h00 caisse non fermée` et `*/1min tickets expirés` actifs
- [ ] Activity logs créées sur chaque login

### Frontend admin
- [ ] Login refondu (mot de passe + PIN, message session expirée)
- [ ] Sidebar 7 groupes avec filtrage rôle stricte
- [ ] Pages mock supprimées (Addresses, Invoices, Support, PlaceholderPage)
- [ ] POSVendeur, FileCaissier, CaisseJour, CaisseGlobale, TicketsJour, Analyses, Employes, Profil créées
- [ ] Dashboard épuré (≤ 1 écran)
- [ ] Tous formats FR (FCFA, dates, accents)
- [ ] Composants UI unifiés (Button, EmptyState, Toast, ConfirmDialog)

### Tests manuels par rôle
- [ ] **SUPER_ADMIN** : voit tout, peut tout, supprime échéances/produits, annule transactions, gère employés
- [ ] **ADMIN** : voit tout sauf Employés/Paramètres, ne peut pas supprimer ni annuler
- [ ] **CAISSIER** : voit uniquement Caisse du jour + File d'attente + Profil ; encaisse les tickets, fait des sorties, ferme la caisse
- [ ] **VENDEUR** : voit uniquement Vente en cours + Mes tickets + Commandes en ligne + Clients + Produits (sans prix achat) + Profil ; crée tickets, ne voit pas le solde caisse

### Documentation
- [ ] Mettre à jour `ARCHITECTURE.md` avec les nouveaux modèles
- [ ] Créer `LIVRAISON_4_RAPPORT.md` après implémentation avec captures

---

## ORDRE D'EXÉCUTION RECOMMANDÉ POUR CODEX

1. **Chantier 1.1** — migration Prisma rôles + `RoleHistory` + `ActivityLog` (le plus risqué, à valider en local d'abord)
2. **Chantier 1.2** — backend auth username/PIN
3. **Chantier 1.3** — frontend login
4. **Chantier 2.1** — `CaisseJour` backend (migration + service + controller + cron)
5. **Chantier 2.2** — `TicketVente` backend
6. **Chantier 3.1, 3.2, 3.3** — `permissions.ts` + Sidebar + suppression mocks (frontend rapide)
7. **Chantier 3.4, 3.5** — Pages POSVendeur + FileCaissier
8. **Chantier 4.1, 4.2** — Dashboard épuré + page Analyses
9. **Chantier 5.1, 5.2** — utilitaires format + composants UI
10. **Chantier 5.3** — page Employés (gros morceau, à faire en dernier)
11. **Chantier 5.4** — finaliser App.tsx

**Total estimé** : 8–10 sessions Codex.

**Commit après chaque chantier** avec message clair (ex. `feat(auth): refonte login username + PIN boutique`).

---

## NOTES POUR CODEX

- **Toujours faire tourner les migrations en local d'abord** (`npx prisma migrate dev`) avant push
- **Ne jamais utiliser `prisma db push` en prod** — uniquement `prisma migrate deploy`
- **Backups Railway** : avant migration 1.1, faire un dump de la base prod
- **Pré-test** : créer un script seed `prisma/seed.ts` qui crée un compte SUPER_ADMIN, un ADMIN, un CAISSIER (PIN 1234), un VENDEUR (PIN 5678) pour pouvoir tester les 4 rôles immédiatement
- **Sécurité** : `pinCode` doit être hashé avec `bcrypt` (cost 10), jamais stocké en clair
- **Si erreur P2002** sur username à la création → renvoyer 409 Conflict avec message clair
- **Tests** : ajouter au minimum 1 spec par nouveau service (caisse-jour, ticket-vente, employes)
