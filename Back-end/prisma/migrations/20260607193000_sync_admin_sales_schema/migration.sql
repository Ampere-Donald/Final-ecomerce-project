-- Synchronize the live admin sales schema with the current Prisma schema.
-- This migration is intentionally idempotent because several tables were
-- already created by earlier hotfix migrations outside of a single Prisma step.

-- Enums -----------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StatutBon') THEN
    CREATE TYPE "StatutBon" AS ENUM ('EN_ATTENTE', 'VALIDE', 'ANNULE');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StatutProforma') THEN
    CREATE TYPE "StatutProforma" AS ENUM ('EN_COURS', 'ACCEPTEE', 'TRANSFORMEE');
  END IF;
END $$;

ALTER TYPE "StatutBon" ADD VALUE IF NOT EXISTS 'EN_ATTENTE';
ALTER TYPE "StatutBon" ADD VALUE IF NOT EXISTS 'VALIDE';
ALTER TYPE "StatutBon" ADD VALUE IF NOT EXISTS 'ANNULE';
ALTER TYPE "StatutProforma" ADD VALUE IF NOT EXISTS 'EN_COURS';
ALTER TYPE "StatutProforma" ADD VALUE IF NOT EXISTS 'ACCEPTEE';
ALTER TYPE "StatutProforma" ADD VALUE IF NOT EXISTS 'TRANSFORMEE';

-- Drifted columns -------------------------------------------------------------
ALTER TABLE "admin_user"
  ALTER COLUMN "username" DROP NOT NULL,
  ALTER COLUMN "updated_at" DROP NOT NULL;

ALTER TABLE "caisse_jour"
  ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "categorie"
  ADD COLUMN IF NOT EXISTS "quantite_gros" INTEGER;

ALTER TABLE "produit"
  ADD COLUMN IF NOT EXISTS "quantite_gros" INTEGER;

ALTER TABLE "client"
  ADD COLUMN IF NOT EXISTS "niu" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "rccm" VARCHAR(50);

ALTER TABLE "prime_vendeur"
  ADD COLUMN IF NOT EXISTS "montant_total" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Backfill existing seller bonus totals from already emitted invoices.
UPDATE "prime_vendeur" pv
SET "montant_total" = COALESCE(src.total_ttc, 0)
FROM (
  SELECT
    "vendeur_id",
    to_char("date_emission", 'YYYY-MM') AS "periode",
    SUM("total_ttc") AS total_ttc
  FROM "facture"
  GROUP BY "vendeur_id", to_char("date_emission", 'YYYY-MM')
) src
WHERE pv."vendeur_id" = src."vendeur_id"
  AND pv."periode" = src."periode"
  AND pv."montant_total" = 0;

-- Bon de vente tables ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS "bon_vente" (
  "id" TEXT NOT NULL,
  "numero" TEXT NOT NULL,
  "vendeur_id" TEXT NOT NULL,
  "client_id" TEXT,
  "methode_paiement" "MethodePaiement" NOT NULL,
  "statut" "StatutBon" NOT NULL DEFAULT 'EN_ATTENTE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validee_at" TIMESTAMP(3),
  "validee_by" TEXT,
  "vente_id" TEXT,
  CONSTRAINT "bon_vente_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ligne_bon" (
  "id" TEXT NOT NULL,
  "bon_id" TEXT NOT NULL,
  "produit_id" TEXT NOT NULL,
  "nom_produit" VARCHAR(150) NOT NULL,
  "quantite" INTEGER NOT NULL,
  "prix_unitaire" DECIMAL(10,2) NOT NULL,
  "sous_total" DECIMAL(12,2) NOT NULL,
  CONSTRAINT "ligne_bon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "bon_vente_numero_key"
  ON "bon_vente"("numero");

CREATE UNIQUE INDEX IF NOT EXISTS "bon_vente_vente_id_key"
  ON "bon_vente"("vente_id");

-- Proformas -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "proforma" (
  "id" TEXT NOT NULL,
  "numero" TEXT NOT NULL,
  "vendeur_id" TEXT NOT NULL,
  "client_id" TEXT,
  "client_nom" VARCHAR(150),
  "client_niu" VARCHAR(50),
  "client_rccm" VARCHAR(50),
  "statut" "StatutProforma" NOT NULL DEFAULT 'EN_COURS',
  "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "date_expiration" TIMESTAMP(3) NOT NULL,
  "montant_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "notes" TEXT,
  CONSTRAINT "proforma_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "proforma_ligne" (
  "id" TEXT NOT NULL,
  "proforma_id" TEXT NOT NULL,
  "produit_id" TEXT,
  "nom_produit" VARCHAR(150) NOT NULL,
  "quantite" INTEGER NOT NULL,
  "prix_unitaire" DECIMAL(10,2) NOT NULL,
  "sous_total" DECIMAL(12,2) NOT NULL,
  CONSTRAINT "proforma_ligne_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "proforma_numero_key"
  ON "proforma"("numero");

CREATE INDEX IF NOT EXISTS "proforma_statut_date_expiration_idx"
  ON "proforma"("statut", "date_expiration");

CREATE INDEX IF NOT EXISTS "proforma_vendeur_id_date_creation_idx"
  ON "proforma"("vendeur_id", "date_creation");

-- Foreign keys ----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bon_vente_client_id_fkey') THEN
    ALTER TABLE "bon_vente" ADD CONSTRAINT "bon_vente_client_id_fkey"
      FOREIGN KEY ("client_id") REFERENCES "client"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bon_vente_validee_by_fkey') THEN
    ALTER TABLE "bon_vente" ADD CONSTRAINT "bon_vente_validee_by_fkey"
      FOREIGN KEY ("validee_by") REFERENCES "admin_user"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bon_vente_vendeur_id_fkey') THEN
    ALTER TABLE "bon_vente" ADD CONSTRAINT "bon_vente_vendeur_id_fkey"
      FOREIGN KEY ("vendeur_id") REFERENCES "admin_user"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bon_vente_vente_id_fkey') THEN
    ALTER TABLE "bon_vente" ADD CONSTRAINT "bon_vente_vente_id_fkey"
      FOREIGN KEY ("vente_id") REFERENCES "vente"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ligne_bon_bon_id_fkey') THEN
    ALTER TABLE "ligne_bon" ADD CONSTRAINT "ligne_bon_bon_id_fkey"
      FOREIGN KEY ("bon_id") REFERENCES "bon_vente"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ligne_bon_produit_id_fkey') THEN
    ALTER TABLE "ligne_bon" ADD CONSTRAINT "ligne_bon_produit_id_fkey"
      FOREIGN KEY ("produit_id") REFERENCES "produit"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proforma_vendeur_id_fkey') THEN
    ALTER TABLE "proforma" ADD CONSTRAINT "proforma_vendeur_id_fkey"
      FOREIGN KEY ("vendeur_id") REFERENCES "admin_user"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proforma_client_id_fkey') THEN
    ALTER TABLE "proforma" ADD CONSTRAINT "proforma_client_id_fkey"
      FOREIGN KEY ("client_id") REFERENCES "client"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proforma_ligne_proforma_id_fkey') THEN
    ALTER TABLE "proforma_ligne" ADD CONSTRAINT "proforma_ligne_proforma_id_fkey"
      FOREIGN KEY ("proforma_id") REFERENCES "proforma"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ticket_vente_vendeur_id_fkey') THEN
    ALTER TABLE "ticket_vente" ADD CONSTRAINT "ticket_vente_vendeur_id_fkey"
      FOREIGN KEY ("vendeur_id") REFERENCES "admin_user"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
