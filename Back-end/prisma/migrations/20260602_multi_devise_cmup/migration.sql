-- CreateEnum
CREATE TYPE "Devise" AS ENUM ('FCFA', 'NGN', 'CNY');

-- CreateEnum
CREATE TYPE "SourceTaux" AS ENUM ('API', 'MANUEL', 'BANQUE', 'BUREAU_CHANGE', 'AUTRE');

-- CreateEnum
CREATE TYPE "StatutAchat" AS ENUM ('BROUILLON', 'VALIDE', 'ANNULE');

-- AlterEnum
ALTER TYPE "TypeNotification" ADD VALUE 'ACHAT_VALIDE';
ALTER TYPE "TypeNotification" ADD VALUE 'ACHAT_ANNULE';
ALTER TYPE "TypeNotification" ADD VALUE 'CMUP_MAJ';

-- AlterTable achat
ALTER TABLE "achat"
ADD COLUMN "annulee_at"          TIMESTAMP(3),
ADD COLUMN "annulee_by_id"       TEXT,
ADD COLUMN "date_taux"           TIMESTAMP(3),
ADD COLUMN "devise"              "Devise"      NOT NULL DEFAULT 'FCFA',
ADD COLUMN "montant_total_devise" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "montant_total_fcfa"  DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "motif_annulation"    VARCHAR(500),
ADD COLUMN "source_taux"         "SourceTaux"  NOT NULL DEFAULT 'MANUEL',
ADD COLUMN "statut_achat"        "StatutAchat" NOT NULL DEFAULT 'BROUILLON',
ADD COLUMN "taux_change"         DECIMAL(12,6) NOT NULL DEFAULT 1,
ADD COLUMN "validated_at"        TIMESTAMP(3),
ADD COLUMN "validated_by_id"     TEXT,
ALTER COLUMN "montant_total" SET DEFAULT 0;

-- Mettre les achats existants en VALIDE (ils ont deja impacte le stock)
UPDATE "achat" SET
  "statut_achat"        = 'VALIDE',
  "montant_total_fcfa"  = "montant_total",
  "montant_total_devise" = "montant_total"
WHERE "statut_achat" = 'BROUILLON';

-- AlterTable echeance
ALTER TABLE "echeance" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable fournisseur
ALTER TABLE "fournisseur"
ADD COLUMN "devise_defaut" "Devise" NOT NULL DEFAULT 'FCFA',
ADD COLUMN "pays"          VARCHAR(100);

-- AlterTable ligne_achat
ALTER TABLE "ligne_achat"
ADD COLUMN "cmup_apres"              DECIMAL(12,2),
ADD COLUMN "cmup_avant"              DECIMAL(12,2),
ADD COLUMN "cout_unitaire_entree_fcfa" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "prix_unitaire_devise"    DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "prix_unitaire_fcfa"      DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "sous_total_devise"       DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "sous_total_fcfa"         DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "stock_apres"             INTEGER,
ADD COLUMN "stock_avant"             INTEGER,
ALTER COLUMN "prix_unitaire" SET DEFAULT 0,
ALTER COLUMN "sous_total"    SET DEFAULT 0;

-- Migrer les anciens champs legacy vers les nouveaux champs FCFA
UPDATE "ligne_achat" SET
  "prix_unitaire_fcfa"       = "prix_unitaire",
  "prix_unitaire_devise"     = "prix_unitaire",
  "cout_unitaire_entree_fcfa" = "prix_unitaire",
  "sous_total_fcfa"          = "sous_total",
  "sous_total_devise"        = "sous_total";

-- AlterTable produit
ALTER TABLE "produit"
ADD COLUMN "cmup_actuel"            DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "dernier_achat_at"       TIMESTAMP(3),
ADD COLUMN "dernier_cout_achat_fcfa" DECIMAL(12,2),
ADD COLUMN "dernier_fournisseur_id" TEXT,
ADD COLUMN "derniere_devise_achat"  "Devise";

-- Initialiser cmupActuel : utiliser prixGros si disponible, sinon 0
UPDATE "produit" SET "cmup_actuel" = COALESCE("prix_gros", 0) WHERE "cmup_actuel" = 0 AND "prix_gros" IS NOT NULL AND "prix_gros" > 0;

-- CreateTable taux_change
CREATE TABLE "taux_change" (
    "id"           TEXT         NOT NULL,
    "devise"       "Devise"     NOT NULL,
    "taux_vers_fcfa" DECIMAL(12,6) NOT NULL,
    "source"       "SourceTaux" NOT NULL,
    "fetched_at"   TIMESTAMP(3) NOT NULL,
    "raw_payload"  JSONB,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "taux_change_pkey" PRIMARY KEY ("id")
);

-- CreateTable mouvement_cmup
CREATE TABLE "mouvement_cmup" (
    "id"                TEXT         NOT NULL,
    "produit_id"        TEXT         NOT NULL,
    "achat_id"          TEXT,
    "ligne_achat_id"    TEXT,
    "type_mouvement"    VARCHAR(50)  NOT NULL,
    "devise"            "Devise"     NOT NULL,
    "taux_change"       DECIMAL(12,6) NOT NULL,
    "quantite_entree"   INTEGER      NOT NULL,
    "cout_unitaire_fcfa" DECIMAL(12,2) NOT NULL,
    "stock_avant"       INTEGER      NOT NULL,
    "stock_apres"       INTEGER      NOT NULL,
    "cmup_avant"        DECIMAL(12,2) NOT NULL,
    "cmup_apres"        DECIMAL(12,2) NOT NULL,
    "created_by_id"     TEXT,
    "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mouvement_cmup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "taux_change_devise_fetched_at_idx" ON "taux_change"("devise", "fetched_at");

-- CreateIndex
CREATE UNIQUE INDEX "mouvement_cmup_ligne_achat_id_key" ON "mouvement_cmup"("ligne_achat_id");

-- CreateIndex
CREATE INDEX "mouvement_cmup_produit_id_created_at_idx" ON "mouvement_cmup"("produit_id", "created_at");

-- CreateIndex
CREATE INDEX "mouvement_cmup_achat_id_idx" ON "mouvement_cmup"("achat_id");

-- CreateIndex
CREATE INDEX "achat_statut_achat_idx" ON "achat"("statut_achat");

-- CreateIndex
CREATE INDEX "achat_id_fournisseur_idx" ON "achat"("id_fournisseur");

-- AddForeignKey
ALTER TABLE "mouvement_cmup" ADD CONSTRAINT "mouvement_cmup_produit_id_fkey"
  FOREIGN KEY ("produit_id") REFERENCES "produit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "mouvement_cmup" ADD CONSTRAINT "mouvement_cmup_achat_id_fkey"
  FOREIGN KEY ("achat_id") REFERENCES "achat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "mouvement_cmup" ADD CONSTRAINT "mouvement_cmup_ligne_achat_id_fkey"
  FOREIGN KEY ("ligne_achat_id") REFERENCES "ligne_achat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
