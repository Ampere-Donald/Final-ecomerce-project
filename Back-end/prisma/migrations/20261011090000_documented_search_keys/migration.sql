-- No inference or backfill: historical attributes retain a null dictionary key.
CREATE TYPE "CleAttributTechnique" AS ENUM ('REFERENCE_FABRICANT', 'ALIAS_RECHERCHE');
ALTER TABLE "attribut" ADD COLUMN "cle_technique" "CleAttributTechnique";
CREATE INDEX "attribut_id_produit_cle_technique_idx" ON "attribut"("id_produit", "cle_technique");
