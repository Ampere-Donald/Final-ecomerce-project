-- Bulletins de paie : paramètres employeur, salariés, bulletins, lignes
-- Idempotent (DB Railway prod, migrate deploy)

-- ── Enums ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TypeContrat') THEN
    CREATE TYPE "TypeContrat" AS ENUM ('CDI', 'CDD', 'STAGE', 'INTERIM', 'TACHERON');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StatutBulletin') THEN
    CREATE TYPE "StatutBulletin" AS ENUM ('BROUILLON', 'VALIDE', 'PAYE', 'ANNULE');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TypeLigneBulletin') THEN
    CREATE TYPE "TypeLigneBulletin" AS ENUM ('GAIN', 'RETENUE');
  END IF;
END $$;

-- ── Paramètres employeur (ligne unique) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS "parametre_paie" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "raison_sociale" VARCHAR(200),
  "adresse" TEXT,
  "ville" VARCHAR(100),
  "niu" VARCHAR(50),
  "rccm" VARCHAR(50),
  "cnps_employeur" VARCHAR(50),
  "secteur_activite" VARCHAR(150),
  "telephone" VARCHAR(30),
  "email" VARCHAR(100),
  "logo_url" TEXT,
  "signataire_nom" VARCHAR(150),
  "signataire_qualite" VARCHAR(150),
  "taux_cnps" DECIMAL(6,3) NOT NULL DEFAULT 4.2,
  "plafond_cnps" DECIMAL(12,2) NOT NULL DEFAULT 750000,
  "taux_cfc" DECIMAL(6,3) NOT NULL DEFAULT 1,
  "taux_cac" DECIMAL(6,3) NOT NULL DEFAULT 10,
  "abattement_irpp_annuel" DECIMAL(12,2) NOT NULL DEFAULT 500000,
  "taux_frais_pro_irpp" DECIMAL(6,3) NOT NULL DEFAULT 30,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "parametre_paie_pkey" PRIMARY KEY ("id")
);

-- ── Salariés ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "salarie" (
  "id" TEXT NOT NULL,
  "matricule" VARCHAR(50) NOT NULL,
  "nom" VARCHAR(150) NOT NULL,
  "prenom" VARCHAR(150),
  "telephone" VARCHAR(30),
  "email" VARCHAR(100),
  "adresse" TEXT,
  "date_naissance" TIMESTAMP(3),
  "lieu_naissance" VARCHAR(150),
  "numero_cnps" VARCHAR(50),
  "niu" VARCHAR(50),
  "poste" VARCHAR(150) NOT NULL,
  "categorie" VARCHAR(50),
  "echelon" VARCHAR(50),
  "date_embauche" TIMESTAMP(3) NOT NULL,
  "type_contrat" "TypeContrat" NOT NULL DEFAULT 'CDI',
  "date_fin_contrat" TIMESTAMP(3),
  "salaire_base" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "primes_par_defaut" JSONB,
  "mode_paiement" "MethodePaiement" NOT NULL DEFAULT 'VIREMENT',
  "banque" VARCHAR(150),
  "compte_bancaire" VARCHAR(50),
  "actif" BOOLEAN NOT NULL DEFAULT true,
  "admin_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "salarie_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "salarie_matricule_key" ON "salarie"("matricule");
CREATE UNIQUE INDEX IF NOT EXISTS "salarie_admin_user_id_key" ON "salarie"("admin_user_id");
CREATE INDEX IF NOT EXISTS "salarie_actif_idx" ON "salarie"("actif");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'salarie_admin_user_id_fkey') THEN
    ALTER TABLE "salarie" ADD CONSTRAINT "salarie_admin_user_id_fkey"
      FOREIGN KEY ("admin_user_id") REFERENCES "admin_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ── Bulletins de paie ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "bulletin_paie" (
  "id" TEXT NOT NULL,
  "numero" TEXT NOT NULL,
  "salarie_id" TEXT NOT NULL,
  "periode" VARCHAR(7) NOT NULL,
  "jours_travailles" INTEGER NOT NULL DEFAULT 30,
  "salarie_nom" VARCHAR(150) NOT NULL,
  "matricule" VARCHAR(50),
  "numero_cnps" VARCHAR(50),
  "poste" VARCHAR(150),
  "categorie" VARCHAR(50),
  "date_embauche" TIMESTAMP(3),
  "brut_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "cnps" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "irpp" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "cac" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "cfc" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "autres_retenues" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total_retenues" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "net_a_payer" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "mode_paiement" "MethodePaiement",
  "statut" "StatutBulletin" NOT NULL DEFAULT 'BROUILLON',
  "date_paiement" TIMESTAMP(3),
  "valide_par_id" TEXT,
  "valide_at" TIMESTAMP(3),
  "created_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bulletin_paie_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "bulletin_paie_numero_key" ON "bulletin_paie"("numero");
CREATE UNIQUE INDEX IF NOT EXISTS "bulletin_paie_salarie_id_periode_key" ON "bulletin_paie"("salarie_id", "periode");
CREATE INDEX IF NOT EXISTS "bulletin_paie_periode_statut_idx" ON "bulletin_paie"("periode", "statut");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bulletin_paie_salarie_id_fkey') THEN
    ALTER TABLE "bulletin_paie" ADD CONSTRAINT "bulletin_paie_salarie_id_fkey"
      FOREIGN KEY ("salarie_id") REFERENCES "salarie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- ── Lignes de bulletin (gains / retenues) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS "bulletin_ligne" (
  "id" TEXT NOT NULL,
  "bulletin_id" TEXT NOT NULL,
  "type" "TypeLigneBulletin" NOT NULL,
  "libelle" VARCHAR(150) NOT NULL,
  "base" DECIMAL(12,2),
  "taux" DECIMAL(6,3),
  "montant" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "ordre" INTEGER NOT NULL DEFAULT 0,
  "systeme" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "bulletin_ligne_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "bulletin_ligne_bulletin_id_idx" ON "bulletin_ligne"("bulletin_id");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bulletin_ligne_bulletin_id_fkey') THEN
    ALTER TABLE "bulletin_ligne" ADD CONSTRAINT "bulletin_ligne_bulletin_id_fkey"
      FOREIGN KEY ("bulletin_id") REFERENCES "bulletin_paie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
