-- Additive attribution only. Existing orders and requests keep an unknown source.
BEGIN;
ALTER TABLE "commande" ADD COLUMN "canal_entree" VARCHAR(24);
ALTER TABLE "demande_devis" ADD COLUMN "canal_entree" VARCHAR(24);
ALTER TABLE "commande" ADD CONSTRAINT "commande_canal_entree_check" CHECK
  ("canal_entree" IN ('RECHERCHE_NATURELLE','CAMPAGNE_PAYANTE','SOCIAL','SITE_REFERENT','DIRECT_OU_INCONNU'));
ALTER TABLE "demande_devis" ADD CONSTRAINT "demande_devis_canal_entree_check" CHECK
  ("canal_entree" IN ('RECHERCHE_NATURELLE','CAMPAGNE_PAYANTE','SOCIAL','SITE_REFERENT','DIRECT_OU_INCONNU'));
CREATE TABLE "parcours_acquisition_jour" (
  "jour" DATE NOT NULL,
  "evenement" VARCHAR(40) NOT NULL,
  "langue" VARCHAR(2) NOT NULL,
  "appareil" VARCHAR(10) NOT NULL,
  "reception" VARCHAR(25) NOT NULL,
  "canal_entree" VARCHAR(24) NOT NULL,
  "nombre" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "parcours_acquisition_jour_pkey" PRIMARY KEY ("jour","evenement","langue","appareil","reception","canal_entree"),
  CONSTRAINT "parcours_acquisition_jour_canal_check" CHECK
    ("canal_entree" IN ('RECHERCHE_NATURELLE','CAMPAGNE_PAYANTE','SOCIAL','SITE_REFERENT','DIRECT_OU_INCONNU','NON_RENSEIGNEE')),
  CONSTRAINT "parcours_acquisition_jour_dimensions" CHECK (
    evenement IN ('RECHERCHE_VIDE','FICHE_OUVERTE','AJOUT_PANIER','FRAIS_VUS','SORTIE_APRES_FRAIS','REACHAT_AJOUTE','WHATSAPP_OUVERT','CONSEIL_OUVERT','DEVIS_COMMENCE')
    AND langue IN ('fr','en') AND appareil IN ('mobile','tablette','ordinateur')
    AND reception IN ('GENERAL','RETRAIT','LIVRAISON_A_CONFIRMER','LIVRAISON_CALCULEE')
    AND (CASE WHEN evenement IN ('FRAIS_VUS','SORTIE_APRES_FRAIS') THEN reception <> 'GENERAL' ELSE reception = 'GENERAL' END)
    AND nombre > 0
  )
);
COMMIT;
