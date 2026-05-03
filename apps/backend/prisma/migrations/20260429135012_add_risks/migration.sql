-- CreateEnum
CREATE TYPE "RiskType" AS ENUM ('PHYSICAL', 'CHEMICAL', 'BIOLOGICAL', 'ERGONOMIC', 'ACCIDENT');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('NEGLIGIBLE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RiskProbability" AS ENUM ('RARE', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'ALMOST_CERTAIN');

-- CreateEnum
CREATE TYPE "RiskSeverity" AS ENUM ('INSIGNIFICANT', 'MINOR', 'MODERATE', 'MAJOR', 'CATASTROPHIC');

-- CreateTable
CREATE TABLE "risks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "job_function_id" TEXT,
    "name" TEXT NOT NULL,
    "type" "RiskType" NOT NULL,
    "level" "RiskLevel" NOT NULL,
    "probability" "RiskProbability" NOT NULL,
    "severity" "RiskSeverity" NOT NULL,
    "description" TEXT,
    "control_measures" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "risks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "risks_tenant_id_idx" ON "risks"("tenant_id");

-- CreateIndex
CREATE INDEX "risks_tenant_id_company_id_idx" ON "risks"("tenant_id", "company_id");

-- CreateIndex
CREATE INDEX "risks_unit_id_idx" ON "risks"("unit_id");

-- CreateIndex
CREATE INDEX "risks_job_function_id_idx" ON "risks"("job_function_id");

-- CreateIndex
CREATE INDEX "risks_type_level_is_active_idx" ON "risks"("type", "level", "is_active");

-- AddForeignKey
ALTER TABLE "risks" ADD CONSTRAINT "risks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risks" ADD CONSTRAINT "risks_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risks" ADD CONSTRAINT "risks_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risks" ADD CONSTRAINT "risks_job_function_id_fkey" FOREIGN KEY ("job_function_id") REFERENCES "job_functions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
