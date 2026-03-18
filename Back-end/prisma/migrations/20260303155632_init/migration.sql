-- CreateEnum
CREATE TYPE "TypeAttribut" AS ENUM ('TEXTE', 'NOMBRE', 'LISTE');

-- CreateEnum
CREATE TYPE "StatutPaiement" AS ENUM ('PAYE', 'PARTIEL', 'NON_PAYE');

-- CreateEnum
CREATE TYPE "MethodePaiement" AS ENUM ('ESPECES', 'CARTE', 'VIREMENT', 'MOBILE_MONEY');

-- CreateEnum
CREATE TYPE "TypeMouvement" AS ENUM ('ENTREE', 'SORTIE', 'AJUSTEMENT', 'RETOUR');

-- CreateEnum
CREATE TYPE "TypeOperation" AS ENUM ('ENTREE', 'SORTIE');

-- CreateTable
CREATE TABLE "categorie" (
    "id" TEXT NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "categorie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produit" (
    "id" TEXT NOT NULL,
    "id_categorie" TEXT NOT NULL,
    "nom_produit" VARCHAR(150) NOT NULL,
    "marque" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "date_ajout" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "produit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attribut" (
    "id" TEXT NOT NULL,
    "id_produit" TEXT NOT NULL,
    "nom_attribut" VARCHAR(100) NOT NULL,
    "type_attribut" "TypeAttribut" NOT NULL,
    "obligatoire" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "attribut_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "valeur_attribut" (
    "id" TEXT NOT NULL,
    "id_attribut" TEXT NOT NULL,
    "valeur" VARCHAR(100) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "valeur_attribut_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variante_produit" (
    "id" TEXT NOT NULL,
    "id_produit" TEXT NOT NULL,
    "code_variante" VARCHAR(50) NOT NULL,
    "code_barre" VARCHAR(50),
    "prix_achat" DECIMAL(10,2) NOT NULL,
    "prix_vente" DECIMAL(10,2) NOT NULL,
    "quantite_stock" INTEGER NOT NULL DEFAULT 0,
    "seuil_alerte" INTEGER NOT NULL DEFAULT 5,
    "date_ajout" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "variante_produit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variante_produit_attribut" (
    "id" TEXT NOT NULL,
    "id_variante_produit" TEXT NOT NULL,
    "id_attribut" TEXT NOT NULL,
    "id_valeur" TEXT,
    "valeur_personnalisee" VARCHAR(100),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "variante_produit_attribut_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fournisseur" (
    "id" TEXT NOT NULL,
    "nom_entreprise" VARCHAR(150) NOT NULL,
    "contact_nom" VARCHAR(100),
    "telephone" VARCHAR(20),
    "email" VARCHAR(100),
    "adresse" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "fournisseur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client" (
    "id" TEXT NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "prenom" VARCHAR(100),
    "telephone" VARCHAR(20),
    "email" VARCHAR(100),
    "adresse" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achat" (
    "id" TEXT NOT NULL,
    "id_fournisseur" TEXT NOT NULL,
    "date_achat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "montant_total" DECIMAL(12,2) NOT NULL,
    "statut_paiement" "StatutPaiement" NOT NULL DEFAULT 'NON_PAYE',
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "achat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ligne_achat" (
    "id" TEXT NOT NULL,
    "id_achat" TEXT NOT NULL,
    "id_variante_produit" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prix_unitaire" DECIMAL(10,2) NOT NULL,
    "sous_total" DECIMAL(12,2) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ligne_achat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vente" (
    "id" TEXT NOT NULL,
    "id_client" TEXT,
    "date_vente" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "montant_total" DECIMAL(12,2) NOT NULL,
    "methode_paiement" "MethodePaiement" NOT NULL,
    "statut_paiement" "StatutPaiement" NOT NULL DEFAULT 'PAYE',
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "vente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ligne_vente" (
    "id" TEXT NOT NULL,
    "id_vente" TEXT NOT NULL,
    "id_variante_produit" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prix_unitaire" DECIMAL(10,2) NOT NULL,
    "sous_total" DECIMAL(12,2) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ligne_vente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mouvement_stock" (
    "id" TEXT NOT NULL,
    "id_variante_produit" TEXT NOT NULL,
    "type_mouvement" "TypeMouvement" NOT NULL,
    "quantite" INTEGER NOT NULL,
    "date_mouvement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motif" VARCHAR(255),
    "id_reference" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "mouvement_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caisse" (
    "id" TEXT NOT NULL,
    "date_operation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type_operation" "TypeOperation" NOT NULL,
    "montant" DECIMAL(12,2) NOT NULL,
    "motif" VARCHAR(255) NOT NULL,
    "id_vente" TEXT,
    "id_achat" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "caisse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role" (
    "id" TEXT NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categorie_nom_key" ON "categorie"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "produit_marque_nom_produit_key" ON "produit"("marque", "nom_produit");

-- CreateIndex
CREATE UNIQUE INDEX "attribut_id_produit_nom_attribut_key" ON "attribut"("id_produit", "nom_attribut");

-- CreateIndex
CREATE UNIQUE INDEX "valeur_attribut_id_attribut_valeur_key" ON "valeur_attribut"("id_attribut", "valeur");

-- CreateIndex
CREATE UNIQUE INDEX "variante_produit_code_variante_key" ON "variante_produit"("code_variante");

-- CreateIndex
CREATE UNIQUE INDEX "variante_produit_code_barre_key" ON "variante_produit"("code_barre");

-- CreateIndex
CREATE UNIQUE INDEX "variante_produit_attribut_id_variante_produit_id_attribut_key" ON "variante_produit_attribut"("id_variante_produit", "id_attribut");

-- AddForeignKey
ALTER TABLE "produit" ADD CONSTRAINT "produit_id_categorie_fkey" FOREIGN KEY ("id_categorie") REFERENCES "categorie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attribut" ADD CONSTRAINT "attribut_id_produit_fkey" FOREIGN KEY ("id_produit") REFERENCES "produit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valeur_attribut" ADD CONSTRAINT "valeur_attribut_id_attribut_fkey" FOREIGN KEY ("id_attribut") REFERENCES "attribut"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variante_produit" ADD CONSTRAINT "variante_produit_id_produit_fkey" FOREIGN KEY ("id_produit") REFERENCES "produit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variante_produit_attribut" ADD CONSTRAINT "variante_produit_attribut_id_variante_produit_fkey" FOREIGN KEY ("id_variante_produit") REFERENCES "variante_produit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variante_produit_attribut" ADD CONSTRAINT "variante_produit_attribut_id_attribut_fkey" FOREIGN KEY ("id_attribut") REFERENCES "attribut"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variante_produit_attribut" ADD CONSTRAINT "variante_produit_attribut_id_valeur_fkey" FOREIGN KEY ("id_valeur") REFERENCES "valeur_attribut"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achat" ADD CONSTRAINT "achat_id_fournisseur_fkey" FOREIGN KEY ("id_fournisseur") REFERENCES "fournisseur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ligne_achat" ADD CONSTRAINT "ligne_achat_id_achat_fkey" FOREIGN KEY ("id_achat") REFERENCES "achat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ligne_achat" ADD CONSTRAINT "ligne_achat_id_variante_produit_fkey" FOREIGN KEY ("id_variante_produit") REFERENCES "variante_produit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vente" ADD CONSTRAINT "vente_id_client_fkey" FOREIGN KEY ("id_client") REFERENCES "client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ligne_vente" ADD CONSTRAINT "ligne_vente_id_vente_fkey" FOREIGN KEY ("id_vente") REFERENCES "vente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ligne_vente" ADD CONSTRAINT "ligne_vente_id_variante_produit_fkey" FOREIGN KEY ("id_variante_produit") REFERENCES "variante_produit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvement_stock" ADD CONSTRAINT "mouvement_stock_id_variante_produit_fkey" FOREIGN KEY ("id_variante_produit") REFERENCES "variante_produit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caisse" ADD CONSTRAINT "caisse_id_vente_fkey" FOREIGN KEY ("id_vente") REFERENCES "vente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caisse" ADD CONSTRAINT "caisse_id_achat_fkey" FOREIGN KEY ("id_achat") REFERENCES "achat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
