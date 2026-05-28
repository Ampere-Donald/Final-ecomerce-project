# Rapport - Reconciliation Prisma migrations

Date: 2026-05-28  
Projet: NEWOTEG / Back-end NestJS + Prisma 7 + PostgreSQL Railway

## 1. Diagnostic

Commande de statut initiale:

```bash
cd Back-end
npx prisma migrate status
```

Resultat initial:

- Prisma voyait 10 migrations locales.
- La base Railway contenait 12 migrations appliquees.
- `migrate status` indiquait "Database schema is up to date", mais `migrate dev --create-only` detectait ensuite des migrations appliquees absentes localement.

Migrations presentes en base mais absentes du dossier local:

| Migration | Etat base |
| --- | --- |
| `20260422070112_add_prix_achat_parametres_tarif` | appliquee |
| `20260424000000_revert_pricing_coefficients` | appliquee |

Requete de controle utilisee:

```sql
SELECT migration_name, finished_at, applied_steps_count, rolled_back_at
FROM _prisma_migrations
ORDER BY finished_at;
```

Ecarts de schema constates autour de ces migrations:

- `client.otp_code` est en `text` dans la base et dans `schema.prisma`.
- `notification.actor_id`, `notification.actor_name`, `notification.actor_role` existent en base et dans `schema.prisma`.
- `TypeNotification` contient les valeurs supplementaires deja presentes en base et dans `schema.prisma`.

## 2. Corrections appliquees

### Restauration des migrations manquantes

Fichiers ajoutes:

- `Back-end/prisma/migrations/20260422070112_add_prix_achat_parametres_tarif/migration.sql`
- `Back-end/prisma/migrations/20260424000000_revert_pricing_coefficients/migration.sql`

Contenu fonctionnel restaure:

- Passage de `client.otp_code` en `TEXT`.
- Ajout de `notification.actor_id`.
- Ajout de `notification.actor_name VARCHAR(100)`.
- Ajout de `notification.actor_role VARCHAR(20)`.
- Ajout des valeurs manquantes dans l'enum `TypeNotification`.
- Deuxieme migration restauree comme no-op documente, car l'etat final apres revert est deja represente par la premiere migration reconstruite et le schema Prisma actuel.

Comme les fichiers originaux n'etaient pas disponibles dans Git, Prisma a signale un checksum different pour ces deux migrations. Les checksums de ces deux lignes ont ete alignes dans `_prisma_migrations` sur les fichiers reconstruits. Cette operation a modifie uniquement la metadata Prisma, sans drop, truncate, reset, ni modification de donnees metier.

### Alignement final coffre

Le controle `npx prisma migrate dev --create-only --name verify_reconciliation` a revele un ecart reel supplementaire:

```sql
ALTER TABLE "coffre" ALTER COLUMN "updated_at" DROP DEFAULT;
```

Migration ajoutee et appliquee:

- `Back-end/prisma/migrations/20260528084053_align_coffre_updated_at_default/migration.sql`

Raison:

- `schema.prisma` declare `updatedAt @updatedAt` sans `@default(now())`.
- La base avait encore `DEFAULT CURRENT_TIMESTAMP`.
- La migration supprime uniquement le default SQL sur la colonne, sans perte de donnees.

## 3. Verification

Commandes executees avec succes:

```bash
cd Back-end
npx prisma migrate status
npx prisma generate
npm run build
npx prisma migrate dev --create-only --name verify_reconciliation_final
```

Resultat final:

- `npx prisma migrate status`: 13 migrations locales, base a jour.
- `npx prisma generate`: succes.
- `npm run build`: succes.
- `migrate dev --create-only`: a seulement genere une migration vide de verification; elle a ete supprimee.

## 4. Cas non corriges / decisions humaines

Aucun cas bloquant restant.

Notes:

- Aucune commande destructive n'a ete lancee.
- Aucun `migrate reset`, `db push --force-reset`, `DROP TABLE`, `TRUNCATE`, ni suppression de donnees.
- Le fichier de consigne `PRISMA_RECONCILIATION_MIGRATIONS.md` n'a pas ete modifie.
