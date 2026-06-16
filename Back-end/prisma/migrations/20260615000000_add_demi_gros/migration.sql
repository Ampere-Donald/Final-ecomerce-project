-- Produit : prix demi-gros
ALTER TABLE "produit"
  ADD COLUMN IF NOT EXISTS "prix_demi_gros" DOUBLE PRECISION;

-- Achat : coefficient demi-gros par défaut
ALTER TABLE "achat"
  ADD COLUMN IF NOT EXISTS "coeff_demi_gros_default" DOUBLE PRECISION NOT NULL DEFAULT 1.22;

-- LigneAchat : coefficient + prix suggéré/final demi-gros
ALTER TABLE "ligne_achat"
  ADD COLUMN IF NOT EXISTS "coeff_demi_gros"          DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "prix_demi_gros_suggere"   DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "prix_demi_gros_final"     DECIMAL(12,2);
