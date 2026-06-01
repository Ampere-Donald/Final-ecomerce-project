-- Table suggestion_equivalence (journal des recherches d'équivalents IA)
CREATE TABLE IF NOT EXISTS "suggestion_equivalence" (
  "id" TEXT NOT NULL,
  "query" VARCHAR(255) NOT NULL,
  "produit_voulu" TEXT,
  "produits_suggeres" JSONB NOT NULL,
  "vendeur_id" TEXT,
  "source" VARCHAR(20) NOT NULL DEFAULT 'pos',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "suggestion_equivalence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "suggestion_equivalence_created_at_idx"
  ON "suggestion_equivalence"("created_at");
