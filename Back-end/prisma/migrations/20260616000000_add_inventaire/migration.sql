-- Inventaire par catégorie/famille + délégation de validation
-- Idempotent (DB Railway prod, migrate deploy)

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StatutInventaire') THEN
    CREATE TYPE "StatutInventaire" AS ENUM ('EN_COURS', 'VALIDE', 'ANNULE');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "inventaire" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "statut" "StatutInventaire" NOT NULL DEFAULT 'EN_COURS',
  "perimetre" VARCHAR(150) NOT NULL,
  "categorie_id" TEXT,
  "code_famille" VARCHAR(50),
  "created_by_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "valide_at" TIMESTAMP(3),
  "valide_by_id" TEXT,
  "via_delegation" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "inventaire_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "inventaire_reference_key" ON "inventaire"("reference");
CREATE INDEX IF NOT EXISTS "inventaire_statut_created_at_idx" ON "inventaire"("statut", "created_at");

CREATE TABLE IF NOT EXISTS "ligne_inventaire" (
  "id" TEXT NOT NULL,
  "inventaire_id" TEXT NOT NULL,
  "produit_id" TEXT NOT NULL,
  "nom_produit" VARCHAR(150) NOT NULL,
  "code_famille" VARCHAR(50),
  "stock_systeme" INTEGER NOT NULL,
  "stock_compte" INTEGER,
  "ecart" INTEGER,
  CONSTRAINT "ligne_inventaire_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ligne_inventaire_inventaire_id_idx" ON "ligne_inventaire"("inventaire_id");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ligne_inventaire_inventaire_id_fkey') THEN
    ALTER TABLE "ligne_inventaire" ADD CONSTRAINT "ligne_inventaire_inventaire_id_fkey"
      FOREIGN KEY ("inventaire_id") REFERENCES "inventaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "delegation_inventaire" (
  "id" TEXT NOT NULL,
  "admin_user_id" TEXT NOT NULL,
  "accorde_par_id" TEXT NOT NULL,
  "debut_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fin_at" TIMESTAMP(3) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "motif" VARCHAR(255),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "delegation_inventaire_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "delegation_inventaire_admin_user_id_active_idx" ON "delegation_inventaire"("admin_user_id", "active");
