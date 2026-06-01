-- Enum StatutCaisseJour
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StatutCaisseJour') THEN
    CREATE TYPE "StatutCaisseJour" AS ENUM ('OUVERTE', 'FERMEE');
  END IF;
END $$;

-- Table caisse_jour
CREATE TABLE IF NOT EXISTS "caisse_jour" (
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
);

CREATE UNIQUE INDEX IF NOT EXISTS "caisse_jour_date_key" ON "caisse_jour"("date");
CREATE INDEX IF NOT EXISTS "caisse_jour_statut_idx" ON "caisse_jour"("statut");
CREATE INDEX IF NOT EXISTS "caisse_jour_date_idx" ON "caisse_jour"("date");

-- Ajout colonne caisse_jour_id sur caisse
ALTER TABLE "caisse" ADD COLUMN IF NOT EXISTS "caisse_jour_id" TEXT;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'caisse_caisse_jour_id_fkey') THEN
    ALTER TABLE "caisse" ADD CONSTRAINT "caisse_caisse_jour_id_fkey"
      FOREIGN KEY ("caisse_jour_id") REFERENCES "caisse_jour"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "caisse_caisse_jour_id_idx" ON "caisse"("caisse_jour_id");
