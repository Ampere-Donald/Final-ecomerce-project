-- AlterTable: add seuil_alerte to produit
ALTER TABLE "produit" ADD COLUMN IF NOT EXISTS "seuil_alerte" INTEGER NOT NULL DEFAULT 5;

-- AlterTable: add date columns to commande
ALTER TABLE "commande" ADD COLUMN IF NOT EXISTS "date_livraison" TIMESTAMP(3);
ALTER TABLE "commande" ADD COLUMN IF NOT EXISTS "date_confirmation" TIMESTAMP(3);
ALTER TABLE "commande" ADD COLUMN IF NOT EXISTS "date_annulation" TIMESTAMP(3);
