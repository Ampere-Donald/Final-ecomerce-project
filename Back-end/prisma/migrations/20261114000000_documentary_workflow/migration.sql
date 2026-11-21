-- Prepared only; never apply to production without the validated release gates.
CREATE TABLE "documentary_batch" (
  "id" TEXT PRIMARY KEY,
  "source_sha256" TEXT NOT NULL UNIQUE,
  "source_name" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actor_id" TEXT NOT NULL
);
CREATE TABLE "product_documentary" (
  "product_id" TEXT PRIMARY KEY REFERENCES "produit"("id") ON DELETE RESTRICT,
  "revision" INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  "status" TEXT NOT NULL DEFAULT 'enrichi_ia_a_verifier'
    CHECK (status IN ('enrichi_ia_a_verifier','valide_admin','identification_insuffisante','classification_requise')),
  "locked" BOOLEAN NOT NULL DEFAULT FALSE,
  "short_description" TEXT,
  "proposal" JSONB,
  "sources" JSONB NOT NULL DEFAULT '[]',
  "uncertainties" JSONB NOT NULL DEFAULT '[]',
  "origin" TEXT NOT NULL DEFAULT 'ai' CHECK (origin IN ('ai','admin','rollback')),
  "batch_id" TEXT REFERENCES "documentary_batch"("id") ON DELETE RESTRICT,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed_at" TIMESTAMPTZ,
  "reviewed_by" TEXT,
  CHECK (status <> 'valide_admin' OR locked)
);
CREATE INDEX "product_documentary_status_idx" ON "product_documentary"("status");
CREATE TABLE "documentary_event" (
  "id" TEXT PRIMARY KEY,
  "operation_id" TEXT NOT NULL UNIQUE,
  "product_id" TEXT NOT NULL REFERENCES "produit"("id") ON DELETE RESTRICT,
  "batch_id" TEXT REFERENCES "documentary_batch"("id") ON DELETE RESTRICT,
  "action" TEXT NOT NULL CHECK (action IN ('import','publish','edit','validate','unlock','rollback')),
  "actor_id" TEXT NOT NULL,
  "before" JSONB NOT NULL,
  "after" JSONB NOT NULL,
  "revision_before" INTEGER NOT NULL,
  "revision_after" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "documentary_event_product_time_idx" ON "documentary_event"("product_id", "created_at");
CREATE INDEX "documentary_event_batch_idx" ON "documentary_event"("batch_id");

-- Protect text edits made through legacy endpoints and maintenance tools too.
CREATE FUNCTION documentary_protect_legacy_edit() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  prior product_documentary%ROWTYPE;
  updated product_documentary%ROWTYPE;
  actor text;
  event_id text;
BEGIN
  IF OLD.nom_produit IS NOT DISTINCT FROM NEW.nom_produit AND OLD.description IS NOT DISTINCT FROM NEW.description THEN RETURN NEW; END IF;
  IF current_setting('newoteg.documentary_managed', true) = 'true' THEN RETURN NEW; END IF;
  actor := COALESCE(NULLIF(current_setting('newoteg.documentary_actor',true),''),'legacy-unattributed');
  SELECT * INTO prior FROM product_documentary WHERE product_id=NEW.id FOR UPDATE;
  INSERT INTO product_documentary(product_id,revision,status,locked,origin,reviewed_at,reviewed_by)
    VALUES(NEW.id,1,'enrichi_ia_a_verifier',true,'admin',CURRENT_TIMESTAMP,actor)
    ON CONFLICT(product_id) DO UPDATE SET revision=product_documentary.revision+1,locked=true,
      origin='admin',updated_at=CURRENT_TIMESTAMP,reviewed_at=CURRENT_TIMESTAMP,reviewed_by=actor
    RETURNING * INTO updated;
  event_id := gen_random_uuid()::text;
  INSERT INTO documentary_event(id,operation_id,product_id,batch_id,action,actor_id,"before","after",revision_before,revision_after)
    VALUES(event_id,'legacy-' || event_id,NEW.id,updated.batch_id,'edit',actor,
      jsonb_build_object('title',OLD.nom_produit,'description',OLD.description,'documentary',to_jsonb(prior)),
      jsonb_build_object('title',NEW.nom_produit,'description',NEW.description,'documentary',to_jsonb(updated)),
      COALESCE(prior.revision,0),updated.revision);
  RETURN NEW;
END;
$$;
CREATE TRIGGER documentary_legacy_text_edit AFTER UPDATE OF nom_produit,description ON produit
FOR EACH ROW EXECUTE FUNCTION documentary_protect_legacy_edit();
