CREATE TABLE IF NOT EXISTS "sous_categorie" (
  "id" TEXT PRIMARY KEY, "categorie_id" TEXT NOT NULL REFERENCES "categorie"("id") ON DELETE RESTRICT,
  "nom" VARCHAR(100) NOT NULL, UNIQUE("categorie_id", "nom")
);
ALTER TABLE "produit"
  ADD COLUMN IF NOT EXISTS "sous_categorie_id" TEXT REFERENCES "sous_categorie"("id") ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS "prix_revision" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "classement_revision" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "commercial_revision" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "prix_verifie_revision" INTEGER,
  ADD COLUMN IF NOT EXISTS "prix_verifie_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "prix_verifie_par" TEXT,
  ADD COLUMN IF NOT EXISTS "classement_verifie_revision" INTEGER,
  ADD COLUMN IF NOT EXISTS "classement_verifie_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "classement_verifie_par" TEXT;
CREATE INDEX IF NOT EXISTS "produit_sous_categorie_id_idx" ON "produit"("sous_categorie_id");
CREATE TABLE IF NOT EXISTS "catalogue_proposition" (
  "id" TEXT PRIMARY KEY, "produit_id" TEXT NOT NULL REFERENCES "produit"("id") ON DELETE RESTRICT,
  "auteur_id" TEXT NOT NULL, "auteur_nom" TEXT NOT NULL,
  "sujet" VARCHAR(20) NOT NULL CHECK (sujet IN ('PRIX','CLASSEMENT','ARCHIVAGE')),
  "type" VARCHAR(20) NOT NULL CHECK ("type" IN ('CONFIRMATION','CORRECTION','DISCUSSION')),
  "statut" VARCHAR(20) NOT NULL DEFAULT 'EN_ATTENTE' CHECK (statut IN ('EN_ATTENTE','ACCEPTEE','REFUSEE','OBSOLETE')),
  "commentaire" VARCHAR(1000), "observe" JSONB NOT NULL, "changements" JSONB NOT NULL,
  "prix_revision" INTEGER NOT NULL, "classement_revision" INTEGER NOT NULL, "commercial_revision" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "traite_at" TIMESTAMP(3), "traite_par" TEXT
);
CREATE INDEX IF NOT EXISTS "catalogue_proposition_produit_id_statut_idx" ON "catalogue_proposition"("produit_id","statut");
CREATE INDEX IF NOT EXISTS "catalogue_proposition_auteur_id_statut_idx" ON "catalogue_proposition"("auteur_id","statut");
CREATE TABLE IF NOT EXISTS "catalogue_evenement" (
  "id" TEXT PRIMARY KEY, "operation_id" TEXT NOT NULL UNIQUE, "requete_hash" TEXT NOT NULL,
  "produit_id" TEXT NOT NULL REFERENCES "produit"("id") ON DELETE RESTRICT,
  "acteur_id" TEXT NOT NULL, "acteur_nom" TEXT NOT NULL, "action" VARCHAR(50) NOT NULL,
  "avant" JSONB NOT NULL, "apres" JSONB NOT NULL, "resultat" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "catalogue_evenement_produit_id_created_at_idx" ON "catalogue_evenement"("produit_id","created_at");

-- All writers, including SQL imports and purchasing, invalidate only the affected review.
CREATE OR REPLACE FUNCTION newoteg_catalogue_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.sous_categorie_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM sous_categorie WHERE id=NEW.sous_categorie_id AND categorie_id=NEW.id_categorie
  ) THEN RAISE EXCEPTION 'La sous-catégorie ne correspond pas à la catégorie' USING ERRCODE='23514'; END IF;
  IF TG_OP='UPDATE' THEN
    IF ROW(NEW.prix_detail,NEW.prix_demi_gros,NEW.prix_gros,NEW.prix_promo,NEW.fin_promo,NEW.quantite_gros)
      IS DISTINCT FROM ROW(OLD.prix_detail,OLD.prix_demi_gros,OLD.prix_gros,OLD.prix_promo,OLD.fin_promo,OLD.quantite_gros) THEN
      NEW.prix_revision=OLD.prix_revision+1;
      NEW.prix_verifie_revision=NULL; NEW.prix_verifie_at=NULL; NEW.prix_verifie_par=NULL;
      UPDATE catalogue_proposition SET statut='OBSOLETE',traite_at=CURRENT_TIMESTAMP WHERE produit_id=OLD.id AND sujet='PRIX' AND statut='EN_ATTENTE';
    END IF;
    IF ROW(NEW.id_categorie,NEW.sous_categorie_id) IS DISTINCT FROM ROW(OLD.id_categorie,OLD.sous_categorie_id) THEN
      NEW.classement_revision=OLD.classement_revision+1;
      NEW.classement_verifie_revision=NULL; NEW.classement_verifie_at=NULL; NEW.classement_verifie_par=NULL;
      UPDATE catalogue_proposition SET statut='OBSOLETE',traite_at=CURRENT_TIMESTAMP WHERE produit_id=OLD.id AND sujet='CLASSEMENT' AND statut='EN_ATTENTE';
    END IF;
    IF NEW.est_actif IS DISTINCT FROM OLD.est_actif THEN
      NEW.commercial_revision=OLD.commercial_revision+1;
      UPDATE catalogue_proposition SET statut='OBSOLETE',traite_at=CURRENT_TIMESTAMP WHERE produit_id=OLD.id AND statut='EN_ATTENTE';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS newoteg_catalogue_revision_trigger ON produit;
CREATE TRIGGER newoteg_catalogue_revision_trigger BEFORE INSERT OR UPDATE ON produit FOR EACH ROW EXECUTE FUNCTION newoteg_catalogue_revision();
