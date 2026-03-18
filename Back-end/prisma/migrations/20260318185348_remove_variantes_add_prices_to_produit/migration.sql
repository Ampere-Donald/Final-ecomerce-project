/*
  Warnings:

  - You are about to drop the column `id_variante_produit` on the `ligne_achat` table. All the data in the column will be lost.
  - You are about to drop the column `id_variante_produit` on the `ligne_vente` table. All the data in the column will be lost.
  - You are about to drop the column `id_variante_produit` on the `mouvement_stock` table. All the data in the column will be lost.
  - You are about to drop the `variante_produit` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `variante_produit_attribut` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `id_produit` to the `ligne_achat` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id_produit` to the `ligne_vente` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id_produit` to the `mouvement_stock` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ligne_achat" DROP CONSTRAINT "ligne_achat_id_variante_produit_fkey";

-- DropForeignKey
ALTER TABLE "ligne_vente" DROP CONSTRAINT "ligne_vente_id_variante_produit_fkey";

-- DropForeignKey
ALTER TABLE "mouvement_stock" DROP CONSTRAINT "mouvement_stock_id_variante_produit_fkey";

-- DropForeignKey
ALTER TABLE "variante_produit" DROP CONSTRAINT "variante_produit_id_produit_fkey";

-- DropForeignKey
ALTER TABLE "variante_produit_attribut" DROP CONSTRAINT "variante_produit_attribut_id_attribut_fkey";

-- DropForeignKey
ALTER TABLE "variante_produit_attribut" DROP CONSTRAINT "variante_produit_attribut_id_valeur_fkey";

-- DropForeignKey
ALTER TABLE "variante_produit_attribut" DROP CONSTRAINT "variante_produit_attribut_id_variante_produit_fkey";

-- AlterTable
ALTER TABLE "ligne_achat" DROP COLUMN "id_variante_produit",
ADD COLUMN     "id_produit" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ligne_vente" DROP COLUMN "id_variante_produit",
ADD COLUMN     "id_produit" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "mouvement_stock" DROP COLUMN "id_variante_produit",
ADD COLUMN     "id_produit" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "produit" ADD COLUMN     "prix_detail" DOUBLE PRECISION,
ADD COLUMN     "prix_gros" DOUBLE PRECISION,
ADD COLUMN     "quantite_stock" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "variante_produit";

-- DropTable
DROP TABLE "variante_produit_attribut";

-- AddForeignKey
ALTER TABLE "ligne_achat" ADD CONSTRAINT "ligne_achat_id_produit_fkey" FOREIGN KEY ("id_produit") REFERENCES "produit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ligne_vente" ADD CONSTRAINT "ligne_vente_id_produit_fkey" FOREIGN KEY ("id_produit") REFERENCES "produit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvement_stock" ADD CONSTRAINT "mouvement_stock_id_produit_fkey" FOREIGN KEY ("id_produit") REFERENCES "produit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
