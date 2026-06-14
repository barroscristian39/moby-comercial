CREATE TYPE "SstLegalDocumentType" AS ENUM (
  'PGR',
  'PCMSO',
  'LTCAT',
  'LIP'
);

CREATE TYPE "SstLegalDocumentStatus" AS ENUM (
  'DRAFT',
  'ACTIVE',
  'SUPERSEDED',
  'ARCHIVED'
);

CREATE TABLE "sst_legal_documents" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "unit_id" TEXT,
  "document_type" "SstLegalDocumentType" NOT NULL,
  "title" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "status" "SstLegalDocumentStatus" NOT NULL DEFAULT 'ACTIVE',
  "summary" TEXT,
  "content_html" TEXT NOT NULL,
  "effective_from" DATE,
  "effective_until" DATE,
  "generated_by" TEXT NOT NULL,
  "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  "deleted_by" TEXT,

  CONSTRAINT "sst_legal_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sst_legal_documents_tenant_id_idx" ON "sst_legal_documents"("tenant_id");
CREATE INDEX "sst_legal_documents_tenant_id_company_id_idx" ON "sst_legal_documents"("tenant_id", "company_id");
CREATE INDEX "sst_legal_documents_company_id_document_type_version_idx" ON "sst_legal_documents"("company_id", "document_type", "version");
CREATE INDEX "sst_legal_documents_unit_id_idx" ON "sst_legal_documents"("unit_id");
CREATE INDEX "sst_legal_documents_status_generated_at_idx" ON "sst_legal_documents"("status", "generated_at");

ALTER TABLE "sst_legal_documents" ADD CONSTRAINT "sst_legal_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sst_legal_documents" ADD CONSTRAINT "sst_legal_documents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sst_legal_documents" ADD CONSTRAINT "sst_legal_documents_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sst_legal_documents" ADD CONSTRAINT "sst_legal_documents_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sst_legal_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sst_legal_documents" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sst_legal_documents_tenant_isolation ON "sst_legal_documents";

CREATE POLICY sst_legal_documents_tenant_isolation ON "sst_legal_documents"
  FOR ALL TO moby_app
  USING (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  )
  WITH CHECK (
    public.moby_is_super_admin()
    OR "tenant_id" = public.moby_current_tenant_id()
  );

