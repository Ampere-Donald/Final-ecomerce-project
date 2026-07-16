ALTER TABLE "proforma"
  ADD COLUMN "print_count" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "print_event" (
  "id" TEXT NOT NULL,
  "document_type" VARCHAR(30) NOT NULL,
  "document_id" TEXT,
  "document_number" VARCHAR(80) NOT NULL,
  "mode" VARCHAR(20) NOT NULL,
  "status" VARCHAR(20) NOT NULL,
  "workstation_id" VARCHAR(100),
  "printer_name" VARCHAR(200),
  "actor_id" TEXT NOT NULL,
  "error_code" VARCHAR(100),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "print_event_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "print_event_document_type_document_number_created_at_idx"
  ON "print_event"("document_type", "document_number", "created_at");
CREATE INDEX "print_event_actor_id_created_at_idx"
  ON "print_event"("actor_id", "created_at");

ALTER TABLE "print_event"
  ADD CONSTRAINT "print_event_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "admin_user"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
