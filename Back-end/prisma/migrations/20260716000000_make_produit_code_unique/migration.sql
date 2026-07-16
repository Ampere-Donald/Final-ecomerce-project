-- Le code-barres de la boutique correspond directement à produit.code.
-- Un code doit donc identifier un seul produit, indépendamment de sa famille.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "produit"
    WHERE "code" IS NOT NULL
    GROUP BY "code"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Migration impossible : des produits utilisent le même code. Corrigez les doublons avant de relancer.';
  END IF;
END $$;

DROP INDEX IF EXISTS "unique_code_produit";

CREATE UNIQUE INDEX "unique_produit_code" ON "produit"("code");
CREATE INDEX "idx_produit_code_famille" ON "produit"("code_famille");
