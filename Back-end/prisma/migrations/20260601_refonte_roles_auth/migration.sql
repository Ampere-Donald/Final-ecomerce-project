-- Ajout des nouveaux roles a l'enum AdminRole.
ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'CAISSIER';
ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'VENDEUR';

-- Rendre email optionnel sur admin_user.
ALTER TABLE "admin_user" ALTER COLUMN "email" DROP NOT NULL;

-- Ajouter les nouvelles colonnes.
ALTER TABLE "admin_user" ADD COLUMN IF NOT EXISTS "username" VARCHAR(50);
ALTER TABLE "admin_user" ADD COLUMN IF NOT EXISTS "pin_code" VARCHAR(255);
ALTER TABLE "admin_user" ADD COLUMN IF NOT EXISTS "photo_url" TEXT;
ALTER TABLE "admin_user" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "admin_user" ADD COLUMN IF NOT EXISTS "created_by" TEXT;
ALTER TABLE "admin_user" ALTER COLUMN "mot_de_passe" DROP NOT NULL;

-- Pour les comptes existants : username = partie avant @ de l'email,
-- avec suffixe si plusieurs comptes produisent le meme identifiant.
WITH candidates AS (
  SELECT
    "id",
    NULLIF(LOWER(REGEXP_REPLACE(SPLIT_PART(COALESCE("email", "nom"), '@', 1), '[^a-zA-Z0-9_]+', '_', 'g')), '') AS base_username
  FROM "admin_user"
  WHERE "username" IS NULL
),
ranked AS (
  SELECT
    "id",
    COALESCE(base_username, CONCAT('admin_', LEFT("id", 8))) AS base_username,
    ROW_NUMBER() OVER (PARTITION BY COALESCE(base_username, CONCAT('admin_', LEFT("id", 8))) ORDER BY "id") AS rn
  FROM candidates
)
UPDATE "admin_user" AS au
SET "username" = CASE
  WHEN ranked.rn = 1 THEN ranked.base_username
  ELSE CONCAT(ranked.base_username, '_', ranked.rn)
END
FROM ranked
WHERE au."id" = ranked."id";

-- Rendre username obligatoire et unique.
ALTER TABLE "admin_user" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "admin_user_username_key" ON "admin_user"("username");

-- Table role_history.
CREATE TABLE IF NOT EXISTS "role_history" (
  "id" TEXT NOT NULL,
  "admin_user_id" TEXT NOT NULL,
  "old_role" "AdminRole" NOT NULL,
  "new_role" "AdminRole" NOT NULL,
  "changed_by" TEXT NOT NULL,
  "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "motif" VARCHAR(255),
  CONSTRAINT "role_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "role_history_admin_user_id_idx" ON "role_history"("admin_user_id");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'role_history_admin_user_id_fkey') THEN
    ALTER TABLE "role_history" ADD CONSTRAINT "role_history_admin_user_id_fkey"
      FOREIGN KEY ("admin_user_id") REFERENCES "admin_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Table activity_log.
CREATE TABLE IF NOT EXISTS "activity_log" (
  "id" TEXT NOT NULL,
  "admin_user_id" TEXT NOT NULL,
  "action" VARCHAR(100) NOT NULL,
  "details" JSONB,
  "ip_address" VARCHAR(45),
  "user_agent" VARCHAR(255),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "activity_log_admin_user_id_created_at_idx" ON "activity_log"("admin_user_id", "created_at");
CREATE INDEX IF NOT EXISTS "activity_log_action_created_at_idx" ON "activity_log"("action", "created_at");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activity_log_admin_user_id_fkey') THEN
    ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_admin_user_id_fkey"
      FOREIGN KEY ("admin_user_id") REFERENCES "admin_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
