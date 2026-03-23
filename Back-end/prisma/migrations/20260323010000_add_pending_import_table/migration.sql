-- CreateTable
CREATE TABLE "pending_import" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_import_pkey" PRIMARY KEY ("id")
);
