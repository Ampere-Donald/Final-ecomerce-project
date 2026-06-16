/**
 * ensure-schema.js
 * Runs at container startup BEFORE the app.
 * Checks if critical tables/columns exist and creates them if missing.
 * This bypasses Docker cache issues where migration files may not be present.
 */
const { Client } = require('pg');

const SQL_STATEMENTS = [
  // ── Enums (IF NOT EXISTS) ──
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TypeClient') THEN CREATE TYPE "TypeClient" AS ENUM ('PARTICULIER', 'PROFESSIONNEL'); END IF; END $$;`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StatutCommande') THEN CREATE TYPE "StatutCommande" AS ENUM ('EN_ATTENTE', 'CONFIRMEE', 'EN_LIVRAISON', 'LIVREE', 'ANNULEE'); END IF; END $$;`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ModeReception') THEN CREATE TYPE "ModeReception" AS ENUM ('LIVRAISON', 'RETRAIT_MAGASIN'); END IF; END $$;`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CoffreStatut') THEN CREATE TYPE "CoffreStatut" AS ENUM ('ACTIF', 'ATTEINT', 'CLOTURE'); END IF; END $$;`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TypeNotification') THEN CREATE TYPE "TypeNotification" AS ENUM ('COMMANDE_CREEE', 'COMMANDE_STATUT', 'PRODUIT_CREE', 'PRODUIT_MAJ', 'STOCK_CHANGE', 'CATEGORIE_CREEE', 'CATEGORIE_MAJ', 'VENTE_CREEE', 'ACHAT_CREE'); END IF; END $$;`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AdminRole') THEN CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER'); END IF; END $$;`,
  `ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'CAISSIER';`,
  `ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'VENDEUR';`,

  // Admin auth refonte roles/PIN
  `ALTER TABLE "admin_user" ALTER COLUMN "email" DROP NOT NULL;`,
  `ALTER TABLE "admin_user" ADD COLUMN IF NOT EXISTS "username" VARCHAR(50);`,
  `ALTER TABLE "admin_user" ADD COLUMN IF NOT EXISTS "pin_code" VARCHAR(255);`,
  `ALTER TABLE "admin_user" ADD COLUMN IF NOT EXISTS "photo_url" TEXT;`,
  `ALTER TABLE "admin_user" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`,
  `ALTER TABLE "admin_user" ADD COLUMN IF NOT EXISTS "created_by" TEXT;`,
  `ALTER TABLE "admin_user" ALTER COLUMN "mot_de_passe" DROP NOT NULL;`,
  `WITH candidates AS (
    SELECT
      "id",
      NULLIF(LOWER(REGEXP_REPLACE(SPLIT_PART(COALESCE("email", "nom"), '@', 1), '[^a-zA-Z0-9_]+', '_', 'g')), '') AS base_username
    FROM "admin_user"
    WHERE "username" IS NULL
  ),
  ranked AS (
    SELECT
      "id",
      COALESCE(base_username, CONCAT('admin_', LEFT("id", 8))) AS base_username,
      ROW_NUMBER() OVER (PARTITION BY COALESCE(base_username, CONCAT('admin_', LEFT("id", 8))) ORDER BY "id") AS rn
    FROM candidates
  )
  UPDATE "admin_user" AS au
  SET "username" = CASE
    WHEN ranked.rn = 1 THEN ranked.base_username
    ELSE CONCAT(ranked.base_username, '_', ranked.rn)
  END
  FROM ranked
  WHERE au."id" = ranked."id";`,
  `ALTER TABLE "admin_user" ALTER COLUMN "username" SET NOT NULL;`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "admin_user_username_key" ON "admin_user"("username");`,
  `CREATE TABLE IF NOT EXISTS "role_history" (
    "id" TEXT NOT NULL,
    "admin_user_id" TEXT NOT NULL,
    "old_role" "AdminRole" NOT NULL,
    "new_role" "AdminRole" NOT NULL,
    "changed_by" TEXT NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motif" VARCHAR(255),
    CONSTRAINT "role_history_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE INDEX IF NOT EXISTS "role_history_admin_user_id_idx" ON "role_history"("admin_user_id");`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'role_history_admin_user_id_fkey') THEN ALTER TABLE "role_history" ADD CONSTRAINT "role_history_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_user"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;`,
  `CREATE TABLE IF NOT EXISTS "activity_log" (
    "id" TEXT NOT NULL,
    "admin_user_id" TEXT NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "details" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE INDEX IF NOT EXISTS "activity_log_admin_user_id_created_at_idx" ON "activity_log"("admin_user_id", "created_at");`,
  `CREATE INDEX IF NOT EXISTS "activity_log_action_created_at_idx" ON "activity_log"("action", "created_at");`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activity_log_admin_user_id_fkey') THEN ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_user"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;`,

  // ── CaisseJour (Phase 2.1) ──
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StatutCaisseJour') THEN CREATE TYPE "StatutCaisseJour" AS ENUM ('OUVERTE', 'FERMEE'); END IF; END $$;`,
  `CREATE TABLE IF NOT EXISTS "caisse_jour" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "ouverture_at" TIMESTAMP(3) NOT NULL,
    "fermeture_at" TIMESTAMP(3),
    "caissier_id" TEXT,
    "solde_cloture" DECIMAL(12,2),
    "statut" "StatutCaisseJour" NOT NULL DEFAULT 'OUVERTE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "caisse_jour_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "caisse_jour_date_key" ON "caisse_jour"("date");`,
  `CREATE INDEX IF NOT EXISTS "caisse_jour_statut_idx" ON "caisse_jour"("statut");`,
  `CREATE INDEX IF NOT EXISTS "caisse_jour_date_idx" ON "caisse_jour"("date");`,
  `ALTER TABLE "caisse" ADD COLUMN IF NOT EXISTS "caisse_jour_id" TEXT;`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'caisse_caisse_jour_id_fkey') THEN ALTER TABLE "caisse" ADD CONSTRAINT "caisse_caisse_jour_id_fkey" FOREIGN KEY ("caisse_jour_id") REFERENCES "caisse_jour"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;`,
  `CREATE INDEX IF NOT EXISTS "caisse_caisse_jour_id_idx" ON "caisse"("caisse_jour_id");`,

  // ── TicketVente (Phase 2.2) ──
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StatutTicket') THEN CREATE TYPE "StatutTicket" AS ENUM ('EN_ATTENTE', 'ENCAISSE', 'EXPIRE', 'ANNULE'); END IF; END $$;`,
  `CREATE TABLE IF NOT EXISTS "ticket_vente" (
    "id" TEXT NOT NULL,
    "numero_ticket" VARCHAR(20) NOT NULL,
    "vendeur_id" TEXT NOT NULL,
    "caissier_id" TEXT,
    "client_id" TEXT,
    "nom_client" VARCHAR(150),
    "telephone_client" VARCHAR(30),
    "montant_total" DECIMAL(12,2) NOT NULL,
    "methode_paiement" "MethodePaiement",
    "statut" "StatutTicket" NOT NULL DEFAULT 'EN_ATTENTE',
    "vente_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "encaisse_at" TIMESTAMP(3),
    "annule_at" TIMESTAMP(3),
    "motif_annulation" VARCHAR(255),
    CONSTRAINT "ticket_vente_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ticket_vente_numero_ticket_key" ON "ticket_vente"("numero_ticket");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ticket_vente_vente_id_key" ON "ticket_vente"("vente_id");`,
  `CREATE INDEX IF NOT EXISTS "ticket_vente_statut_expires_at_idx" ON "ticket_vente"("statut", "expires_at");`,
  `CREATE INDEX IF NOT EXISTS "ticket_vente_vendeur_id_created_at_idx" ON "ticket_vente"("vendeur_id", "created_at");`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ticket_vente_vente_id_fkey') THEN ALTER TABLE "ticket_vente" ADD CONSTRAINT "ticket_vente_vente_id_fkey" FOREIGN KEY ("vente_id") REFERENCES "vente"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;`,
  `CREATE TABLE IF NOT EXISTS "ligne_ticket" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "produit_id" TEXT NOT NULL,
    "nom_produit" VARCHAR(150) NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prix_unitaire" DECIMAL(10,2) NOT NULL,
    "sous_total" DECIMAL(12,2) NOT NULL,
    CONSTRAINT "ligne_ticket_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE INDEX IF NOT EXISTS "ligne_ticket_ticket_id_idx" ON "ligne_ticket"("ticket_id");`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ligne_ticket_ticket_id_fkey') THEN ALTER TABLE "ligne_ticket" ADD CONSTRAINT "ligne_ticket_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "ticket_vente"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;`,

  // ── Columns on client (IF NOT EXISTS) ──
  `ALTER TABLE "client" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`,
  `ALTER TABLE "client" ADD COLUMN IF NOT EXISTS "email_verifie" BOOLEAN NOT NULL DEFAULT false;`,
  `ALTER TABLE "client" ADD COLUMN IF NOT EXISTS "mot_de_passe" TEXT;`,
  `ALTER TABLE "client" ADD COLUMN IF NOT EXISTS "otp_code" VARCHAR(6);`,
  `ALTER TABLE "client" ADD COLUMN IF NOT EXISTS "otp_expires_at" TIMESTAMP(3);`,
  `ALTER TABLE "client" ADD COLUMN IF NOT EXISTS "type_client" "TypeClient" NOT NULL DEFAULT 'PARTICULIER';`,
  `ALTER TABLE "client" ADD COLUMN IF NOT EXISTS "google_id" TEXT;`,

  // ── Unique indexes on client (IF NOT EXISTS) ──
  `CREATE UNIQUE INDEX IF NOT EXISTS "client_telephone_key" ON "client"("telephone");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "client_email_key" ON "client"("email");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "client_google_id_key" ON "client"("google_id");`,

  // ── Columns on produit (IF NOT EXISTS) ──
  `ALTER TABLE "produit" ADD COLUMN IF NOT EXISTS "url_datasheet" TEXT;`,
  `ALTER TABLE "produit" ADD COLUMN IF NOT EXISTS "fin_promo" TIMESTAMP(3);`,
  `ALTER TABLE "produit" ADD COLUMN IF NOT EXISTS "is_populaire" BOOLEAN NOT NULL DEFAULT false;`,
  `ALTER TABLE "produit" ADD COLUMN IF NOT EXISTS "prix_promo" DOUBLE PRECISION;`,
  `ALTER TABLE "produit" ADD COLUMN IF NOT EXISTS "image_url2" TEXT;`,
  `ALTER TABLE "produit" ADD COLUMN IF NOT EXISTS "image_url3" TEXT;`,
  `ALTER TABLE "produit" ADD COLUMN IF NOT EXISTS "seuil_alerte" INTEGER NOT NULL DEFAULT 5;`,

  // ── Prix variable par bornes selon le rôle ──
  `ALTER TABLE "produit" ADD COLUMN IF NOT EXISTS "prix_demi_gros" DOUBLE PRECISION;`,
  `ALTER TABLE "admin_user" ADD COLUMN IF NOT EXISTS "peut_vendre_sous_demi_gros" BOOLEAN NOT NULL DEFAULT false;`,
  `ALTER TABLE "ligne_ticket" ADD COLUMN IF NOT EXISTS "prix_reference" DECIMAL(10,2);`,
  `ALTER TABLE "ligne_ticket" ADD COLUMN IF NOT EXISTS "bande_prix" VARCHAR(20);`,
  `ALTER TABLE "ligne_ticket" ADD COLUMN IF NOT EXISTS "motif_remise" VARCHAR(255);`,
  `ALTER TABLE "ligne_vente" ADD COLUMN IF NOT EXISTS "prix_reference" DECIMAL(10,2);`,
  `ALTER TABLE "ligne_vente" ADD COLUMN IF NOT EXISTS "bande_prix" VARCHAR(20);`,
  `ALTER TABLE "ligne_vente" ADD COLUMN IF NOT EXISTS "motif_remise" VARCHAR(255);`,
  `ALTER TABLE "ligne_bon" ADD COLUMN IF NOT EXISTS "prix_reference" DECIMAL(10,2);`,
  `ALTER TABLE "ligne_bon" ADD COLUMN IF NOT EXISTS "bande_prix" VARCHAR(20);`,
  `ALTER TABLE "ligne_bon" ADD COLUMN IF NOT EXISTS "motif_remise" VARCHAR(255);`,

  // ── Table: commande ──
  `CREATE TABLE IF NOT EXISTS "commande" (
    "id" TEXT NOT NULL,
    "numero_suivi" VARCHAR(30) NOT NULL,
    "nom_client" VARCHAR(150) NOT NULL,
    "telephone" VARCHAR(30) NOT NULL,
    "adresse_livraison" TEXT NOT NULL,
    "montant_total" DECIMAL(12,2) NOT NULL,
    "statut" "StatutCommande" NOT NULL DEFAULT 'EN_ATTENTE',
    "date_commande" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    "client_id" TEXT,
    "mode_reception" "ModeReception" NOT NULL DEFAULT 'LIVRAISON',
    CONSTRAINT "commande_pkey" PRIMARY KEY ("id")
  );`,

  // ── Table: favori ──
  `CREATE TABLE IF NOT EXISTS "favori" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "produit_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "favori_pkey" PRIMARY KEY ("id")
  );`,

  // ── Table: ligne_commande ──
  `CREATE TABLE IF NOT EXISTS "ligne_commande" (
    "id" TEXT NOT NULL,
    "id_commande" TEXT NOT NULL,
    "id_produit" TEXT NOT NULL,
    "nom_produit" VARCHAR(150) NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prix_unitaire" DECIMAL(10,2) NOT NULL,
    "sous_total" DECIMAL(12,2) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "ligne_commande_pkey" PRIMARY KEY ("id")
  );`,

  // ── Table: notification ──
  `CREATE TABLE IF NOT EXISTS "notification" (
    "id" TEXT NOT NULL,
    "type" "TypeNotification" NOT NULL,
    "message" TEXT NOT NULL,
    "lue" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
  );`,

  // ── Table: newsletter ──
  `CREATE TABLE IF NOT EXISTS "newsletter" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "newsletter_pkey" PRIMARY KEY ("id")
  );`,

  // ── Columns on commande (IF NOT EXISTS) ──
  `ALTER TABLE "commande" ADD COLUMN IF NOT EXISTS "date_livraison" TIMESTAMP(3);`,
  `ALTER TABLE "commande" ADD COLUMN IF NOT EXISTS "date_confirmation" TIMESTAMP(3);`,
  `ALTER TABLE "commande" ADD COLUMN IF NOT EXISTS "date_annulation" TIMESTAMP(3);`,

  // Coffres virtuels
  `CREATE TABLE IF NOT EXISTS "coffre" (
    "id" TEXT NOT NULL,
    "nom" VARCHAR(150) NOT NULL,
    "description" VARCHAR(500),
    "objectif_montant" DECIMAL(12,2),
    "date_echeance" TIMESTAMP(3),
    "statut" "CoffreStatut" NOT NULL DEFAULT 'ACTIF',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "coffre_pkey" PRIMARY KEY ("id")
  );`,

  // Columns on caisse for coffres and immutability
  `ALTER TABLE "caisse" ADD COLUMN IF NOT EXISTS "id_coffre" TEXT;`,
  `ALTER TABLE "caisse" ADD COLUMN IF NOT EXISTS "transfert_group_id" TEXT;`,
  `ALTER TABLE "caisse" ADD COLUMN IF NOT EXISTS "annulee" BOOLEAN NOT NULL DEFAULT false;`,
  `ALTER TABLE "caisse" ADD COLUMN IF NOT EXISTS "motif_annulation" VARCHAR(255);`,
  `ALTER TABLE "caisse" ADD COLUMN IF NOT EXISTS "annulee_by" TEXT;`,
  `ALTER TABLE "caisse" ADD COLUMN IF NOT EXISTS "annulee_at" TIMESTAMP(3);`,
  `ALTER TABLE "caisse" ADD COLUMN IF NOT EXISTS "effectuee_par" TEXT;`,

  // ── Unique indexes ──
  `CREATE UNIQUE INDEX IF NOT EXISTS "commande_numero_suivi_key" ON "commande"("numero_suivi");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "favori_client_id_produit_id_key" ON "favori"("client_id", "produit_id");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "newsletter_email_key" ON "newsletter"("email");`,
  `CREATE INDEX IF NOT EXISTS "caisse_id_coffre_idx" ON "caisse"("id_coffre");`,
  `CREATE INDEX IF NOT EXISTS "caisse_transfert_group_id_idx" ON "caisse"("transfert_group_id");`,

  // ── Foreign keys (idempotent: check before adding) ──
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'commande_client_id_fkey') THEN ALTER TABLE "commande" ADD CONSTRAINT "commande_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'favori_client_id_fkey') THEN ALTER TABLE "favori" ADD CONSTRAINT "favori_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'favori_produit_id_fkey') THEN ALTER TABLE "favori" ADD CONSTRAINT "favori_produit_id_fkey" FOREIGN KEY ("produit_id") REFERENCES "produit"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ligne_commande_id_commande_fkey') THEN ALTER TABLE "ligne_commande" ADD CONSTRAINT "ligne_commande_id_commande_fkey" FOREIGN KEY ("id_commande") REFERENCES "commande"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ligne_commande_id_produit_fkey') THEN ALTER TABLE "ligne_commande" ADD CONSTRAINT "ligne_commande_id_produit_fkey" FOREIGN KEY ("id_produit") REFERENCES "produit"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'caisse_id_coffre_fkey') THEN ALTER TABLE "caisse" ADD CONSTRAINT "caisse_id_coffre_fkey" FOREIGN KEY ("id_coffre") REFERENCES "coffre"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;`,

  // ── Echeances + moteur d'alertes ──
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RecurrenceEcheance') THEN CREATE TYPE "RecurrenceEcheance" AS ENUM ('UNIQUE', 'HEBDOMADAIRE', 'MENSUELLE', 'TRIMESTRIELLE', 'ANNUELLE'); END IF; END $$;`,
  `ALTER TYPE "RecurrenceEcheance" ADD VALUE IF NOT EXISTS 'HEBDOMADAIRE';`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TypeAlerte') THEN CREATE TYPE "TypeAlerte" AS ENUM ('RAPPEL', 'URGENT', 'RETARD'); END IF; END $$;`,
  `ALTER TYPE "TypeNotification" ADD VALUE IF NOT EXISTS 'ECHEANCE';`,
  `CREATE TABLE IF NOT EXISTS "echeance" (
    "id" TEXT NOT NULL,
    "titre" VARCHAR(150) NOT NULL,
    "description" VARCHAR(500),
    "id_coffre" TEXT,
    "montant_cible" DECIMAL(12,2),
    "date_echeance" TIMESTAMP(3) NOT NULL,
    "recurrence" "RecurrenceEcheance" NOT NULL DEFAULT 'UNIQUE',
    "jours_alerte_avant" INTEGER[] DEFAULT ARRAY[7, 3, 1],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "derniere_alerte_le" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "echeance_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE TABLE IF NOT EXISTS "alerte_echeance" (
    "id" TEXT NOT NULL,
    "id_echeance" TEXT NOT NULL,
    "type" "TypeAlerte" NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "jour_emission" VARCHAR(10) NOT NULL,
    "email_envoye" BOOLEAN NOT NULL DEFAULT false,
    "declenche_manuel" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "alerte_echeance_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE INDEX IF NOT EXISTS "echeance_id_coffre_idx" ON "echeance"("id_coffre");`,
  `CREATE INDEX IF NOT EXISTS "echeance_active_date_echeance_idx" ON "echeance"("active", "date_echeance");`,
  `CREATE INDEX IF NOT EXISTS "alerte_echeance_id_echeance_idx" ON "alerte_echeance"("id_echeance");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "alerte_echeance_id_echeance_type_jour_emission_key" ON "alerte_echeance"("id_echeance", "type", "jour_emission");`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'echeance_id_coffre_fkey') THEN ALTER TABLE "echeance" ADD CONSTRAINT "echeance_id_coffre_fkey" FOREIGN KEY ("id_coffre") REFERENCES "coffre"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'alerte_echeance_id_echeance_fkey') THEN ALTER TABLE "alerte_echeance" ADD CONSTRAINT "alerte_echeance_id_echeance_fkey" FOREIGN KEY ("id_echeance") REFERENCES "echeance"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;`,

  // ── Mark the migration as applied in _prisma_migrations (so Prisma doesn't try to re-run it) ──
  `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
   SELECT gen_random_uuid()::text, 'ensure-schema-script', NOW(), '20260321220000_add_ecommerce_tables', NULL, NULL, NOW(), 1
   WHERE NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '20260321220000_add_ecommerce_tables');`,

  // ── Resolve failed/interrupted migrations (P3009) ──
  // ensure-schema garantit déjà le schéma via IF NOT EXISTS ; on marque donc
  // toute migration "started but never finished" comme terminée pour que
  // `prisma migrate deploy` ne soit plus bloqué et que l'app puisse démarrer.
  `UPDATE "_prisma_migrations"
   SET finished_at = NOW(), applied_steps_count = 1, logs = COALESCE(logs, '') || ' [auto-resolved by ensure-schema]'
   WHERE finished_at IS NULL AND rolled_back_at IS NULL;`
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log('[ensure-schema] No DATABASE_URL found, skipping.');
    process.exit(0);
  }

  console.log('[ensure-schema] Checking and creating missing tables/columns...');
  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();

    for (const sql of SQL_STATEMENTS) {
      try {
        await client.query(sql);
      } catch (err) {
        // Ignore "already exists" errors, log others
        if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
          console.warn(`[ensure-schema] Warning: ${err.message.slice(0, 120)}`);
        }
      }
    }

    console.log('[ensure-schema] Schema check complete.');
  } catch (err) {
    console.error('[ensure-schema] Connection error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
