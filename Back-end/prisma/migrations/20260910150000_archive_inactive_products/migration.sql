ALTER TABLE "produit"
  ADD COLUMN IF NOT EXISTS "est_actif" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "desactive_le" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "idx_produit_est_actif"
  ON "produit" ("est_actif");
