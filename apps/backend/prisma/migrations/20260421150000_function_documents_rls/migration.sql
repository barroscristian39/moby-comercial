ALTER TABLE "function_units" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "function_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "generated_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_audit_logs" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS function_units_tenant_isolation ON "function_units";
DROP POLICY IF EXISTS function_templates_tenant_isolation ON "function_templates";
DROP POLICY IF EXISTS generated_documents_tenant_isolation ON "generated_documents";
DROP POLICY IF EXISTS document_audit_logs_tenant_isolation ON "document_audit_logs";

CREATE POLICY function_units_tenant_isolation ON "function_units"
  FOR ALL TO moby_app
  USING (current_setting('app.current_user_role', true) = 'SUPER_ADMIN' OR "tenant_id" = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.current_user_role', true) = 'SUPER_ADMIN' OR "tenant_id" = current_setting('app.current_tenant_id', true));

CREATE POLICY function_templates_tenant_isolation ON "function_templates"
  FOR ALL TO moby_app
  USING (current_setting('app.current_user_role', true) = 'SUPER_ADMIN' OR "tenant_id" = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.current_user_role', true) = 'SUPER_ADMIN' OR "tenant_id" = current_setting('app.current_tenant_id', true));

CREATE POLICY generated_documents_tenant_isolation ON "generated_documents"
  FOR ALL TO moby_app
  USING (current_setting('app.current_user_role', true) = 'SUPER_ADMIN' OR "tenant_id" = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.current_user_role', true) = 'SUPER_ADMIN' OR "tenant_id" = current_setting('app.current_tenant_id', true));

CREATE POLICY document_audit_logs_tenant_isolation ON "document_audit_logs"
  FOR ALL TO moby_app
  USING (current_setting('app.current_user_role', true) = 'SUPER_ADMIN' OR "tenant_id" = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.current_user_role', true) = 'SUPER_ADMIN' OR "tenant_id" = current_setting('app.current_tenant_id', true));

GRANT ALL ON "function_units" TO moby_app;
GRANT ALL ON "function_templates" TO moby_app;
GRANT ALL ON "generated_documents" TO moby_app;
GRANT ALL ON "document_audit_logs" TO moby_app;
