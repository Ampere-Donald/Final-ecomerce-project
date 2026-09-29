-- Additive acceptance ledger. Never applied automatically by this change.
ALTER TABLE "demande_devis"
  ADD COLUMN "commande_id" TEXT,
  ADD COLUMN "numero_commande" VARCHAR(30),
  ADD COLUMN "accepted_version" INTEGER,
  ADD COLUMN "accepted_at" TIMESTAMP(3),
  ADD COLUMN "accept_request_id" UUID;
CREATE UNIQUE INDEX "demande_devis_commande_id_key" ON "demande_devis"("commande_id");
CREATE UNIQUE INDEX "demande_devis_accept_request_id_key" ON "demande_devis"("accept_request_id");
ALTER TABLE "demande_devis" ADD CONSTRAINT "demande_devis_commande_id_fkey" FOREIGN KEY ("commande_id") REFERENCES "commande"("id") ON DELETE SET NULL ON UPDATE CASCADE;
