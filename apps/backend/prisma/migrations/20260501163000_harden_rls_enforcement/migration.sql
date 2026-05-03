-- Mirrors prisma/rls.sql to harden production-grade RLS enforcement.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'moby_app') THEN
    CREATE ROLE moby_app NOLOGIN;
  END IF;
END
$$;

ALTER ROLE moby_app WITH NOLOGIN NOBYPASSRLS;

DO $$
BEGIN
  IF NOT pg_has_role(current_user, 'moby_app', 'member') THEN
    EXECUTE format('GRANT moby_app TO %I', current_user);
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO moby_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO moby_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO moby_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO moby_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO moby_app;

CREATE OR REPLACE FUNCTION public.moby_current_tenant_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')
$$;

CREATE OR REPLACE FUNCTION public.moby_current_user_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_user_role', true), '')
$$;

CREATE OR REPLACE FUNCTION public.moby_is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.moby_current_user_role() = 'SUPER_ADMIN'
$$;

CREATE OR REPLACE FUNCTION public.moby_is_auth_service()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.moby_current_user_role() = 'AUTH_SERVICE'
$$;

CREATE OR REPLACE FUNCTION public.moby_is_bootstrap_service()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.moby_current_user_role() = 'BOOTSTRAP_SERVICE'
$$;

ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenants" FORCE ROW LEVEL SECURITY;
ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "companies" FORCE ROW LEVEL SECURITY;
ALTER TABLE "units" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "units" FORCE ROW LEVEL SECURITY;
ALTER TABLE "sectors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sectors" FORCE ROW LEVEL SECURITY;
ALTER TABLE "job_functions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_functions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "function_units" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "function_units" FORCE ROW LEVEL SECURITY;
ALTER TABLE "employees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "employees" FORCE ROW LEVEL SECURITY;
ALTER TABLE "risks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "risks" FORCE ROW LEVEL SECURITY;
ALTER TABLE "function_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "function_templates" FORCE ROW LEVEL SECURITY;
ALTER TABLE "generated_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "generated_documents" FORCE ROW LEVEL SECURITY;
ALTER TABLE "document_audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_audit_logs" FORCE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" FORCE ROW LEVEL SECURITY;
ALTER TABLE "user_company_access" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_company_access" FORCE ROW LEVEL SECURITY;
ALTER TABLE "user_unit_access" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_unit_access" FORCE ROW LEVEL SECURITY;
ALTER TABLE "refresh_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "refresh_tokens" FORCE ROW LEVEL SECURITY;
ALTER TABLE "password_reset_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "password_reset_tokens" FORCE ROW LEVEL SECURITY;
ALTER TABLE "epi_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "epi_items" FORCE ROW LEVEL SECURITY;
ALTER TABLE "epi_deliveries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "epi_deliveries" FORCE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenants_read_internal ON "tenants";
DROP POLICY IF EXISTS tenants_tenant_isolation ON "tenants";
DROP POLICY IF EXISTS companies_tenant_isolation ON "companies";
DROP POLICY IF EXISTS units_tenant_isolation ON "units";
DROP POLICY IF EXISTS sectors_tenant_isolation ON "sectors";
DROP POLICY IF EXISTS job_functions_tenant_isolation ON "job_functions";
DROP POLICY IF EXISTS function_units_tenant_isolation ON "function_units";
DROP POLICY IF EXISTS employees_tenant_isolation ON "employees";
DROP POLICY IF EXISTS risks_tenant_isolation ON "risks";
DROP POLICY IF EXISTS function_templates_tenant_isolation ON "function_templates";
DROP POLICY IF EXISTS generated_documents_tenant_isolation ON "generated_documents";
DROP POLICY IF EXISTS document_audit_logs_tenant_isolation ON "document_audit_logs";
DROP POLICY IF EXISTS users_read_internal ON "users";
DROP POLICY IF EXISTS users_tenant_isolation ON "users";
DROP POLICY IF EXISTS users_auth_service_update ON "users";
DROP POLICY IF EXISTS users_bootstrap_insert ON "users";
DROP POLICY IF EXISTS notifications_tenant_isolation ON "notifications";
DROP POLICY IF EXISTS user_company_access_read_internal ON "user_company_access";
DROP POLICY IF EXISTS user_company_access_tenant_isolation ON "user_company_access";
DROP POLICY IF EXISTS user_unit_access_read_internal ON "user_unit_access";
DROP POLICY IF EXISTS user_unit_access_tenant_isolation ON "user_unit_access";
DROP POLICY IF EXISTS refresh_tokens_read_internal ON "refresh_tokens";
DROP POLICY IF EXISTS refresh_tokens_tenant_isolation ON "refresh_tokens";
DROP POLICY IF EXISTS password_reset_tokens_read_internal ON "password_reset_tokens";
DROP POLICY IF EXISTS password_reset_tokens_tenant_isolation ON "password_reset_tokens";
DROP POLICY IF EXISTS epi_items_tenant_isolation ON "epi_items";
DROP POLICY IF EXISTS epi_deliveries_tenant_isolation ON "epi_deliveries";
DROP POLICY IF EXISTS audit_logs_read_policy ON "audit_logs";
DROP POLICY IF EXISTS audit_logs_write_policy ON "audit_logs";

