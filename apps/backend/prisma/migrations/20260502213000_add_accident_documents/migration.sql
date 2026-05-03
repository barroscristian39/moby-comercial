-- CreateTable
CREATE TABLE "accident_templates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "variables" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "accident_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accident_generated_documents" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "accident_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "generated_by" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "GeneratedDocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "accident_generated_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accident_templates_company_id_document_type_version_key" ON "accident_templates"("company_id", "document_type", "version");

-- CreateIndex
CREATE INDEX "accident_templates_tenant_id_idx" ON "accident_templates"("tenant_id");

-- CreateIndex
CREATE INDEX "accident_templates_tenant_id_company_id_idx" ON "accident_templates"("tenant_id", "company_id");

-- CreateIndex
CREATE INDEX "accident_templates_company_id_document_type_is_active_idx" ON "accident_templates"("company_id", "document_type", "is_active");

-- CreateIndex
CREATE INDEX "accident_generated_documents_tenant_id_idx" ON "accident_generated_documents"("tenant_id");

-- CreateIndex
CREATE INDEX "accident_generated_documents_company_id_idx" ON "accident_generated_documents"("company_id");

-- CreateIndex
CREATE INDEX "accident_generated_documents_accident_id_status_idx" ON "accident_generated_documents"("accident_id", "status");

-- CreateIndex
CREATE INDEX "accident_generated_documents_employee_id_idx" ON "accident_generated_documents"("employee_id");

-- CreateIndex
CREATE INDEX "accident_generated_documents_template_id_idx" ON "accident_generated_documents"("template_id");

-- AddForeignKey
ALTER TABLE "accident_templates" ADD CONSTRAINT "accident_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accident_templates" ADD CONSTRAINT "accident_templates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accident_templates" ADD CONSTRAINT "accident_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accident_generated_documents" ADD CONSTRAINT "accident_generated_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accident_generated_documents" ADD CONSTRAINT "accident_generated_documents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accident_generated_documents" ADD CONSTRAINT "accident_generated_documents_accident_id_fkey" FOREIGN KEY ("accident_id") REFERENCES "accidents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accident_generated_documents" ADD CONSTRAINT "accident_generated_documents_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accident_generated_documents" ADD CONSTRAINT "accident_generated_documents_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accident_generated_documents" ADD CONSTRAINT "accident_generated_documents_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "accident_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accident_generated_documents" ADD CONSTRAINT "accident_generated_documents_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "accident_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "accident_templates" FORCE ROW LEVEL SECURITY;
ALTER TABLE "accident_generated_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "accident_generated_documents" FORCE ROW LEVEL SECURITY;

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
