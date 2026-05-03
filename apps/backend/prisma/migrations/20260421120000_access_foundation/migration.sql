-- Tenant-first access foundation.
-- Existing single-company data is promoted to one tenant per company.

CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'TRIAL', 'CANCELED');

ALTER TYPE "Role" RENAME TO "Role_old";
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'TENANT_ADMIN', 'TECNICO_SST', 'GESTOR', 'RH', 'CONSULTA');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users"
  ALTER COLUMN "role" TYPE "Role"
  USING (
    CASE "role"::text
      WHEN 'ADMIN_SYSTEM' THEN 'SUPER_ADMIN'
      WHEN 'HR_ADMIN' THEN 'TENANT_ADMIN'
      WHEN 'TECH_SAFETY' THEN 'TECNICO_SST'
      WHEN 'MANAGER' THEN 'GESTOR'
      ELSE 'CONSULTA'
    END
  )::"Role";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'CONSULTA';
DROP TYPE "Role_old";

ALTER TYPE "AuditAction" RENAME TO "AuditAction_old";
CREATE TYPE "AuditAction" AS ENUM (
  'CREATE',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGIN_FAILED',
  'LOGOUT',
  'REFRESH',
  'PASSWORD_RESET_REQUEST',
  'PASSWORD_RESET_COMPLETE',
  'USER_PERMISSION_CHANGED',
  'USER_ACTIVATED',
  'USER_DEACTIVATED',
  'TENANT_STATUS_CHANGED',
  'ACTIVATE',
  'DEACTIVATE'
);
ALTER TABLE "audit_logs"
  ALTER COLUMN "action" TYPE "AuditAction"
  USING "action"::text::"AuditAction";
DROP TYPE "AuditAction_old";

CREATE TABLE "tenants" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "status" "TenantStatus" NOT NULL DEFAULT 'TRIAL',
  "plan" TEXT NOT NULL DEFAULT 'manual',
  "start_date" DATE,
  "end_date" DATE,
  "is_active" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");
CREATE INDEX "tenants_status_is_active_idx" ON "tenants"("status", "is_active");

INSERT INTO "tenants" ("id", "name", "slug", "status", "plan", "is_active", "created_at", "updated_at")
SELECT
  "id",
  "name",
  trim(both '-' from regexp_replace(lower(coalesce("cnpj", "id") || '-' || "id"), '[^a-z0-9]+', '-', 'g')),
  'ACTIVE'::"TenantStatus",
  'legacy',
  true,
  "created_at",
  "updated_at"
FROM "companies";

ALTER TABLE "companies" ADD COLUMN "tenant_id" TEXT;
UPDATE "companies" SET "tenant_id" = "id";
ALTER TABLE "companies" ALTER COLUMN "tenant_id" SET NOT NULL;

ALTER TABLE "users" ADD COLUMN "tenant_id" TEXT;
ALTER TABLE "users" ADD COLUMN "last_login_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "created_by" TEXT;
UPDATE "users"
SET "email" = lower("users"."email"),
    "tenant_id" = "companies"."tenant_id"
FROM "companies"
WHERE "users"."company_id" = "companies"."id";

ALTER TABLE "units" ADD COLUMN "tenant_id" TEXT;
UPDATE "units" SET "tenant_id" = "companies"."tenant_id"
FROM "companies"
WHERE "units"."company_id" = "companies"."id";
ALTER TABLE "units" ALTER COLUMN "tenant_id" SET NOT NULL;

ALTER TABLE "sectors" ADD COLUMN "tenant_id" TEXT;
UPDATE "sectors" SET "tenant_id" = "companies"."tenant_id"
FROM "companies"
WHERE "sectors"."company_id" = "companies"."id";
ALTER TABLE "sectors" ALTER COLUMN "tenant_id" SET NOT NULL;

ALTER TABLE "job_functions" ADD COLUMN "tenant_id" TEXT;
UPDATE "job_functions" SET "tenant_id" = "companies"."tenant_id"
FROM "companies"
WHERE "job_functions"."company_id" = "companies"."id";
ALTER TABLE "job_functions" ALTER COLUMN "tenant_id" SET NOT NULL;

