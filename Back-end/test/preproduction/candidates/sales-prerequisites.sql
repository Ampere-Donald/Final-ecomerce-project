-- LOCAL REHEARSAL CANDIDATE ONLY. Not installed in prisma/migrations.
-- Reconstructed from repository HEAD datamodel, 7d3c0f1.
-- Apply before 20260607193000 ONLY to a new disposable database.
-- Plain CREATE deliberately rejects pre-existing objects: no production repair assumed.

CREATE TYPE "StatutPrime" AS ENUM ('EN_COURS', 'VALIDEE', 'PAYEE');

CREATE TYPE "TypeFacture" AS ENUM ('FACTURE', 'TICKET_CAISSE', 'BON_VENTE');

CREATE TABLE "facture" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "type" "TypeFacture" NOT NULL,
    "ticket_id" TEXT,
    "vente_id" TEXT,
    "client_id" TEXT,
    "vendeur_id" TEXT NOT NULL,
    "caissier_id" TEXT,
    "date_emission" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total_ht" DECIMAL(12,2) NOT NULL,
    "tva" DECIMAL(12,2) NOT NULL,
    "total_ttc" DECIMAL(12,2) NOT NULL,
    "methode_paiement" "MethodePaiement" NOT NULL,
    "print_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "facture_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "facture_ligne" (
    "id" TEXT NOT NULL,
    "facture_id" TEXT NOT NULL,
    "nom_produit" VARCHAR(150) NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prix_unitaire_ht" DECIMAL(10,2) NOT NULL,
    "prix_unitaire_ttc" DECIMAL(10,2) NOT NULL,
    "sous_total_ht" DECIMAL(12,2) NOT NULL,
    "sous_total_ttc" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "facture_ligne_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "prime_vendeur" (
    "id" TEXT NOT NULL,
    "vendeur_id" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "nombre_tickets" INTEGER NOT NULL DEFAULT 0,
    "montant_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "statut" "StatutPrime" NOT NULL DEFAULT 'EN_COURS',
    "validee_by" TEXT,
    "validee_at" TIMESTAMP(3),

    CONSTRAINT "prime_vendeur_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "facture_numero_key" ON "facture"("numero");

CREATE UNIQUE INDEX "facture_ticket_id_key" ON "facture"("ticket_id");

CREATE UNIQUE INDEX "facture_vente_id_key" ON "facture"("vente_id");

CREATE UNIQUE INDEX "prime_vendeur_vendeur_id_periode_key" ON "prime_vendeur"("vendeur_id", "periode");

ALTER TABLE "facture" ADD CONSTRAINT "facture_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "ticket_vente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "facture" ADD CONSTRAINT "facture_vente_id_fkey" FOREIGN KEY ("vente_id") REFERENCES "vente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "facture" ADD CONSTRAINT "facture_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "facture" ADD CONSTRAINT "facture_vendeur_id_fkey" FOREIGN KEY ("vendeur_id") REFERENCES "admin_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "facture" ADD CONSTRAINT "facture_caissier_id_fkey" FOREIGN KEY ("caissier_id") REFERENCES "admin_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "facture_ligne" ADD CONSTRAINT "facture_ligne_facture_id_fkey" FOREIGN KEY ("facture_id") REFERENCES "facture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "prime_vendeur" ADD CONSTRAINT "prime_vendeur_vendeur_id_fkey" FOREIGN KEY ("vendeur_id") REFERENCES "admin_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "prime_vendeur" ADD CONSTRAINT "prime_vendeur_validee_by_fkey" FOREIGN KEY ("validee_by") REFERENCES "admin_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
