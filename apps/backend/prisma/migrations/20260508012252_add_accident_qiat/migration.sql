-- CreateEnum
CREATE TYPE "AccidentActivityType" AS ENUM ('HABITUAL', 'EVENTUAL', 'NEW', 'FUNCTION_REPLACEMENT');

-- CreateEnum
CREATE TYPE "AccidentTypicalSubtype" AS ENUM ('BATIDA_CONTRA', 'QUEDA_MESMO_NIVEL', 'QUEDA_NIVEL_DIFERENTE', 'PERFUROCORTANTE', 'PRENSAMENTO', 'AGRESSAO', 'QUEIMADURA', 'CONTATO_MATERIAL_BIOLOGICO', 'CONTATO_PRODUTO_QUIMICO', 'OTHER');

-- CreateEnum
CREATE TYPE "AccidentCommuteSubtype" AS ENUM ('BATIDA_CONTRA', 'COLISAO_VEICULOS', 'ATROPELAMENTO', 'QUEDA_NIVEL', 'ASSALTO', 'AGRESSAO', 'ATAQUE_ANIMAIS', 'OTHER');

-- CreateEnum
CREATE TYPE "AccidentWorkJourneyType" AS ENUM ('REGULAR_HOURS', 'OVERTIME', 'CHANGED_SCHEDULE');

-- CreateEnum
CREATE TYPE "AccidentInjuredSide" AS ENUM ('LEFT', 'RIGHT', 'BOTH');

-- CreateEnum
CREATE TYPE "AccidentBodyPart" AS ENUM ('HEAD', 'FACE', 'EYE', 'NOSE', 'MOUTH', 'NECK', 'SHOULDER', 'ARM', 'ELBOW', 'WRIST', 'HAND', 'FINGER', 'THORAX', 'ABDOMEN', 'BACK', 'COCCYX', 'THIGH', 'LEG', 'KNEE', 'ANKLE', 'FOOT', 'OTHER');

-- CreateEnum
CREATE TYPE "AccidentEvidenceType" AS ENUM ('INJURY_PHOTO', 'PROCEDURE_EXECUTED', 'PPE_CORRECT_USE', 'POLICE_REPORT', 'MEDICAL_CERTIFICATE_WITH_CID', 'MEDICAL_ATTENDANCE_DECLARATION', 'OTHER');

-- AlterTable
ALTER TABLE "accidents" ADD COLUMN     "activity_type" "AccidentActivityType",
ADD COLUMN     "commute_subtype_other" TEXT,
ADD COLUMN     "commute_subtypes" "AccidentCommuteSubtype"[] DEFAULT ARRAY[]::"AccidentCommuteSubtype"[],
ADD COLUMN     "injured_body_part_other" TEXT,
ADD COLUMN     "injured_body_parts" "AccidentBodyPart"[] DEFAULT ARRAY[]::"AccidentBodyPart"[],
ADD COLUMN     "injured_side" "AccidentInjuredSide",
ADD COLUMN     "medical_care_time" TEXT,
ADD COLUMN     "occurrence_address" TEXT,
ADD COLUMN     "previous_accident" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "previous_accident_description" TEXT,
ADD COLUMN     "regional" TEXT,
ADD COLUMN     "salary" TEXT,
ADD COLUMN     "schedule_change_end" TEXT,
ADD COLUMN     "schedule_change_start" TEXT,
ADD COLUMN     "total_time_in_role" TEXT,
ADD COLUMN     "typical_subtype_other" TEXT,
ADD COLUMN     "typical_subtypes" "AccidentTypicalSubtype"[] DEFAULT ARRAY[]::"AccidentTypicalSubtype"[],
ADD COLUMN     "unit_manager_name" TEXT,
ADD COLUMN     "work_journey_type" "AccidentWorkJourneyType",
ADD COLUMN     "work_schedule" TEXT;

-- CreateTable
CREATE TABLE "accident_evidences" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "accident_id" TEXT NOT NULL,
    "evidence_type" "AccidentEvidenceType" NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "file_content" BYTEA NOT NULL,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "accident_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accident_evidences_tenant_id_idx" ON "accident_evidences"("tenant_id");

-- CreateIndex
CREATE INDEX "accident_evidences_company_id_idx" ON "accident_evidences"("company_id");

-- CreateIndex
CREATE INDEX "accident_evidences_accident_id_created_at_idx" ON "accident_evidences"("accident_id", "created_at");

-- CreateIndex
CREATE INDEX "accident_evidences_evidence_type_idx" ON "accident_evidences"("evidence_type");

-- AddForeignKey
ALTER TABLE "accident_evidences" ADD CONSTRAINT "accident_evidences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accident_evidences" ADD CONSTRAINT "accident_evidences_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accident_evidences" ADD CONSTRAINT "accident_evidences_accident_id_fkey" FOREIGN KEY ("accident_id") REFERENCES "accidents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accident_evidences" ADD CONSTRAINT "accident_evidences_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
