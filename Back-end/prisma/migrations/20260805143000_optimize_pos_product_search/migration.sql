CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "idx_produit_nom_trgm"
  ON "produit" USING GIN ("nom_produit" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "idx_produit_designation_en_trgm"
  ON "produit" USING GIN ("designation_en" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "idx_produit_marque_trgm"
  ON "produit" USING GIN ("marque" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "idx_produit_code_trgm"
  ON "produit" USING GIN ("code" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "idx_produit_code_famille_trgm"
  ON "produit" USING GIN ("code_famille" gin_trgm_ops);
