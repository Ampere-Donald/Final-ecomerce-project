# Livraison 3 — Échéances + Moteur d'alertes + CRON (implémentée par Claude)

Date: 2026-05-28
Auteur: Claude (implémentation directe, crédits Codex épuisés)

## 1. Fichiers créés / modifiés

### Schéma & migration
- `Back-end/prisma/schema.prisma` — enums `RecurrenceEcheance`, `TypeAlerte`; valeur `ECHEANCE` ajoutée à `TypeNotification`; modèles `Echeance` et `AlerteEcheance`; relation `Coffre.echeances`.
- `Back-end/prisma/migrations/20260528090000_add_echeances_alertes/migration.sql` — migration créée (NON appliquée sur Railway, voir §4).
- `Back-end/scripts/ensure-schema.js` — ajouts idempotents (enums, tables, index, FK) pour la prod.

### Backend
- `Back-end/src/echeance/echeance.module.ts` (nouveau)
- `Back-end/src/echeance/echeance.controller.ts` (nouveau)
- `Back-end/src/echeance/echeance.service.ts` (nouveau — CRUD + moteur d'alertes + calcul de dates)
- `Back-end/src/echeance/echeance-scheduler.service.ts` (nouveau — CRON quotidien)
- `Back-end/src/echeance/dto/create-echeance.dto.ts` (nouveau)
- `Back-end/src/echeance/dto/update-echeance.dto.ts` (nouveau)
- `Back-end/src/echeance/echeance.service.spec.ts` (nouveau — tests unitaires)
- `Back-end/src/auth/mail.service.ts` — ajout d'une méthode générique `sendMail(to, subject, html)`.
- `Back-end/src/app.module.ts` — `ScheduleModule.forRoot()` + `EcheanceModule`.
- `Back-end/package.json` — dépendance `@nestjs/schedule` ajoutée.

### Dashboard admin
- `Font-end-admin/.../src/services/api.ts` — `echeanceApi`.
- `Font-end-admin/.../src/components/Echeances.tsx` (nouveau — page complète).
- `Font-end-admin/.../src/components/Dashboard.tsx` — carte « Échéances à venir ».
- `Font-end-admin/.../src/components/Sidebar.tsx` — entrée de menu « Échéances ».
- `Font-end-admin/.../src/App.tsx` — route `/echeances` (SUPER_ADMIN, ADMIN).
- `Font-end-admin/.../src/utils/permissions.ts` — `can.accessEcheances`.

## 2. Endpoints finaux (guards AdminAuthGuard + RolesGuard)

| Route | Rôles | Description |
| --- | --- | --- |
| `POST /api/echeances` | SUPER_ADMIN, ADMIN | Crée une échéance |
| `GET /api/echeances` | SUPER_ADMIN, ADMIN | Liste toutes les échéances |
| `GET /api/echeances/a-venir?jours=30` | SUPER_ADMIN, ADMIN | Échéances actives à venir (fenêtre) |
| `GET /api/echeances/:id` | SUPER_ADMIN, ADMIN | Détail + historique des alertes + solde coffre/manque |
| `PATCH /api/echeances/:id` | SUPER_ADMIN, ADMIN | Modifie / active-désactive |
| `DELETE /api/echeances/:id` | SUPER_ADMIN | Supprime (cascade sur alertes) |
| `POST /api/echeances/:id/declencher` | SUPER_ADMIN, ADMIN | Déclenchement manuel d'une alerte |

CRON : `@Cron('0 7 * * *', { timeZone: 'Africa/Douala' })` → `processDailyAlerts()`.

## 3. Logique implémentée

- Échéance liée à un coffre OU indépendante (coffreId nullable). Si liée, le message d'alerte calcule le manque vs `montantCible` (ou objectif du coffre).
- Récurrence auto : à la date passée, RETARD émis puis la prochaine date est recalculée (MENSUELLE/TRIMESTRIELLE/ANNUELLE, clamp fin de mois) ; les UNIQUE passent `active=false`.
- Alertes : RAPPEL (joursRestants ∈ joursAlerteAvant), URGENT (jour J), RETARD (après).
- Notification in-app (type `ECHEANCE`, visible par tous les admins) + email **SUPER_ADMIN actifs uniquement** via Nodemailer.
- Idempotence : contrainte unique `(echeanceId, type, jour_emission)` → le CRON peut tourner plusieurs fois sans doublon. Le déclenchement manuel peut ré-émettre.
- Comparaison des dates au niveau du jour, fuseau Africa/Douala.

## 4. Vérifications

- `Back-end` : `npm run build` → OK ; `npm test -- --runInBand` → **20 tests / 6 suites OK** (dont 9 nouveaux pour échéances).
- `Front-end-admin` : `npm run build` (Vite) → OK ; `tsc --noEmit` / `npm run lint` → OK.
- `@nestjs/schedule` installé (4 paquets ajoutés).

### ⚠️ Migration NON appliquée sur Railway
Pour ne pas toucher la prod, la migration a été créée mais pas déployée. À appliquer quand prêt :
```
cd Back-end
npx prisma migrate deploy
```
Le script `ensure-schema.js` créera aussi ces objets au démarrage du conteneur en prod (idempotent).

### Pré-requis email
Les emails SUPER_ADMIN nécessitent `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` (sinon log console). Les notifications in-app fonctionnent sans SMTP.

## 5. Points d'attention
- Le test end-to-end réel n'a pas été exécuté (pas de DB locale lancée) ; logique couverte par tests unitaires.
- Aucune dépendance frontend ajoutée. Frontend client (`Font-end/`) non modifié.
- Carte Dashboard ajoutée sans toucher aux KPIs L1 ni à la carte trésorerie L2.