CREATE POLICY tenants_read_internal ON "tenants"
  FOR SELECT TO moby_app
  USING (
    public.moby_is_auth_service()
    OR public.moby_is_super_admin()
    OR "id" = public.moby_current_tenant_id()
  );

CREATE POLICY tenants_tenant_isolation ON "tenants"
  FOR ALL TO moby_app
  USING (
    public.moby_is_super_admin()
    OR "id" = public.moby_current_tenant_id()
  )
  WITH CHECK (
    public.moby_is_super_admin()
    OR "id" = public.moby_current_tenant_id()
  );

CREATE POLICY companies_tenant_isolation ON "companies"
  FOR ALL TO moby_app
  USING (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  )
  WITH CHECK (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  );

CREATE POLICY units_tenant_isolation ON "units"
  FOR ALL TO moby_app
  USING (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  )
  WITH CHECK (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  );

CREATE POLICY sectors_tenant_isolation ON "sectors"
  FOR ALL TO moby_app
  USING (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  )
  WITH CHECK (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  );

CREATE POLICY job_functions_tenant_isolation ON "job_functions"
  FOR ALL TO moby_app
  USING (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  )
  WITH CHECK (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  );

CREATE POLICY function_units_tenant_isolation ON "function_units"
  FOR ALL TO moby_app
  USING (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  )
  WITH CHECK (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  );

CREATE POLICY employees_tenant_isolation ON "employees"
  FOR ALL TO moby_app
  USING (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  )
  WITH CHECK (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  );

CREATE POLICY risks_tenant_isolation ON "risks"
  FOR ALL TO moby_app
  USING (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  )
  WITH CHECK (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  );

CREATE POLICY function_templates_tenant_isolation ON "function_templates"
  FOR ALL TO moby_app
  USING (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  )
  WITH CHECK (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  );

CREATE POLICY generated_documents_tenant_isolation ON "generated_documents"
  FOR ALL TO moby_app
  USING (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  )
  WITH CHECK (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  );

CREATE POLICY document_audit_logs_tenant_isolation ON "document_audit_logs"
  FOR ALL TO moby_app
  USING (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  )
  WITH CHECK (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  );

CREATE POLICY users_read_internal ON "users"
  FOR SELECT TO moby_app
  USING (
    public.moby_is_auth_service()
    OR public.moby_is_bootstrap_service()
    OR public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  );

CREATE POLICY users_tenant_isolation ON "users"
  FOR ALL TO moby_app
  USING (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  )
  WITH CHECK (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  );

CREATE POLICY users_auth_service_update ON "users"
  FOR UPDATE TO moby_app
  USING (public.moby_is_auth_service())
  WITH CHECK (public.moby_is_auth_service());

CREATE POLICY users_bootstrap_insert ON "users"
  FOR INSERT TO moby_app
  WITH CHECK (
    public.moby_is_bootstrap_service()
    AND "tenant_id" IS NULL
    AND "company_id" IS NULL
    AND "role" = 'SUPER_ADMIN'::"Role"
    AND NOT EXISTS (
      SELECT 1
      FROM "users" existing
      WHERE existing."deleted_at" IS NULL
    )
  );

CREATE POLICY notifications_tenant_isolation ON "notifications"
  FOR ALL TO moby_app
  USING (
    public.moby_is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM "users"
      WHERE "users"."id" = "notifications"."user_id"
        AND "users"."tenant_id" = public.moby_current_tenant_id()
    )
  )
  WITH CHECK (
    public.moby_is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM "users"
      WHERE "users"."id" = "notifications"."user_id"
        AND "users"."tenant_id" = public.moby_current_tenant_id()
    )
  );

