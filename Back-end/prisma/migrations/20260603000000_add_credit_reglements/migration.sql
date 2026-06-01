-- Ajout de la méthode de paiement CREDIT
ALTER TYPE "MethodePaiement" ADD VALUE IF NOT EXISTS 'CREDIT';

-- Colonne montant_paye sur vente (suivi des crédits / encaissements partiels)
ALTER TABLE "vente" ADD COLUMN IF NOT EXISTS "montant_paye" DECIMAL(12,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "vente_id_client_statut_paiement_idx"
  ON "vente"("id_client", "statut_paiement");

-- Table reglement (encaissements d'une vente à crédit)
CREATE TABLE IF NOT EXISTS "reglement" (
  "id" TEXT NOT NULL,
  "id_vente" TEXT NOT NULL,
  "montant" DECIMAL(12,2) NOT NULL,
  "methode_paiement" "MethodePaiement" NOT NULL,
  "date_reglement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "caissier_id" TEXT NOT NULL,
  "caisse_jour_id" TEXT,
  "note" VARCHAR(255),
  "annulee" BOOLEAN NOT NULL DEFAULT false,
  "motif_annulation" VARCHAR(255),
  "annulee_by" TEXT,
  "annulee_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reglement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "reglement_id_vente_idx" ON "reglement"("id_vente");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reglement_id_vente_fkey') THEN
    ALTER TABLE "reglement" ADD CONSTRAINT "reglement_id_vente_fkey"
      FOREIGN KEY ("id_vente") REFERENCES "vente"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Lien optionnel opération de caisse -> reglement (pour annulation propre)
ALTER TABLE "caisse" ADD COLUMN IF NOT EXISTS "id_reglement" TEXT;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'caisse_id_reglement_fkey') THEN
    ALTER TABLE "caisse" ADD CONSTRAINT "caisse_id_reglement_fkey"
      FOREIGN KEY ("id_reglement") REFERENCES "reglement"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "caisse_id_reglement_idx" ON "caisse"("id_reglement");
