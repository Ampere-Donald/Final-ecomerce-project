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

  // ── Mark the migration as applied in _prisma_migrations (so Prisma doesn't try to re-run it) ──
  `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
   SELECT gen_random_uuid()::text, 'ensure-schema-script', NOW(), '20260321220000_add_ecommerce_tables', NULL, NULL, NOW(), 1
   WHERE NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '20260321220000_add_ecommerce_tables');`
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
