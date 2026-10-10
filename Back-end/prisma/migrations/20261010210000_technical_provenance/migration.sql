-- Additive only. Existing values are neither normalized nor marked documented.
CREATE TYPE "EtatDonneeTechnique" AS ENUM ('INCONNU', 'A_VERIFIER', 'DOCUMENTE', 'CONTRADICTOIRE', 'NON_APPLICABLE');
CREATE TABLE "documentation_valeur" (
  "valeur_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "etat" "EtatDonneeTechnique" NOT NULL DEFAULT 'A_VERIFIER',
  "valeur_version" INTEGER NOT NULL,
  "attribut_version" INTEGER NOT NULL,
  "produit_version" INTEGER NOT NULL,
  "valeur_source" VARCHAR(100) NOT NULL,
  "unite_source" VARCHAR(40),
  "valeur_normalisee" VARCHAR(100),
  "unite_normalisee" VARCHAR(40),
  "conditions" VARCHAR(500),
  "source_url" VARCHAR(800),
  "source_document" VARCHAR(200),
  "source_repere" VARCHAR(160),
  "source_revision" VARCHAR(100),
  "motif" VARCHAR(500),
  "relu_par_id" TEXT,
  "relu_le" TIMESTAMP(3),
  CONSTRAINT "documentation_valeur_pkey" PRIMARY KEY ("valeur_id")
);
ALTER TABLE "documentation_valeur" ADD CONSTRAINT "documentation_valeur_valeur_id_fkey" FOREIGN KEY ("valeur_id") REFERENCES "valeur_attribut"("id") ON DELETE CASCADE ON UPDATE CASCADE;
