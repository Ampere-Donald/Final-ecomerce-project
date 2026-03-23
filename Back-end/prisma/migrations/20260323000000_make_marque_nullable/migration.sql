-- AlterTable: make marque nullable (schema says String? but DB had NOT NULL)
ALTER TABLE "produit" ALTER COLUMN "marque" DROP NOT NULL;
