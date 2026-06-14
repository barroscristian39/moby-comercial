CREATE TYPE "OccupationalExamType" AS ENUM (
  'ADMISSIONAL',
  'PERIODIC',
  'RETURN_TO_WORK',
  'ROLE_CHANGE',
  'DISMISSAL',
  'COMPLEMENTARY'
);

CREATE TYPE "OccupationalExamResult" AS ENUM (
  'FIT',
  'UNFIT',
  'FIT_WITH_RESTRICTIONS',
  'PENDING'
);

CREATE TYPE "TrainingStatus" AS ENUM (
  'SCHEDULED',
  'COMPLETED',
  'EXPIRED',
  'CANCELED'
);

CREATE TABLE "occupational_exams" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "unit_id" TEXT NOT NULL,
  "employee_id" TEXT NOT NULL,
  "job_function_id" TEXT,
  "exam_type" "OccupationalExamType" NOT NULL,
  "name" TEXT NOT NULL,
  "provider" TEXT,
  "performed_at" DATE,
  "due_date" DATE NOT NULL,
  "result" "OccupationalExamResult" NOT NULL DEFAULT 'PENDING',
  "aso_issued" BOOLEAN NOT NULL DEFAULT false,
  "aso_number" TEXT,
  "notes" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  "deleted_by" TEXT,

  CONSTRAINT "occupational_exams_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "trainings" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "unit_id" TEXT NOT NULL,
  "employee_id" TEXT NOT NULL,
  "job_function_id" TEXT,
  "name" TEXT NOT NULL,
  "provider" TEXT,
  "workload_hours" INTEGER,
  "completed_at" DATE,
  "due_date" DATE NOT NULL,
  "certificate_url" TEXT,
  "status" "TrainingStatus" NOT NULL DEFAULT 'SCHEDULED',
  "notes" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  "deleted_by" TEXT,

  CONSTRAINT "trainings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "occupational_exams_tenant_id_idx" ON "occupational_exams"("tenant_id");
CREATE INDEX "occupational_exams_tenant_id_company_id_idx" ON "occupational_exams"("tenant_id", "company_id");
CREATE INDEX "occupational_exams_unit_id_idx" ON "occupational_exams"("unit_id");
CREATE INDEX "occupational_exams_employee_id_idx" ON "occupational_exams"("employee_id");
CREATE INDEX "occupational_exams_job_function_id_idx" ON "occupational_exams"("job_function_id");
CREATE INDEX "occupational_exams_due_date_result_is_active_idx" ON "occupational_exams"("due_date", "result", "is_active");

CREATE INDEX "trainings_tenant_id_idx" ON "trainings"("tenant_id");
CREATE INDEX "trainings_tenant_id_company_id_idx" ON "trainings"("tenant_id", "company_id");
CREATE INDEX "trainings_unit_id_idx" ON "trainings"("unit_id");
CREATE INDEX "trainings_employee_id_idx" ON "trainings"("employee_id");
CREATE INDEX "trainings_job_function_id_idx" ON "trainings"("job_function_id");
CREATE INDEX "trainings_due_date_status_is_active_idx" ON "trainings"("due_date", "status", "is_active");

ALTER TABLE "occupational_exams" ADD CONSTRAINT "occupational_exams_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "occupational_exams" ADD CONSTRAINT "occupational_exams_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "occupational_exams" ADD CONSTRAINT "occupational_exams_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "occupational_exams" ADD CONSTRAINT "occupational_exams_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "occupational_exams" ADD CONSTRAINT "occupational_exams_job_function_id_fkey" FOREIGN KEY ("job_function_id") REFERENCES "job_functions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "trainings" ADD CONSTRAINT "trainings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trainings" ADD CONSTRAINT "trainings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trainings" ADD CONSTRAINT "trainings_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trainings" ADD CONSTRAINT "trainings_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trainings" ADD CONSTRAINT "trainings_job_function_id_fkey" FOREIGN KEY ("job_function_id") REFERENCES "job_functions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "occupational_exams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "occupational_exams" FORCE ROW LEVEL SECURITY;
ALTER TABLE "trainings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trainings" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS occupational_exams_tenant_isolation ON "occupational_exams";
DROP POLICY IF EXISTS trainings_tenant_isolation ON "trainings";

CREATE POLICY occupational_exams_tenant_isolation ON "occupational_exams"
  FOR ALL TO moby_app
  USING (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  )
  WITH CHECK (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  );

CREATE POLICY trainings_tenant_isolation ON "trainings"
  FOR ALL TO moby_app
  USING (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  )
  WITH CHECK (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  );