CREATE POLICY user_company_access_read_internal ON "user_company_access"
  FOR SELECT TO moby_app
  USING (
    public.moby_is_auth_service()
    OR public.moby_is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM "companies"
      WHERE "companies"."id" = "user_company_access"."company_id"
        AND "companies"."tenant_id" = public.moby_current_tenant_id()
    )
  );

CREATE POLICY user_company_access_tenant_isolation ON "user_company_access"
  FOR ALL TO moby_app
  USING (
    public.moby_is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM "companies"
      WHERE "companies"."id" = "user_company_access"."company_id"
        AND "companies"."tenant_id" = public.moby_current_tenant_id()
    )
  )
  WITH CHECK (
    public.moby_is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM "companies"
      WHERE "companies"."id" = "user_company_access"."company_id"
        AND "companies"."tenant_id" = public.moby_current_tenant_id()
    )
  );

CREATE POLICY user_unit_access_read_internal ON "user_unit_access"
  FOR SELECT TO moby_app
  USING (
    public.moby_is_auth_service()
    OR public.moby_is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM "units"
      WHERE "units"."id" = "user_unit_access"."unit_id"
        AND "units"."tenant_id" = public.moby_current_tenant_id()
    )
  );

CREATE POLICY user_unit_access_tenant_isolation ON "user_unit_access"
  FOR ALL TO moby_app
  USING (
    public.moby_is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM "units"
      WHERE "units"."id" = "user_unit_access"."unit_id"
        AND "units"."tenant_id" = public.moby_current_tenant_id()
    )
  )
  WITH CHECK (
    public.moby_is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM "units"
      WHERE "units"."id" = "user_unit_access"."unit_id"
        AND "units"."tenant_id" = public.moby_current_tenant_id()
    )
  );

CREATE POLICY refresh_tokens_read_internal ON "refresh_tokens"
  FOR SELECT TO moby_app
  USING (
    public.moby_is_auth_service()
    OR public.moby_is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM "users"
      WHERE "users"."id" = "refresh_tokens"."user_id"
        AND "users"."tenant_id" = public.moby_current_tenant_id()
    )
  );

CREATE POLICY refresh_tokens_tenant_isolation ON "refresh_tokens"
  FOR ALL TO moby_app
  USING (
    public.moby_is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM "users"
      WHERE "users"."id" = "refresh_tokens"."user_id"
        AND "users"."tenant_id" = public.moby_current_tenant_id()
    )
  )
  WITH CHECK (
    public.moby_is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM "users"
      WHERE "users"."id" = "refresh_tokens"."user_id"
        AND "users"."tenant_id" = public.moby_current_tenant_id()
    )
  );

CREATE POLICY password_reset_tokens_read_internal ON "password_reset_tokens"
  FOR SELECT TO moby_app
  USING (
    public.moby_is_auth_service()
    OR public.moby_is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM "users"
      WHERE "users"."id" = "password_reset_tokens"."user_id"
        AND "users"."tenant_id" = public.moby_current_tenant_id()
    )
  );

CREATE POLICY password_reset_tokens_tenant_isolation ON "password_reset_tokens"
  FOR ALL TO moby_app
  USING (
    public.moby_is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM "users"
      WHERE "users"."id" = "password_reset_tokens"."user_id"
        AND "users"."tenant_id" = public.moby_current_tenant_id()
    )
  )
  WITH CHECK (
    public.moby_is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM "users"
      WHERE "users"."id" = "password_reset_tokens"."user_id"
        AND "users"."tenant_id" = public.moby_current_tenant_id()
    )
  );

CREATE POLICY epi_items_tenant_isolation ON "epi_items"
  FOR ALL TO moby_app
  USING (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  )
  WITH CHECK (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  );

CREATE POLICY epi_deliveries_tenant_isolation ON "epi_deliveries"
  FOR ALL TO moby_app
  USING (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  )
  WITH CHECK (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  );

CREATE POLICY audit_logs_read_policy ON "audit_logs"
  FOR SELECT TO moby_app
  USING (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  );

CREATE POLICY audit_logs_write_policy ON "audit_logs"
  FOR INSERT TO moby_app
  WITH CHECK (
    public.moby_is_auth_service()
    OR public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  );
