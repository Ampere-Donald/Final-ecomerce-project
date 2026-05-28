-- CreateEnum
CREATE TYPE "CoffreStatut" AS ENUM ('ACTIF', 'ATTEINT', 'CLOTURE');

-- CreateTable
CREATE TABLE "coffre" (
    "id" TEXT NOT NULL,
    "nom" VARCHAR(150) NOT NULL,
    "description" VARCHAR(500),
    "objectif_montant" DECIMAL(12,2),
    "date_echeance" TIMESTAMP(3),
    "statut" "CoffreStatut" NOT NULL DEFAULT 'ACTIF',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coffre_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "caisse" ADD COLUMN "id_coffre" TEXT;
ALTER TABLE "caisse" ADD COLUMN "transfert_group_id" TEXT;
ALTER TABLE "caisse" ADD COLUMN "annulee" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "caisse" ADD COLUMN "motif_annulation" VARCHAR(255);
ALTER TABLE "caisse" ADD COLUMN "annulee_by" TEXT;
ALTER TABLE "caisse" ADD COLUMN "annulee_at" TIMESTAMP(3);
ALTER TABLE "caisse" ADD COLUMN "effectuee_par" TEXT;

-- CreateIndex
CREATE INDEX "caisse_id_coffre_idx" ON "caisse"("id_coffre");

-- CreateIndex
CREATE INDEX "caisse_transfert_group_id_idx" ON "caisse"("transfert_group_id");

-- AddForeignKey
ALTER TABLE "caisse" ADD CONSTRAINT "caisse_id_coffre_fkey" FOREIGN KEY ("id_coffre") REFERENCES "coffre"("id") ON DELETE SET NULL ON UPDATE CASCADE;
