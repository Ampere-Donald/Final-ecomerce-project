ALTER TABLE "ticket_vente" ADD COLUMN "idempotency_key" VARCHAR(64);
CREATE UNIQUE INDEX "ticket_vente_idempotency_key_key" ON "ticket_vente"("idempotency_key");
