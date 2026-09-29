-- CreateEnum
CREATE TYPE "StatutDemandeDevis" AS ENUM ('RECUE', 'A_PRECISER', 'ENVOYEE', 'ACCEPTEE', 'REFUSEE', 'EXPIREE');

-- CreateTable
CREATE TABLE "demande_devis" (
    "id" TEXT NOT NULL,
    "request_id" UUID NOT NULL,
    "fingerprint" VARCHAR(64) NOT NULL,
    "client_id" TEXT NOT NULL,
    "nom_client" VARCHAR(150) NOT NULL,
    "telephone" VARCHAR(30) NOT NULL,
    "mode_reception" "ModeReception" NOT NULL,
    "destination" VARCHAR(500),
    "notes" VARCHAR(2000),
    "statut" "StatutDemandeDevis" NOT NULL DEFAULT 'RECUE',
    "responsable_id" TEXT,
    "proforma_id" TEXT,
    "reponse_client" VARCHAR(2000),
    "offre" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demande_devis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demande_devis_ligne" (
    "id" TEXT NOT NULL,
    "demande_id" TEXT NOT NULL,
    "reference" VARCHAR(100) NOT NULL,
    "quantite" INTEGER NOT NULL,
    "produit_id" TEXT,
    "nom_produit" VARCHAR(150),
    "ordre" INTEGER NOT NULL,

    CONSTRAINT "demande_devis_ligne_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demande_devis_event" (
    "id" TEXT NOT NULL,
    "demande_id" TEXT NOT NULL,
    "acteur_id" TEXT NOT NULL,
    "acteur_type" VARCHAR(10) NOT NULL,
    "statut" "StatutDemandeDevis" NOT NULL,
    "details" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demande_devis_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "demande_devis_request_id_key" ON "demande_devis"("request_id");

-- CreateIndex
CREATE UNIQUE INDEX "demande_devis_proforma_id_key" ON "demande_devis"("proforma_id");

-- CreateIndex
CREATE INDEX "demande_devis_client_id_created_at_idx" ON "demande_devis"("client_id", "created_at");

-- CreateIndex
CREATE INDEX "demande_devis_statut_responsable_id_created_at_idx" ON "demande_devis"("statut", "responsable_id", "created_at");

-- CreateIndex
CREATE INDEX "demande_devis_ligne_demande_id_ordre_idx" ON "demande_devis_ligne"("demande_id", "ordre");

-- CreateIndex
CREATE INDEX "demande_devis_event_demande_id_created_at_idx" ON "demande_devis_event"("demande_id", "created_at");

-- AddForeignKey
ALTER TABLE "demande_devis" ADD CONSTRAINT "demande_devis_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demande_devis" ADD CONSTRAINT "demande_devis_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "admin_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demande_devis" ADD CONSTRAINT "demande_devis_proforma_id_fkey" FOREIGN KEY ("proforma_id") REFERENCES "proforma"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demande_devis_ligne" ADD CONSTRAINT "demande_devis_ligne_demande_id_fkey" FOREIGN KEY ("demande_id") REFERENCES "demande_devis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demande_devis_event" ADD CONSTRAINT "demande_devis_event_demande_id_fkey" FOREIGN KEY ("demande_id") REFERENCES "demande_devis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
