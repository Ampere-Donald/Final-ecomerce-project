ALTER TABLE "avis_produit"
  ADD COLUMN "photo_data" BYTEA,
  ADD COLUMN "photo_input_hash" VARCHAR(64),
  ADD COLUMN "photo_width" INTEGER,
  ADD COLUMN "photo_height" INTEGER,
  ADD COLUMN "photo_statut" "StatutAvis";
ALTER TABLE "avis_moderation"
  ADD COLUMN "photo_action" VARCHAR(12),
  ADD COLUMN "photo_motif" VARCHAR(30);
ALTER TABLE "avis_produit" ADD CONSTRAINT "avis_photo_bounded" CHECK (
  (photo_data IS NULL AND photo_input_hash IS NULL AND photo_width IS NULL AND photo_height IS NULL AND photo_statut IS NULL)
  OR
  (photo_data IS NOT NULL AND photo_input_hash IS NOT NULL AND photo_width IS NOT NULL AND photo_height IS NOT NULL AND photo_statut IS NOT NULL
   AND octet_length(photo_data) BETWEEN 16 AND 262144 AND photo_input_hash ~ '^[0-9a-f]{64}$'
   AND photo_width BETWEEN 1 AND 1280 AND photo_height BETWEEN 1 AND 1280)
);
