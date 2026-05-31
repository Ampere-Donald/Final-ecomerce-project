-- Enum StatutTicket
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StatutTicket') THEN
    CREATE TYPE "StatutTicket" AS ENUM ('EN_ATTENTE', 'ENCAISSE', 'EXPIRE', 'ANNULE');
  END IF;
END $$;

-- Table ticket_vente
CREATE TABLE IF NOT EXISTS "ticket_vente" (
  "id" TEXT NOT NULL,
  "numero_ticket" VARCHAR(20) NOT NULL,
  "vendeur_id" TEXT NOT NULL,
  "caissier_id" TEXT,
  "client_id" TEXT,
  "nom_client" VARCHAR(150),
  "telephone_client" VARCHAR(30),
  "montant_total" DECIMAL(12,2) NOT NULL,
  "methode_paiement" "MethodePaiement",
  "statut" "StatutTicket" NOT NULL DEFAULT 'EN_ATTENTE',
  "vente_id" TEXT,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "encaisse_at" TIMESTAMP(3),
  "annule_at" TIMESTAMP(3),
  "motif_annulation" VARCHAR(255),
  CONSTRAINT "ticket_vente_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ticket_vente_numero_ticket_key" ON "ticket_vente"("numero_ticket");
CREATE UNIQUE INDEX IF NOT EXISTS "ticket_vente_vente_id_key" ON "ticket_vente"("vente_id");
CREATE INDEX IF NOT EXISTS "ticket_vente_statut_expires_at_idx" ON "ticket_vente"("statut", "expires_at");
CREATE INDEX IF NOT EXISTS "ticket_vente_vendeur_id_created_at_idx" ON "ticket_vente"("vendeur_id", "created_at");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ticket_vente_vente_id_fkey') THEN
    ALTER TABLE "ticket_vente" ADD CONSTRAINT "ticket_vente_vente_id_fkey"
      FOREIGN KEY ("vente_id") REFERENCES "vente"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Table ligne_ticket
CREATE TABLE IF NOT EXISTS "ligne_ticket" (
  "id" TEXT NOT NULL,
  "ticket_id" TEXT NOT NULL,
  "produit_id" TEXT NOT NULL,
  "nom_produit" VARCHAR(150) NOT NULL,
  "quantite" INTEGER NOT NULL,
  "prix_unitaire" DECIMAL(10,2) NOT NULL,
  "sous_total" DECIMAL(12,2) NOT NULL,
  CONSTRAINT "ligne_ticket_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ligne_ticket_ticket_id_idx" ON "ligne_ticket"("ticket_id");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ligne_ticket_ticket_id_fkey') THEN
    ALTER TABLE "ligne_ticket" ADD CONSTRAINT "ligne_ticket_ticket_id_fkey"
      FOREIGN KEY ("ticket_id") REFERENCES "ticket_vente"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
