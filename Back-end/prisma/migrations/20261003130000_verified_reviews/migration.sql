-- CreateEnum
CREATE TYPE "StatutAvis" AS ENUM ('EN_ATTENTE', 'PUBLIE', 'REFUSE');

-- CreateTable
CREATE TABLE "avis_produit" (
    "id" UUID NOT NULL,
    "ligne_commande_id" TEXT NOT NULL,
    "request_id" UUID NOT NULL,
    "fingerprint" VARCHAR(64) NOT NULL,
    "note" INTEGER NOT NULL,
    "texte" VARCHAR(2000) NOT NULL,
    "pseudonyme" VARCHAR(40) NOT NULL,
    "projet_realise" VARCHAR(300),
    "statut" "StatutAvis" NOT NULL DEFAULT 'EN_ATTENTE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reponse_boutique" VARCHAR(1000),

    CONSTRAINT "avis_produit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avis_moderation" (
    "request_id" UUID NOT NULL,
    "avis_id" UUID NOT NULL,
    "fingerprint" VARCHAR(64) NOT NULL,
    "acteur_id" TEXT NOT NULL,
    "action" VARCHAR(12) NOT NULL,
    "motif" VARCHAR(30),
    "resultat" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avis_moderation_pkey" PRIMARY KEY ("request_id")
);

-- CreateTable
CREATE TABLE "avis_signalement" (
    "id" UUID NOT NULL,
    "avis_id" UUID NOT NULL,
    "client_id" TEXT NOT NULL,
    "motif" VARCHAR(30) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avis_signalement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "avis_produit_ligne_commande_id_key" ON "avis_produit"("ligne_commande_id");

-- CreateIndex
CREATE UNIQUE INDEX "avis_produit_request_id_key" ON "avis_produit"("request_id");

-- CreateIndex
CREATE INDEX "avis_produit_statut_created_at_id_idx" ON "avis_produit"("statut", "created_at", "id");

-- CreateIndex
CREATE INDEX "avis_moderation_avis_id_created_at_idx" ON "avis_moderation"("avis_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "avis_signalement_avis_id_client_id_key" ON "avis_signalement"("avis_id", "client_id");

-- AddForeignKey
ALTER TABLE "avis_produit" ADD CONSTRAINT "avis_produit_ligne_commande_id_fkey" FOREIGN KEY ("ligne_commande_id") REFERENCES "ligne_commande"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avis_moderation" ADD CONSTRAINT "avis_moderation_avis_id_fkey" FOREIGN KEY ("avis_id") REFERENCES "avis_produit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avis_signalement" ADD CONSTRAINT "avis_signalement_avis_id_fkey" FOREIGN KEY ("avis_id") REFERENCES "avis_produit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
