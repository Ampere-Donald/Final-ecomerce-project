-- CreateTable
CREATE TABLE "commande_guest_access" (
    "recovery_email" VARCHAR(254),
    "commande_id" TEXT NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "revoked_by" VARCHAR(100),
    "reason" VARCHAR(200),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "commande_guest_access_pkey" PRIMARY KEY ("commande_id")
);

-- CreateTable
CREATE TABLE "commande_guest_challenge" (
    "id" UUID NOT NULL,
    "commande_id" TEXT NOT NULL,
    "code_hash" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "consumed_at" TIMESTAMPTZ(6),

    CONSTRAINT "commande_guest_challenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "commande_guest_access_token_hash_key" ON "commande_guest_access"("token_hash");

-- CreateIndex
CREATE INDEX "commande_guest_challenge_commande_id_created_at_idx" ON "commande_guest_challenge"("commande_id", "created_at");

-- AddForeignKey
ALTER TABLE "commande_guest_access" ADD CONSTRAINT "commande_guest_access_commande_id_fkey" FOREIGN KEY ("commande_id") REFERENCES "commande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commande_guest_challenge" ADD CONSTRAINT "commande_guest_challenge_commande_id_fkey" FOREIGN KEY ("commande_id") REFERENCES "commande_guest_access"("commande_id") ON DELETE CASCADE ON UPDATE CASCADE;
