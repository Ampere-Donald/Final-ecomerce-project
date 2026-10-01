-- CreateEnum
CREATE TYPE "StatutProjet" AS ENUM ('BROUILLON', 'PUBLIE');

-- CreateEnum
CREATE TYPE "NiveauProjet" AS ENUM ('DEBUTANT', 'INTERMEDIAIRE', 'AVANCE');

-- CreateEnum
CREATE TYPE "ActionProjet" AS ENUM ('CREATION', 'MODIFICATION', 'PUBLICATION', 'RETRAIT');

-- CreateTable
CREATE TABLE "projet" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "titre" VARCHAR(150) NOT NULL,
    "titre_en" VARCHAR(150),
    "resume" VARCHAR(500) NOT NULL,
    "resume_en" VARCHAR(500),
    "objectif" VARCHAR(3000) NOT NULL,
    "prerequis" VARCHAR(3000) NOT NULL,
    "contraintes" VARCHAR(3000) NOT NULL,
    "niveau" "NiveauProjet" NOT NULL DEFAULT 'DEBUTANT',
    "image_url" VARCHAR(2048),
    "documents" JSONB NOT NULL,
    "statut" "StatutProjet" NOT NULL DEFAULT 'BROUILLON',
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "debut_publication" TIMESTAMP(3),
    "fin_publication" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "validation_version" INTEGER,
    "valide_par_id" TEXT,
    "valide_at" TIMESTAMP(3),
    "note_validation" VARCHAR(3000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projet_ligne" (
    "id" TEXT NOT NULL,
    "projet_id" TEXT NOT NULL,
    "produit_id" TEXT,
    "produit_id_source" TEXT,
    "reference" VARCHAR(100),
    "nom_produit" VARCHAR(150) NOT NULL,
    "role" VARCHAR(150) NOT NULL,
    "quantite" INTEGER NOT NULL,
    "necessaire" BOOLEAN NOT NULL DEFAULT true,
    "ordre" INTEGER NOT NULL,
    "empreinte_technique" VARCHAR(64),

    CONSTRAINT "projet_ligne_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projet_event" (
    "id" TEXT NOT NULL,
    "projet_id" TEXT NOT NULL,
    "request_id" UUID NOT NULL,
    "acteur_id" TEXT NOT NULL,
    "action" "ActionProjet" NOT NULL,
    "version_appliquee" INTEGER NOT NULL,
    "empreinte" VARCHAR(64) NOT NULL,
    "details" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projet_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projet_slug_key" ON "projet"("slug");

-- CreateIndex
CREATE INDEX "projet_statut_ordre_debut_publication_fin_publication_idx" ON "projet"("statut", "ordre", "debut_publication", "fin_publication");

-- CreateIndex
CREATE INDEX "projet_ligne_produit_id_idx" ON "projet_ligne"("produit_id");

-- CreateIndex
CREATE UNIQUE INDEX "projet_ligne_projet_id_ordre_key" ON "projet_ligne"("projet_id", "ordre");

-- CreateIndex
CREATE UNIQUE INDEX "projet_event_request_id_key" ON "projet_event"("request_id");

-- CreateIndex
CREATE INDEX "projet_event_projet_id_created_at_idx" ON "projet_event"("projet_id", "created_at");

-- AddForeignKey
ALTER TABLE "projet_ligne" ADD CONSTRAINT "projet_ligne_projet_id_fkey" FOREIGN KEY ("projet_id") REFERENCES "projet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projet_ligne" ADD CONSTRAINT "projet_ligne_produit_id_fkey" FOREIGN KEY ("produit_id") REFERENCES "produit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projet_event" ADD CONSTRAINT "projet_event_projet_id_fkey" FOREIGN KEY ("projet_id") REFERENCES "projet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
