ALTER TABLE "vente"
  ADD COLUMN "annulee" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "motif_annulation" VARCHAR(255),
  ADD COLUMN "annulee_at" TIMESTAMP(3),
  ADD COLUMN "annulee_by" TEXT;
