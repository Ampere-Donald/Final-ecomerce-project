ALTER TYPE "TypeFacture" ADD VALUE IF NOT EXISTS 'BON_VENTE';

ALTER TABLE "client"
  ADD COLUMN IF NOT EXISTS "telephone_normalise" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "limite_credit" DECIMAL(12,2) NOT NULL DEFAULT 50000;

UPDATE "client"
SET "telephone_normalise" = NULLIF(
  regexp_replace(
    regexp_replace(COALESCE("telephone", ''), '[^0-9]', '', 'g'),
    '^(00237|237)',
    ''
  ),
  ''
)
WHERE "telephone_normalise" IS NULL;

CREATE INDEX IF NOT EXISTS "client_telephone_normalise_idx"
  ON "client"("telephone_normalise");

ALTER TABLE "vente"
  ADD COLUMN IF NOT EXISTS "montant_recu" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "monnaie_rendue" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "reference_paiement" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "date_echeance" TIMESTAMP(3);

ALTER TABLE "ticket_vente"
  ADD COLUMN IF NOT EXISTS "note_caissier" VARCHAR(500);

DO $$ BEGIN
  ALTER TABLE "ticket_vente"
    ADD CONSTRAINT "ticket_vente_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
