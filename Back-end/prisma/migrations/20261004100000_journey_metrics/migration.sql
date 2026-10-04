CREATE TABLE "parcours_jour" (
  "jour" DATE NOT NULL,
  "evenement" VARCHAR(40) NOT NULL,
  "langue" VARCHAR(2) NOT NULL,
  "appareil" VARCHAR(10) NOT NULL,
  "reception" VARCHAR(25) NOT NULL,
  "nombre" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "parcours_jour_pkey" PRIMARY KEY ("jour","evenement","langue","appareil","reception"),
  CONSTRAINT "parcours_closed_dimensions" CHECK (
    evenement IN ('RECHERCHE_VIDE','FICHE_OUVERTE','AJOUT_PANIER','FRAIS_VUS','SORTIE_APRES_FRAIS','REACHAT_AJOUTE','WHATSAPP_OUVERT')
    AND langue IN ('fr','en') AND appareil IN ('mobile','tablette','ordinateur')
    AND reception IN ('GENERAL','RETRAIT','LIVRAISON_A_CONFIRMER','LIVRAISON_CALCULEE')
    AND (CASE WHEN evenement IN ('FRAIS_VUS','SORTIE_APRES_FRAIS') THEN reception <> 'GENERAL' ELSE reception = 'GENERAL' END)
    AND nombre > 0
  )
);
CREATE TABLE "parcours_recu" (
  "id" UUID NOT NULL,
  "empreinte" VARCHAR(64) NOT NULL,
  "expiration" DATE NOT NULL,
  CONSTRAINT "parcours_recu_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "parcours_receipt_digest" CHECK (empreinte ~ '^[0-9a-f]{64}$')
);
CREATE INDEX "parcours_recu_expiration_idx" ON "parcours_recu"("expiration");
