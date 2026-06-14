-- Prix variable par bornes selon le rôle
-- Idempotent : ADD COLUMN IF NOT EXISTS (DB Railway prod, migrate deploy)

-- Produit : prix demi-gros (plancher bande verte)
ALTER TABLE "produit"
  ADD COLUMN IF NOT EXISTS "prix_demi_gros" DOUBLE PRECISION;

-- AdminUser : autorisation de vendre en bande jaune (sous le demi-gros)
ALTER TABLE "admin_user"
  ADD COLUMN IF NOT EXISTS "peut_vendre_sous_demi_gros" BOOLEAN NOT NULL DEFAULT false;

-- Audit des remises sur chaque type de ligne
ALTER TABLE "ligne_bon"
  ADD COLUMN IF NOT EXISTS "prix_reference" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "bande_prix"     VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "motif_remise"   VARCHAR(255);

ALTER TABLE "ligne_vente"
  ADD COLUMN IF NOT EXISTS "prix_reference" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "bande_prix"     VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "motif_remise"   VARCHAR(255);

ALTER TABLE "ligne_ticket"
  ADD COLUMN IF NOT EXISTS "prix_reference" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "bande_prix"     VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "motif_remise"   VARCHAR(255);
