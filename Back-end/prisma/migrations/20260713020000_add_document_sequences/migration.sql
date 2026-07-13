CREATE TABLE "document_sequence" (
  "id" VARCHAR(80) NOT NULL,
  "type" VARCHAR(30) NOT NULL,
  "period" VARCHAR(10) NOT NULL,
  "next_value" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_sequence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "document_sequence_type_period_key"
  ON "document_sequence"("type", "period");
