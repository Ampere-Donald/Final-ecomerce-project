-- Bon de commande fournisseur (bilingue, négociable) + désignation anglaise produit
-- Idempotent (DB Railway prod, migrate deploy)

ALTER TABLE "produit" ADD COLUMN IF NOT EXISTS "designation_en" VARCHAR(200);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StatutCommandeFournisseur') THEN
    CREATE TYPE "StatutCommandeFournisseur" AS ENUM ('BROUILLON', 'ENVOYEE', 'RECUE', 'ANNULEE');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "commande_fournisseur" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "fournisseur_id" TEXT NOT NULL,
  "devise" "Devise" NOT NULL DEFAULT 'FCFA',
  "taux_vers_fcfa" DECIMAL(12,6) NOT NULL DEFAULT 1,
  "statut" "StatutCommandeFournisseur" NOT NULL DEFAULT 'BROUILLON',
  "notes" VARCHAR(500),
  "total_devise" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "total_fcfa" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "achat_id" TEXT,
  "created_by_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "envoyee_at" TIMESTAMP(3),
  "recue_at" TIMESTAMP(3),
  CONSTRAINT "commande_fournisseur_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "commande_fournisseur_reference_key" ON "commande_fournisseur"("reference");
CREATE INDEX IF NOT EXISTS "commande_fournisseur_statut_created_at_idx" ON "commande_fournisseur"("statut", "created_at");

CREATE TABLE IF NOT EXISTS "ligne_commande_fournisseur" (
  "id" TEXT NOT NULL,
  "commande_id" TEXT NOT NULL,
  "produit_id" TEXT NOT NULL,
  "designation_en" VARCHAR(200),
  "nom_produit" VARCHAR(150) NOT NULL,
  "quantite" INTEGER NOT NULL,
  "rate" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "prix_negocie" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "sous_total" DECIMAL(14,2) NOT NULL DEFAULT 0,
  CONSTRAINT "ligne_commande_fournisseur_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ligne_commande_fournisseur_commande_id_idx" ON "ligne_commande_fournisseur"("commande_id");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ligne_commande_fournisseur_commande_id_fkey') THEN
    ALTER TABLE "ligne_commande_fournisseur" ADD CONSTRAINT "ligne_commande_fournisseur_commande_id_fkey"
      FOREIGN KEY ("commande_id") REFERENCES "commande_fournisseur"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