ALTER TABLE "employees" ADD COLUMN "tenant_id" TEXT;
UPDATE "employees" SET "tenant_id" = "companies"."tenant_id"
FROM "companies"
WHERE "employees"."company_id" = "companies"."id";
ALTER TABLE "employees" ALTER COLUMN "tenant_id" SET NOT NULL;

ALTER TABLE "epi_items" ADD COLUMN "tenant_id" TEXT;
UPDATE "epi_items" SET "tenant_id" = "companies"."tenant_id"
FROM "companies"
WHERE "epi_items"."company_id" = "companies"."id";
ALTER TABLE "epi_items" ALTER COLUMN "tenant_id" SET NOT NULL;

ALTER TABLE "epi_deliveries" ADD COLUMN "tenant_id" TEXT;
UPDATE "epi_deliveries" SET "tenant_id" = "companies"."tenant_id"
FROM "companies"
WHERE "epi_deliveries"."company_id" = "companies"."id";
ALTER TABLE "epi_deliveries" ALTER COLUMN "tenant_id" SET NOT NULL;

DROP INDEX IF EXISTS "companies_cnpj_key";
CREATE UNIQUE INDEX "companies_tenant_id_cnpj_key" ON "companies"("tenant_id", "cnpj");

CREATE TABLE "user_company_access" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_company_access_pkey" PRIMARY KEY ("id")
);

INSERT INTO "user_company_access" ("id", "user_id", "company_id", "created_at")
SELECT "id" || ':' || "company_id", "id", "company_id", "created_at"
FROM "users"
WHERE "company_id" IS NOT NULL;

CREATE TABLE "user_unit_access" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "unit_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_unit_access_pkey" PRIMARY KEY ("id")
);

INSERT INTO "user_unit_access" ("id", "user_id", "unit_id", "created_at")
SELECT "user_id" || ':' || "unit_id", "user_id", "unit_id", "created_at"
FROM "user_units";

DROP TABLE "user_units";

ALTER TABLE "audit_logs" RENAME COLUMN "entity" TO "entity_type";
ALTER TABLE "audit_logs" RENAME COLUMN "user_id" TO "actor_user_id";
ALTER TABLE "audit_logs" ADD COLUMN "tenant_id" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "metadata" JSONB;
UPDATE "audit_logs"
SET "tenant_id" = "companies"."tenant_id"
FROM "companies"
WHERE "audit_logs"."company_id" = "companies"."id";
UPDATE "audit_logs"
SET "metadata" = jsonb_strip_nulls(jsonb_build_object(
  'previousData', "previous_data",
  'newData', "new_data"
));
ALTER TABLE "audit_logs" DROP COLUMN "previous_data";
ALTER TABLE "audit_logs" DROP COLUMN "new_data";
ALTER TABLE "audit_logs" DROP COLUMN "company_id";

CREATE TABLE "password_reset_tokens" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at" TIMESTAMP(3),
  "ip" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_company_access_user_id_company_id_key" ON "user_company_access"("user_id", "company_id");
CREATE INDEX "user_company_access_company_id_idx" ON "user_company_access"("company_id");
CREATE UNIQUE INDEX "user_unit_access_user_id_unit_id_key" ON "user_unit_access"("user_id", "unit_id");
CREATE INDEX "user_unit_access_unit_id_idx" ON "user_unit_access"("unit_id");
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

DROP INDEX IF EXISTS "units_company_id_idx";
DROP INDEX IF EXISTS "sectors_company_id_idx";
DROP INDEX IF EXISTS "job_functions_company_id_idx";
DROP INDEX IF EXISTS "employees_company_id_idx";
DROP INDEX IF EXISTS "employees_company_id_cpf_key";
DROP INDEX IF EXISTS "users_company_id_idx";
DROP INDEX IF EXISTS "epi_items_company_id_idx";
DROP INDEX IF EXISTS "epi_deliveries_company_id_idx";
DROP INDEX IF EXISTS "audit_logs_user_id_idx";
DROP INDEX IF EXISTS "audit_logs_company_id_idx";
DROP INDEX IF EXISTS "audit_logs_entity_entity_id_idx";

