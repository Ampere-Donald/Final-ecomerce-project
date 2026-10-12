-- CreateEnum
CREATE TYPE "VerdictRemplacement" AS ENUM ('DIRECT_DOCUMENTE', 'ADAPTATION_NECESSAIRE', 'REFUSE', 'A_CONFIRMER');

-- CreateTable
CREATE TABLE "cas_remplacement" (
    "id" TEXT NOT NULL,
    "cle_cas" VARCHAR(64) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "reference" VARCHAR(255) NOT NULL,
    "reference_cle" VARCHAR(255) NOT NULL,
    "cible_id" TEXT,
    "candidat_id" TEXT NOT NULL,
    "application" VARCHAR(500) NOT NULL,
    "verdict" "VerdictRemplacement" NOT NULL,
    "justification" VARCHAR(1500) NOT NULL,
    "limites" VARCHAR(1500) NOT NULL,
    "adaptations" VARCHAR(1500),
    "source_url" VARCHAR(800) NOT NULL,
    "source_document" VARCHAR(200) NOT NULL,
    "source_repere" VARCHAR(160) NOT NULL,
    "source_revision" VARCHAR(100),
    "valeur_ids" TEXT[],
    "relu_version" INTEGER,
    "relu_par_id" TEXT,
    "relu_le" TIMESTAMP(3),
    "empreinte_relue" VARCHAR(64),
    "retire" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cas_remplacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relecture_remplacement" (
    "id" TEXT NOT NULL,
    "cas_id" TEXT NOT NULL,
    "cas_version" INTEGER NOT NULL,
    "relu_par_id" TEXT NOT NULL,
    "relu_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "empreinte" VARCHAR(64) NOT NULL,
    "preuve" JSONB NOT NULL,

    CONSTRAINT "relecture_remplacement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cas_remplacement_cle_cas_key" ON "cas_remplacement"("cle_cas");

-- CreateIndex
CREATE INDEX "cas_remplacement_reference_cle_idx" ON "cas_remplacement"("reference_cle");

-- CreateIndex
CREATE INDEX "cas_remplacement_cible_id_candidat_id_idx" ON "cas_remplacement"("cible_id", "candidat_id");

-- CreateIndex
CREATE UNIQUE INDEX "relecture_remplacement_cas_id_cas_version_key" ON "relecture_remplacement"("cas_id", "cas_version");

-- AddForeignKey
ALTER TABLE "cas_remplacement" ADD CONSTRAINT "cas_remplacement_candidat_id_fkey" FOREIGN KEY ("candidat_id") REFERENCES "produit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cas_remplacement" ADD CONSTRAINT "cas_remplacement_cible_id_fkey" FOREIGN KEY ("cible_id") REFERENCES "produit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relecture_remplacement" ADD CONSTRAINT "relecture_remplacement_cas_id_fkey" FOREIGN KEY ("cas_id") REFERENCES "cas_remplacement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
