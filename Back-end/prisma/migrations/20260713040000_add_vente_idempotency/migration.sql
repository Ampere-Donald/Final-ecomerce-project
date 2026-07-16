ALTER TABLE "vente" ADD COLUMN "idempotency_key" VARCHAR(64);
CREATE UNIQUE INDEX "vente_idempotency_key_key" ON "vente"("idempotency_key");
