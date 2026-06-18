-- Enums
CREATE TYPE "StatutFactureVirtuelle" AS ENUM ('EN_ATTENTE', 'APPROUVEE', 'REFUSEE');
CREATE TYPE "ModeMajoration" AS ENUM ('GLOBAL', 'PAR_LIGNE');

-- Table facture_virtuelle
CREATE TABLE "facture_virtuelle" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "facture_reelle_id" TEXT NOT NULL,
    "vente_id" TEXT NOT NULL,
    "client_id" TEXT,
    "vendeur_id" TEXT NOT NULL,
    "approuveur_id" TEXT,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_approbation" TIMESTAMP(3),
    "pourcentage_majoration" DECIMAL(5,2) NOT NULL,
    "total_ttc" DECIMAL(12,2) NOT NULL,
    "total_reel_ttc" DECIMAL(12,2) NOT NULL,
    "marge_demarcheur" DECIMAL(12,2) NOT NULL,
    "mode_majoration" "ModeMajoration" NOT NULL DEFAULT 'GLOBAL',
    "statut" "StatutFactureVirtuelle" NOT NULL DEFAULT 'EN_ATTENTE',
    "motif_refus" TEXT,
    "print_count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "facture_virtuelle_pkey" PRIMARY KEY ("id")
);

-- Table facture_virtuelle_ligne
CREATE TABLE "facture_virtuelle_ligne" (
    "id" TEXT NOT NULL,
    "facture_virtuelle_id" TEXT NOT NULL,
    "nom_produit" VARCHAR(150) NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prix_unitaire_reel_ttc" DECIMAL(10,2) NOT NULL,
    "pourcentage_ligne" DECIMAL(5,2) NOT NULL,
    "prix_unitaire_ttc" DECIMAL(10,2) NOT NULL,
    "sous_total_ttc" DECIMAL(12,2) NOT NULL,
    CONSTRAINT "facture_virtuelle_ligne_pkey" PRIMARY KEY ("id")
);

-- Index et contraintes d'unicité (1 facture virtuelle par vente)
CREATE UNIQUE INDEX "facture_virtuelle_numero_key" ON "facture_virtuelle"("numero");
CREATE UNIQUE INDEX "facture_virtuelle_facture_reelle_id_key" ON "facture_virtuelle"("facture_reelle_id");
CREATE UNIQUE INDEX "facture_virtuelle_vente_id_key" ON "facture_virtuelle"("vente_id");

-- Foreign keys
ALTER TABLE "facture_virtuelle" ADD CONSTRAINT "fv_facture_fk" FOREIGN KEY ("facture_reelle_id") REFERENCES "facture"("id");
ALTER TABLE "facture_virtuelle" ADD CONSTRAINT "fv_vente_fk" FOREIGN KEY ("vente_id") REFERENCES "vente"("id");
ALTER TABLE "facture_virtuelle" ADD CONSTRAINT "fv_client_fk" FOREIGN KEY ("client_id") REFERENCES "client"("id");
ALTER TABLE "facture_virtuelle" ADD CONSTRAINT "fv_vendeur_fk" FOREIGN KEY ("vendeur_id") REFERENCES "admin_user"("id");
ALTER TABLE "facture_virtuelle" ADD CONSTRAINT "fv_approuveur_fk" FOREIGN KEY ("approuveur_id") REFERENCES "admin_user"("id");
ALTER TABLE "facture_virtuelle_ligne" ADD CONSTRAINT "fvl_fv_fk" FOREIGN KEY ("facture_virtuelle_id") REFERENCES "facture_virtuelle"("id") ON DELETE CASCADE;

-- Nouveaux types de notification
ALTER TYPE "TypeNotification" ADD VALUE IF NOT EXISTS 'FACTURE_VIRTUELLE_DEMANDE';
ALTER TYPE "TypeNotification" ADD VALUE IF NOT EXISTS 'FACTURE_VIRTUELLE_APPROUVEE';
ALTER TYPE "TypeNotification" ADD VALUE IF NOT EXISTS 'FACTURE_VIRTUELLE_REFUSEE';
