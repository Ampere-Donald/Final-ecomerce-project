-- Existing challenges remain recovery-only. Linking requires its own consent.
ALTER TABLE "commande_guest_challenge"
ADD COLUMN "completed_at" TIMESTAMPTZ(6),
ADD COLUMN "grant_version" INTEGER,
ADD COLUMN "link_result" JSONB,
ADD COLUMN "order_version" INTEGER,
ADD COLUMN "proof_hash" VARCHAR(64),
ADD COLUMN "purpose" VARCHAR(12) NOT NULL DEFAULT 'RECOVER',
ADD COLUMN "target_client_id" TEXT;
