-- CreateEnum
CREATE TYPE "RecurrenceEcheance" AS ENUM ('UNIQUE', 'MENSUELLE', 'TRIMESTRIELLE', 'ANNUELLE');

-- CreateEnum
CREATE TYPE "TypeAlerte" AS ENUM ('RAPPEL', 'URGENT', 'RETARD');

-- AlterEnum
ALTER TYPE "TypeNotification" ADD VALUE 'ECHEANCE';

-- CreateTable
CREATE TABLE "echeance" (
    "id" TEXT NOT NULL,
    "titre" VARCHAR(150) NOT NULL,
    "description" VARCHAR(500),
    "id_coffre" TEXT,
    "montant_cible" DECIMAL(12,2),
    "date_echeance" TIMESTAMP(3) NOT NULL,
    "recurrence" "RecurrenceEcheance" NOT NULL DEFAULT 'UNIQUE',
    "jours_alerte_avant" INTEGER[] DEFAULT ARRAY[7, 3, 1],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "derniere_alerte_le" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "echeance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerte_echeance" (
    "id" TEXT NOT NULL,
    "id_echeance" TEXT NOT NULL,
    "type" "TypeAlerte" NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "jour_emission" VARCHAR(10) NOT NULL,
    "email_envoye" BOOLEAN NOT NULL DEFAULT false,
    "declenche_manuel" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerte_echeance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "echeance_id_coffre_idx" ON "echeance"("id_coffre");

-- CreateIndex
CREATE INDEX "echeance_active_date_echeance_idx" ON "echeance"("active", "date_echeance");

-- CreateIndex
CREATE INDEX "alerte_echeance_id_echeance_idx" ON "alerte_echeance"("id_echeance");

-- CreateIndex
CREATE UNIQUE INDEX "alerte_echeance_id_echeance_type_jour_emission_key" ON "alerte_echeance"("id_echeance", "type", "jour_emission");

-- AddForeignKey
ALTER TABLE "echeance" ADD CONSTRAINT "echeance_id_coffre_fkey" FOREIGN KEY ("id_coffre") REFERENCES "coffre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerte_echeance" ADD CONSTRAINT "alerte_echeance_id_echeance_fkey" FOREIGN KEY ("id_echeance") REFERENCES "echeance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
