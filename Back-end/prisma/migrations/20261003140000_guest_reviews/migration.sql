-- Bind each review consent to one purchased line and exact normalized content.
ALTER TABLE "commande_guest_challenge" ADD COLUMN "review_line_id" TEXT;
ALTER TABLE "commande_guest_challenge" ADD COLUMN "review_content_hash" VARCHAR(64);
