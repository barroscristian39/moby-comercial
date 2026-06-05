ALTER TABLE "accidents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "accidents" FORCE ROW LEVEL SECURITY;
ALTER TABLE "accident_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "accident_templates" FORCE ROW LEVEL SECURITY;
ALTER TABLE "accident_generated_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "accident_generated_documents" FORCE ROW LEVEL SECURITY;
ALTER TABLE "accident_evidences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "accident_evidences" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS accidents_tenant_isolation ON "accidents";
DROP POLICY IF EXISTS accident_templates_tenant_isolation ON "accident_templates";
DROP POLICY IF EXISTS accident_generated_documents_tenant_isolation ON "accident_generated_documents";
DROP POLICY IF EXISTS accident_evidences_tenant_isolation ON "accident_evidences";

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

CREATE POLICY accident_templates_tenant_isolation ON "accident_templates"
  FOR ALL TO moby_app
  USING (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  )
  WITH CHECK (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  );

CREATE POLICY accident_generated_documents_tenant_isolation ON "accident_generated_documents"
  FOR ALL TO moby_app
  USING (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  )
  WITH CHECK (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  );

CREATE POLICY accident_evidences_tenant_isolation ON "accident_evidences"
  FOR ALL TO moby_app
  USING (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  )
  WITH CHECK (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  );
