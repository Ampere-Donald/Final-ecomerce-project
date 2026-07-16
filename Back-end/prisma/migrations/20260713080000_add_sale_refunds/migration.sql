ALTER TABLE "vente"
  ADD COLUMN "remboursee" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "motif_remboursement" VARCHAR(255),
  ADD COLUMN "remboursee_at" TIMESTAMP(3),
  ADD COLUMN "remboursee_by" TEXT;
