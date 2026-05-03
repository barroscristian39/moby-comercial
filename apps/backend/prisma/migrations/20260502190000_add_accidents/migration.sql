-- CreateEnum
CREATE TYPE "AccidentStatus" AS ENUM ('REPORTED', 'UNDER_INVESTIGATION', 'ACTION_PLAN_DEFINED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AccidentSeverity" AS ENUM ('MINOR', 'MODERATE', 'SERIOUS', 'FATAL');

-- CreateEnum
CREATE TYPE "AccidentType" AS ENUM ('TYPICAL', 'COMMUTE', 'OCCUPATIONAL_DISEASE', 'NEAR_MISS');

-- CreateTable
CREATE TABLE "accidents" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "job_function_id" TEXT,
    "code" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "reported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location" TEXT NOT NULL,
    "accident_type" "AccidentType" NOT NULL,
    "severity" "AccidentSeverity" NOT NULL,
    "status" "AccidentStatus" NOT NULL DEFAULT 'REPORTED',
    "description" TEXT NOT NULL,
    "injured_body_part" TEXT,
    "medical_care_provided" BOOLEAN NOT NULL DEFAULT false,
    "leave_required" BOOLEAN NOT NULL DEFAULT false,
    "leave_days" INTEGER NOT NULL DEFAULT 0,
    "cat_issued" BOOLEAN NOT NULL DEFAULT false,
    "cat_number" TEXT,
    "witnesses" TEXT,
    "immediate_actions" TEXT,
    "investigator_name" TEXT,
    "investigation_started_at" TIMESTAMP(3),
    "immediate_cause" TEXT,
    "root_cause" TEXT,
    "contributing_factors" TEXT,
    "corrective_actions" TEXT,
    "preventive_measures" TEXT,
    "manager_notes" TEXT,
    "recommendations" TEXT,
    "conclusion_summary" TEXT,
    "closure_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "accidents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accidents_code_key" ON "accidents"("code");

-- CreateIndex
CREATE INDEX "accidents_tenant_id_idx" ON "accidents"("tenant_id");

-- CreateIndex
CREATE INDEX "accidents_tenant_id_company_id_idx" ON "accidents"("tenant_id", "company_id");

-- CreateIndex
CREATE INDEX "accidents_unit_id_idx" ON "accidents"("unit_id");

-- CreateIndex
CREATE INDEX "accidents_employee_id_idx" ON "accidents"("employee_id");

-- CreateIndex
CREATE INDEX "accidents_job_function_id_idx" ON "accidents"("job_function_id");

-- CreateIndex
CREATE INDEX "accidents_status_severity_occurred_at_idx" ON "accidents"("status", "severity", "occurred_at");

-- AddForeignKey
ALTER TABLE "accidents" ADD CONSTRAINT "accidents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accidents" ADD CONSTRAINT "accidents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accidents" ADD CONSTRAINT "accidents_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accidents" ADD CONSTRAINT "accidents_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accidents" ADD CONSTRAINT "accidents_job_function_id_fkey" FOREIGN KEY ("job_function_id") REFERENCES "job_functions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "accidents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "accidents" FORCE ROW LEVEL SECURITY;

CREATE POLICY accidents_tenant_isolation ON "accidents"
  FOR ALL TO moby_app
  USING (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  )
  WITH CHECK (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  );
