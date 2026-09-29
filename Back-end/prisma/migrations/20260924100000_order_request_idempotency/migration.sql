CREATE TABLE "commande_request" (
  "request_id" UUID NOT NULL,
  "fingerprint" VARCHAR(64) NOT NULL,
  "commande_id" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "commande_request_pkey" PRIMARY KEY ("request_id"),
  CONSTRAINT "commande_request_commande_id_fkey" FOREIGN KEY ("commande_id")
    REFERENCES "commande"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "commande_request_commande_id_idx" ON "commande_request"("commande_id");
