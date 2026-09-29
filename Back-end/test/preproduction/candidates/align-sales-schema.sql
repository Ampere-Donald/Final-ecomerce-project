-- LOCAL REHEARSAL CANDIDATE ONLY. Not a Railway repair script.
-- Align the completed historical chain with the current application model.
-- Keep all five search GIN indexes created by the August migration.
BEGIN;
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TypeNotification" ADD VALUE 'BON_CREE';
ALTER TYPE "TypeNotification" ADD VALUE 'BON_VALIDE';
ALTER TYPE "TypeNotification" ADD VALUE 'BON_ANNULE';
ALTER TYPE "TypeNotification" ADD VALUE 'PRIME_MAJ';

-- DropForeignKey
ALTER TABLE "facture_virtuelle" DROP CONSTRAINT "fv_approuveur_fk";

-- DropForeignKey
ALTER TABLE "facture_virtuelle" DROP CONSTRAINT "fv_client_fk";

-- DropForeignKey
ALTER TABLE "facture_virtuelle" DROP CONSTRAINT "fv_facture_fk";

-- DropForeignKey
ALTER TABLE "facture_virtuelle" DROP CONSTRAINT "fv_vendeur_fk";

-- DropForeignKey
ALTER TABLE "facture_virtuelle" DROP CONSTRAINT "fv_vente_fk";

-- DropForeignKey
ALTER TABLE "facture_virtuelle_ligne" DROP CONSTRAINT "fvl_fv_fk";

-- AlterTable
ALTER TABLE "admin_user" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "document_sequence" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "vente" ADD COLUMN     "vendeur_id" TEXT;

-- AddForeignKey
ALTER TABLE "vente" ADD CONSTRAINT "vente_vendeur_id_fkey" FOREIGN KEY ("vendeur_id") REFERENCES "admin_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caisse" ADD CONSTRAINT "caisse_effectuee_par_fkey" FOREIGN KEY ("effectuee_par") REFERENCES "admin_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facture_virtuelle" ADD CONSTRAINT "facture_virtuelle_facture_reelle_id_fkey" FOREIGN KEY ("facture_reelle_id") REFERENCES "facture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facture_virtuelle" ADD CONSTRAINT "facture_virtuelle_vente_id_fkey" FOREIGN KEY ("vente_id") REFERENCES "vente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facture_virtuelle" ADD CONSTRAINT "facture_virtuelle_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facture_virtuelle" ADD CONSTRAINT "facture_virtuelle_vendeur_id_fkey" FOREIGN KEY ("vendeur_id") REFERENCES "admin_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facture_virtuelle" ADD CONSTRAINT "facture_virtuelle_approuveur_id_fkey" FOREIGN KEY ("approuveur_id") REFERENCES "admin_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facture_virtuelle_ligne" ADD CONSTRAINT "facture_virtuelle_ligne_facture_virtuelle_id_fkey" FOREIGN KEY ("facture_virtuelle_id") REFERENCES "facture_virtuelle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "unique_code_produit" RENAME TO "produit_code_famille_code_key";

COMMIT;
