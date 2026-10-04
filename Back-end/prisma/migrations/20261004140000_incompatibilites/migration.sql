-- CreateEnum
CREATE TYPE "StatutIncompatibilite" AS ENUM ('SIGNALE', 'EN_EXAMEN', 'RESOLU_SANS_RETOUR', 'CLOTURE', 'RETOUR_CONFIRME');

-- AlterTable
ALTER TABLE "commande_guest_challenge" ADD COLUMN     "incompatibilite_content_hash" VARCHAR(64),
ADD COLUMN     "incompatibilite_line_id" TEXT;

-- CreateTable
CREATE TABLE "dossier_incompatibilite" (
    "id" UUID NOT NULL,
    "ligne_commande_id" TEXT NOT NULL,
    "request_id" UUID NOT NULL,
    "fingerprint" VARCHAR(64) NOT NULL,
    "quantite" INTEGER NOT NULL,
    "motif" VARCHAR(12) NOT NULL,
    "description" VARCHAR(2000) NOT NULL,
    "statut" "StatutIncompatibilite" NOT NULL DEFAULT 'SIGNALE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reponse_boutique" VARCHAR(1000),
    "retour_quantite" INTEGER,
    "retour_confirme_at" TIMESTAMPTZ(6),
    "diagnostic" VARCHAR(12),

    CONSTRAINT "dossier_incompatibilite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incompatibilite_decision" (
    "request_id" UUID NOT NULL,
    "dossier_id" UUID NOT NULL,
    "fingerprint" VARCHAR(64) NOT NULL,
    "acteur_id" TEXT NOT NULL,
    "action" "StatutIncompatibilite" NOT NULL,
    "reponse" VARCHAR(1000) NOT NULL,
    "resultat" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incompatibilite_decision_pkey" PRIMARY KEY ("request_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dossier_incompatibilite_ligne_commande_id_key" ON "dossier_incompatibilite"("ligne_commande_id");

-- CreateIndex
CREATE UNIQUE INDEX "dossier_incompatibilite_request_id_key" ON "dossier_incompatibilite"("request_id");

-- CreateIndex
CREATE INDEX "dossier_incompatibilite_statut_created_at_id_idx" ON "dossier_incompatibilite"("statut", "created_at", "id");

-- CreateIndex
CREATE INDEX "dossier_incompatibilite_retour_confirme_at_idx" ON "dossier_incompatibilite"("retour_confirme_at");

-- CreateIndex
CREATE INDEX "incompatibilite_decision_dossier_id_created_at_idx" ON "incompatibilite_decision"("dossier_id", "created_at");

-- AddForeignKey
ALTER TABLE "dossier_incompatibilite" ADD CONSTRAINT "dossier_incompatibilite_ligne_commande_id_fkey" FOREIGN KEY ("ligne_commande_id") REFERENCES "ligne_commande"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incompatibilite_decision" ADD CONSTRAINT "incompatibilite_decision_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "dossier_incompatibilite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Additional integrity beyond Prisma: a report is not a confirmed return.
ALTER TABLE "dossier_incompatibilite"
ADD CONSTRAINT "incompatibilite_quantite_bounds" CHECK (quantite BETWEEN 1 AND 1000000 AND version > 0),
ADD CONSTRAINT "incompatibilite_motif_closed" CHECK (motif IN ('TENSION','BROCHAGE','FORMAT','FONCTION','AUTRE')),
ADD CONSTRAINT "incompatibilite_fingerprint" CHECK (fingerprint ~ '^[0-9a-f]{64}$'),
ADD CONSTRAINT "incompatibilite_description_length" CHECK (length(btrim(description)) BETWEEN 10 AND 2000),
ADD CONSTRAINT "incompatibilite_return_complete" CHECK (
  (statut = 'RETOUR_CONFIRME' AND retour_quantite IS NOT NULL AND retour_quantite BETWEEN 1 AND quantite
    AND retour_confirme_at IS NOT NULL AND diagnostic IS NOT NULL
    AND diagnostic IN ('TENSION','BROCHAGE','FORMAT','FONCTION','AUTRE'))
  OR (statut <> 'RETOUR_CONFIRME' AND retour_quantite IS NULL AND retour_confirme_at IS NULL AND diagnostic IS NULL)
);
ALTER TABLE "incompatibilite_decision"
ADD CONSTRAINT "incompatibilite_decision_action" CHECK (action <> 'SIGNALE'),
ADD CONSTRAINT "incompatibilite_decision_fingerprint" CHECK (fingerprint ~ '^[0-9a-f]{64}$'),
ADD CONSTRAINT "incompatibilite_decision_response" CHECK (length(btrim(reponse)) BETWEEN 10 AND 1000);
ALTER TABLE "commande_guest_challenge"
ADD CONSTRAINT "guest_incompatibilite_binding" CHECK (
  purpose <> 'RETURN' OR (incompatibilite_line_id IS NOT NULL AND incompatibilite_content_hash IS NOT NULL
    AND incompatibilite_content_hash ~ '^[0-9a-f]{64}$' AND grant_version IS NOT NULL AND order_version IS NOT NULL)
);
