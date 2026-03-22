-- CreateEnum
CREATE TYPE "TypeClient" AS ENUM ('PARTICULIER', 'PROFESSIONNEL');

-- CreateEnum
CREATE TYPE "StatutCommande" AS ENUM ('EN_ATTENTE', 'CONFIRMEE', 'EN_LIVRAISON', 'LIVREE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "ModeReception" AS ENUM ('LIVRAISON', 'RETRAIT_MAGASIN');

-- CreateEnum
CREATE TYPE "TypeNotification" AS ENUM ('COMMANDE_CREEE', 'COMMANDE_STATUT', 'PRODUIT_CREE', 'PRODUIT_MAJ', 'STOCK_CHANGE', 'CATEGORIE_CREEE', 'CATEGORIE_MAJ', 'VENTE_CREEE', 'ACHAT_CREE');

-- AlterTable: add missing columns to client
ALTER TABLE "client" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "client" ADD COLUMN "email_verifie" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "client" ADD COLUMN "mot_de_passe" TEXT;
ALTER TABLE "client" ADD COLUMN "otp_code" VARCHAR(6);
ALTER TABLE "client" ADD COLUMN "otp_expires_at" TIMESTAMP(3);
ALTER TABLE "client" ADD COLUMN "type_client" "TypeClient" NOT NULL DEFAULT 'PARTICULIER';
ALTER TABLE "client" ADD COLUMN "google_id" TEXT;

-- CreateIndex: unique constraints on client
CREATE UNIQUE INDEX "client_telephone_key" ON "client"("telephone");
CREATE UNIQUE INDEX "client_email_key" ON "client"("email");
CREATE UNIQUE INDEX "client_google_id_key" ON "client"("google_id");

-- AlterTable: add missing columns to produit
ALTER TABLE "produit" ADD COLUMN "url_datasheet" TEXT;
ALTER TABLE "produit" ADD COLUMN "fin_promo" TIMESTAMP(3);
ALTER TABLE "produit" ADD COLUMN "is_populaire" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "produit" ADD COLUMN "prix_promo" DOUBLE PRECISION;
ALTER TABLE "produit" ADD COLUMN "image_url2" TEXT;
ALTER TABLE "produit" ADD COLUMN "image_url3" TEXT;

-- CreateTable
CREATE TABLE "commande" (
    "id" TEXT NOT NULL,
    "numero_suivi" VARCHAR(30) NOT NULL,
    "nom_client" VARCHAR(150) NOT NULL,
    "telephone" VARCHAR(30) NOT NULL,
    "adresse_livraison" TEXT NOT NULL,
    "montant_total" DECIMAL(12,2) NOT NULL,
    "statut" "StatutCommande" NOT NULL DEFAULT 'EN_ATTENTE',
    "date_commande" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    "client_id" TEXT,
    "mode_reception" "ModeReception" NOT NULL DEFAULT 'LIVRAISON',

    CONSTRAINT "commande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favori" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "produit_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favori_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ligne_commande" (
    "id" TEXT NOT NULL,
    "id_commande" TEXT NOT NULL,
    "id_produit" TEXT NOT NULL,
    "nom_produit" VARCHAR(150) NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prix_unitaire" DECIMAL(10,2) NOT NULL,
    "sous_total" DECIMAL(12,2) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ligne_commande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "type" "TypeNotification" NOT NULL,
    "message" TEXT NOT NULL,
    "lue" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newsletter" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "newsletter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "commande_numero_suivi_key" ON "commande"("numero_suivi");

-- CreateIndex
CREATE UNIQUE INDEX "favori_client_id_produit_id_key" ON "favori"("client_id", "produit_id");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_email_key" ON "newsletter"("email");

-- AddForeignKey
ALTER TABLE "commande" ADD CONSTRAINT "commande_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favori" ADD CONSTRAINT "favori_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favori" ADD CONSTRAINT "favori_produit_id_fkey" FOREIGN KEY ("produit_id") REFERENCES "produit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ligne_commande" ADD CONSTRAINT "ligne_commande_id_commande_fkey" FOREIGN KEY ("id_commande") REFERENCES "commande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ligne_commande" ADD CONSTRAINT "ligne_commande_id_produit_fkey" FOREIGN KEY ("id_produit") REFERENCES "produit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
