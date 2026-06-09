-- AlterTable
ALTER TABLE "produit" ADD COLUMN "code_famille" VARCHAR(50),
                      ADD COLUMN "code" VARCHAR(50);

-- CreateIndex
CREATE UNIQUE INDEX "unique_code_produit" ON "produit"("code_famille", "code");
