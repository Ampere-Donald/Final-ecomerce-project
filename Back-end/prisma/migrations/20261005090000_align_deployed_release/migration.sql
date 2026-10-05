-- Align legacy ensure-schema objects with the reviewed Prisma release contract.
-- No business rows, enum labels or migration ledger entries are changed.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';
ALTER TABLE "admin_user" ALTER COLUMN "username" DROP NOT NULL;
ALTER TABLE "document_sequence" ALTER COLUMN "updated_at" DROP DEFAULT;

-- Replace legacy FK names/actions atomically; validation preserves referential integrity.
ALTER TABLE "facture_virtuelle" DROP CONSTRAINT IF EXISTS "fv_approuveur_fk";
ALTER TABLE "facture_virtuelle" DROP CONSTRAINT IF EXISTS "fv_client_fk";
ALTER TABLE "facture_virtuelle" DROP CONSTRAINT IF EXISTS "fv_facture_fk";
ALTER TABLE "facture_virtuelle" DROP CONSTRAINT IF EXISTS "fv_vendeur_fk";
ALTER TABLE "facture_virtuelle" DROP CONSTRAINT IF EXISTS "fv_vente_fk";
ALTER TABLE "facture_virtuelle_ligne" DROP CONSTRAINT IF EXISTS "fvl_fv_fk";
DO $$
DECLARE item RECORD;
BEGIN
  FOR item IN SELECT * FROM (VALUES
    ('facture_virtuelle', 'facture_virtuelle_approuveur_id_fkey', 'FOREIGN KEY (approuveur_id) REFERENCES admin_user(id) ON UPDATE CASCADE ON DELETE SET NULL'),
    ('facture_virtuelle', 'facture_virtuelle_client_id_fkey', 'FOREIGN KEY (client_id) REFERENCES client(id) ON UPDATE CASCADE ON DELETE SET NULL'),
    ('facture_virtuelle', 'facture_virtuelle_facture_reelle_id_fkey', 'FOREIGN KEY (facture_reelle_id) REFERENCES facture(id) ON UPDATE CASCADE ON DELETE RESTRICT'),
    ('facture_virtuelle', 'facture_virtuelle_vendeur_id_fkey', 'FOREIGN KEY (vendeur_id) REFERENCES admin_user(id) ON UPDATE CASCADE ON DELETE RESTRICT'),
    ('facture_virtuelle', 'facture_virtuelle_vente_id_fkey', 'FOREIGN KEY (vente_id) REFERENCES vente(id) ON UPDATE CASCADE ON DELETE RESTRICT'),
    ('facture_virtuelle_ligne', 'facture_virtuelle_ligne_facture_virtuelle_id_fkey', 'FOREIGN KEY (facture_virtuelle_id) REFERENCES facture_virtuelle(id) ON UPDATE CASCADE ON DELETE CASCADE')
  ) AS entries(table_name, constraint_name, definition)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.' || item.table_name) AND conname = item.constraint_name) THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I %s', item.table_name, item.constraint_name, item.definition);
    END IF;
  END LOOP;
  IF to_regclass('public.produit_code_famille_code_key') IS NULL AND to_regclass('public.unique_code_produit') IS NOT NULL THEN
    ALTER INDEX "unique_code_produit" RENAME TO "produit_code_famille_code_key";
  END IF;
END $$;
COMMIT;