CREATE INDEX "companies_tenant_id_idx" ON "companies"("tenant_id");
CREATE INDEX "companies_tenant_id_deleted_at_idx" ON "companies"("tenant_id", "deleted_at");
CREATE INDEX "units_tenant_id_idx" ON "units"("tenant_id");
CREATE INDEX "units_tenant_id_company_id_idx" ON "units"("tenant_id", "company_id");
CREATE INDEX "units_company_id_idx" ON "units"("company_id");
CREATE INDEX "sectors_tenant_id_idx" ON "sectors"("tenant_id");
CREATE INDEX "sectors_tenant_id_company_id_idx" ON "sectors"("tenant_id", "company_id");
CREATE INDEX "job_functions_tenant_id_idx" ON "job_functions"("tenant_id");
CREATE INDEX "job_functions_tenant_id_company_id_idx" ON "job_functions"("tenant_id", "company_id");
CREATE INDEX "job_functions_unit_id_idx" ON "job_functions"("unit_id");
CREATE UNIQUE INDEX "employees_tenant_id_company_id_cpf_key" ON "employees"("tenant_id", "company_id", "cpf");
CREATE INDEX "employees_tenant_id_idx" ON "employees"("tenant_id");
CREATE INDEX "employees_tenant_id_company_id_idx" ON "employees"("tenant_id", "company_id");
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");
CREATE INDEX "users_tenant_id_deleted_at_idx" ON "users"("tenant_id", "deleted_at");
CREATE INDEX "users_company_id_idx" ON "users"("company_id");
CREATE INDEX "epi_items_tenant_id_idx" ON "epi_items"("tenant_id");
CREATE INDEX "epi_items_tenant_id_company_id_idx" ON "epi_items"("tenant_id", "company_id");
CREATE INDEX "epi_deliveries_tenant_id_idx" ON "epi_deliveries"("tenant_id");
CREATE INDEX "epi_deliveries_tenant_id_company_id_idx" ON "epi_deliveries"("tenant_id", "company_id");
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");
CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs"("actor_user_id");

ALTER TABLE "companies" ADD CONSTRAINT "companies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "units" ADD CONSTRAINT "units_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sectors" ADD CONSTRAINT "sectors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "job_functions" ADD CONSTRAINT "job_functions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_company_access" ADD CONSTRAINT "user_company_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_company_access" ADD CONSTRAINT "user_company_access_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_unit_access" ADD CONSTRAINT "user_unit_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_unit_access" ADD CONSTRAINT "user_unit_access_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "refresh_tokens" DROP CONSTRAINT IF EXISTS "refresh_tokens_user_id_fkey";
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "epi_items" ADD CONSTRAINT "epi_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "epi_deliveries" ADD CONSTRAINT "epi_deliveries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'moby_app') THEN
    CREATE ROLE moby_app;
  END IF;
END
$$;

ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "units" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sectors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_functions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "employees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_company_access" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_unit_access" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "epi_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "epi_deliveries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenants_tenant_isolation ON "tenants";
DROP POLICY IF EXISTS companies_tenant_isolation ON "companies";
DROP POLICY IF EXISTS units_tenant_isolation ON "units";
DROP POLICY IF EXISTS sectors_tenant_isolation ON "sectors";
DROP POLICY IF EXISTS job_functions_tenant_isolation ON "job_functions";
DROP POLICY IF EXISTS employees_tenant_isolation ON "employees";
DROP POLICY IF EXISTS users_tenant_isolation ON "users";
DROP POLICY IF EXISTS user_company_access_tenant_isolation ON "user_company_access";
DROP POLICY IF EXISTS user_unit_access_tenant_isolation ON "user_unit_access";
DROP POLICY IF EXISTS epi_items_tenant_isolation ON "epi_items";
DROP POLICY IF EXISTS epi_deliveries_tenant_isolation ON "epi_deliveries";
DROP POLICY IF EXISTS audit_logs_tenant_isolation ON "audit_logs";

