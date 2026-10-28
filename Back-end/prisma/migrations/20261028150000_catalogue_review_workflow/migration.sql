-- Additive: preserve prices, stock, sales, and existing review decisions.
ALTER TABLE produit
  ADD COLUMN IF NOT EXISTS identification_revision INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS photo_revision INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS identification_verifie_revision INTEGER,
  ADD COLUMN IF NOT EXISTS identification_verifie_at TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS identification_verifie_par TEXT,
  ADD COLUMN IF NOT EXISTS photo_verifie_revision INTEGER,
  ADD COLUMN IF NOT EXISTS photo_verifie_at TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS photo_verifie_par TEXT,
  ADD COLUMN IF NOT EXISTS reference_fabricant VARCHAR(150);
ALTER TABLE catalogue_proposition
  ADD COLUMN IF NOT EXISTS identification_revision INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS photo_revision INTEGER NOT NULL DEFAULT 1;
ALTER TABLE catalogue_proposition DROP CONSTRAINT IF EXISTS catalogue_proposition_sujet_check;
ALTER TABLE catalogue_proposition ADD CONSTRAINT catalogue_proposition_sujet_check
  CHECK (sujet IN ('PRIX','CLASSEMENT','IDENTIFICATION','PHOTO','COMPLET','ARCHIVAGE'));
CREATE TABLE IF NOT EXISTS catalogue_presence (
  auteur_id TEXT PRIMARY KEY, auteur_nom TEXT NOT NULL, produit_id TEXT NOT NULL,
  expire_at TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS catalogue_presence_produit_id_expire_at_idx ON catalogue_presence(produit_id,expire_at);
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
      UPDATE catalogue_proposition SET statut='OBSOLETE',traite_at=CURRENT_TIMESTAMP WHERE produit_id=OLD.id AND sujet IN ('PRIX','COMPLET') AND statut='EN_ATTENTE';
    END IF;
    IF ROW(NEW.id_categorie,NEW.sous_categorie_id) IS DISTINCT FROM ROW(OLD.id_categorie,OLD.sous_categorie_id) THEN
      NEW.classement_revision=OLD.classement_revision+1;
      NEW.classement_verifie_revision=NULL; NEW.classement_verifie_at=NULL; NEW.classement_verifie_par=NULL;
      UPDATE catalogue_proposition SET statut='OBSOLETE',traite_at=CURRENT_TIMESTAMP WHERE produit_id=OLD.id AND sujet IN ('CLASSEMENT','COMPLET') AND statut='EN_ATTENTE';
    END IF;
    IF ROW(NEW.nom_produit,NEW.marque,NEW.reference_fabricant) IS DISTINCT FROM ROW(OLD.nom_produit,OLD.marque,OLD.reference_fabricant) THEN
      NEW.identification_revision=OLD.identification_revision+1;
      NEW.identification_verifie_revision=NULL; NEW.identification_verifie_at=NULL; NEW.identification_verifie_par=NULL;
      UPDATE catalogue_proposition SET statut='OBSOLETE',traite_at=CURRENT_TIMESTAMP WHERE produit_id=OLD.id AND sujet IN ('IDENTIFICATION','COMPLET') AND statut='EN_ATTENTE';
    END IF;
    IF ROW(NEW.image_url,NEW.image_url2,NEW.image_url3) IS DISTINCT FROM ROW(OLD.image_url,OLD.image_url2,OLD.image_url3) THEN
      NEW.photo_revision=OLD.photo_revision+1;
      NEW.photo_verifie_revision=NULL; NEW.photo_verifie_at=NULL; NEW.photo_verifie_par=NULL;
      UPDATE catalogue_proposition SET statut='OBSOLETE',traite_at=CURRENT_TIMESTAMP WHERE produit_id=OLD.id AND sujet IN ('PHOTO','COMPLET') AND statut='EN_ATTENTE';
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
