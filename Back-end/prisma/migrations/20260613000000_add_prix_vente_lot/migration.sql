-- Enum MethodeRepartition
CREATE TYPE "MethodeRepartition" AS ENUM ('POIDS', 'VOLUME');

-- Produit : poids et volume
ALTER TABLE "produit"
  ADD COLUMN "poids"  DOUBLE PRECISION,
  ADD COLUMN "volume" DOUBLE PRECISION;

-- Achat : frais de lot + coefficients par défaut
ALTER TABLE "achat"
  ADD COLUMN "frais_transport"      DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "frais_douane"         DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "methode_repartition"  "MethodeRepartition" NOT NULL DEFAULT 'POIDS',
  ADD COLUMN "coeff_detail_default" DOUBLE PRECISION NOT NULL DEFAULT 1.3,
  ADD COLUMN "coeff_gros_default"   DOUBLE PRECISION NOT NULL DEFAULT 1.15;

-- LigneAchat : poids/volume utilisés + coefficients + prix suggérés/finaux
ALTER TABLE "ligne_achat"
  ADD COLUMN "poids_utilise"        DOUBLE PRECISION,
  ADD COLUMN "volume_utilise"       DOUBLE PRECISION,
  ADD COLUMN "charge_unitaire"      DECIMAL(12,2),
  ADD COLUMN "coeff_detail"         DOUBLE PRECISION,
  ADD COLUMN "coeff_gros"           DOUBLE PRECISION,
  ADD COLUMN "prix_detail_suggere"  DECIMAL(12,2),
  ADD COLUMN "prix_gros_suggere"    DECIMAL(12,2),
  ADD COLUMN "prix_detail_final"    DECIMAL(12,2),
  ADD COLUMN "prix_gros_final"      DECIMAL(12,2);