CREATE POLICY tenants_tenant_isolation ON "tenants"
  FOR ALL TO moby_app
  USING (current_setting('app.current_user_role', true) = 'SUPER_ADMIN' OR "id" = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.current_user_role', true) = 'SUPER_ADMIN' OR "id" = current_setting('app.current_tenant_id', true));

CREATE POLICY companies_tenant_isolation ON "companies"
  FOR ALL TO moby_app
  USING (current_setting('app.current_user_role', true) = 'SUPER_ADMIN' OR "tenant_id" = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.current_user_role', true) = 'SUPER_ADMIN' OR "tenant_id" = current_setting('app.current_tenant_id', true));

CREATE POLICY units_tenant_isolation ON "units"
  FOR ALL TO moby_app
  USING (current_setting('app.current_user_role', true) = 'SUPER_ADMIN' OR "tenant_id" = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.current_user_role', true) = 'SUPER_ADMIN' OR "tenant_id" = current_setting('app.current_tenant_id', true));

CREATE POLICY sectors_tenant_isolation ON "sectors"
  FOR ALL TO moby_app
  USING (current_setting('app.current_user_role', true) = 'SUPER_ADMIN' OR "tenant_id" = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.current_user_role', true) = 'SUPER_ADMIN' OR "tenant_id" = current_setting('app.current_tenant_id', true));

CREATE POLICY job_functions_tenant_isolation ON "job_functions"
  FOR ALL TO moby_app
  USING (current_setting('app.current_user_role', true) = 'SUPER_ADMIN' OR "tenant_id" = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.current_user_role', true) = 'SUPER_ADMIN' OR "tenant_id" = current_setting('app.current_tenant_id', true));

CREATE POLICY employees_tenant_isolation ON "employees"
  FOR ALL TO moby_app
  USING (current_setting('app.current_user_role', true) = 'SUPER_ADMIN' OR "tenant_id" = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.current_user_role', true) = 'SUPER_ADMIN' OR "tenant_id" = current_setting('app.current_tenant_id', true));

CREATE POLICY users_tenant_isolation ON "users"
  FOR ALL TO moby_app
  USING (current_setting('app.current_user_role', true) = 'SUPER_ADMIN' OR "tenant_id" = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.current_user_role', true) = 'SUPER_ADMIN' OR "tenant_id" = current_setting('app.current_tenant_id', true));

CREATE POLICY user_company_access_tenant_isolation ON "user_company_access"
  FOR ALL TO moby_app
  USING (
    current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    OR EXISTS (
      SELECT 1 FROM "companies"
      WHERE "companies"."id" = "user_company_access"."company_id"
        AND "companies"."tenant_id" = current_setting('app.current_tenant_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    OR EXISTS (
      SELECT 1 FROM "companies"
      WHERE "companies"."id" = "user_company_access"."company_id"
        AND "companies"."tenant_id" = current_setting('app.current_tenant_id', true)
    )
  );

CREATE POLICY user_unit_access_tenant_isolation ON "user_unit_access"
  FOR ALL TO moby_app
  USING (
    current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    OR EXISTS (
      SELECT 1 FROM "units"
      WHERE "units"."id" = "user_unit_access"."unit_id"
        AND "units"."tenant_id" = current_setting('app.current_tenant_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    OR EXISTS (
      SELECT 1 FROM "units"
      WHERE "units"."id" = "user_unit_access"."unit_id"
        AND "units"."tenant_id" = current_setting('app.current_tenant_id', true)
    )
  );

CREATE POLICY epi_items_tenant_isolation ON "epi_items"
  FOR ALL TO moby_app
  USING (current_setting('app.current_user_role', true) = 'SUPER_ADMIN' OR "tenant_id" = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.current_user_role', true) = 'SUPER_ADMIN' OR "tenant_id" = current_setting('app.current_tenant_id', true));

CREATE POLICY epi_deliveries_tenant_isolation ON "epi_deliveries"
  FOR ALL TO moby_app
  USING (current_setting('app.current_user_role', true) = 'SUPER_ADMIN' OR "tenant_id" = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.current_user_role', true) = 'SUPER_ADMIN' OR "tenant_id" = current_setting('app.current_tenant_id', true));

CREATE POLICY audit_logs_tenant_isolation ON "audit_logs"
  FOR ALL TO moby_app
  USING (current_setting('app.current_user_role', true) = 'SUPER_ADMIN' OR "tenant_id" = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.current_user_role', true) = 'SUPER_ADMIN' OR "tenant_id" = current_setting('app.current_tenant_id', true));

GRANT ALL ON ALL TABLES IN SCHEMA public TO moby_app;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO moby_app;
