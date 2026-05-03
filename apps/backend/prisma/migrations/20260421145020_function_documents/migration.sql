-- CreateEnum
CREATE TYPE "FunctionStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "GeneratedDocumentStatus" AS ENUM ('ACTIVE', 'DELETED');

-- CreateEnum
CREATE TYPE "DocumentAuditAction" AS ENUM ('CREATED', 'DELETED');

-- AlterTable
ALTER TABLE "job_functions" ADD COLUMN     "status" "FunctionStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "function_units" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "function_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "function_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "function_templates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "function_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "function_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_documents" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "function_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "generated_by" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "GeneratedDocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "generated_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "action" "DocumentAuditAction" NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "function_units_tenant_id_idx" ON "function_units"("tenant_id");

-- CreateIndex
CREATE INDEX "function_units_unit_id_idx" ON "function_units"("unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "function_units_function_id_unit_id_key" ON "function_units"("function_id", "unit_id");

-- CreateIndex
CREATE INDEX "function_templates_tenant_id_idx" ON "function_templates"("tenant_id");

-- CreateIndex
CREATE INDEX "function_templates_tenant_id_function_id_idx" ON "function_templates"("tenant_id", "function_id");

-- CreateIndex
CREATE INDEX "function_templates_function_id_document_type_is_active_idx" ON "function_templates"("function_id", "document_type", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "function_templates_function_id_document_type_version_key" ON "function_templates"("function_id", "document_type", "version");

-- CreateIndex
CREATE INDEX "generated_documents_tenant_id_idx" ON "generated_documents"("tenant_id");

-- CreateIndex
CREATE INDEX "generated_documents_employee_id_status_idx" ON "generated_documents"("employee_id", "status");

-- CreateIndex
CREATE INDEX "generated_documents_tenant_id_employee_id_idx" ON "generated_documents"("tenant_id", "employee_id");

-- CreateIndex
CREATE INDEX "generated_documents_template_id_idx" ON "generated_documents"("template_id");

-- CreateIndex
CREATE INDEX "document_audit_logs_tenant_id_idx" ON "document_audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "document_audit_logs_document_id_idx" ON "document_audit_logs"("document_id");

-- CreateIndex
CREATE INDEX "document_audit_logs_user_id_idx" ON "document_audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "job_functions_tenant_id_status_idx" ON "job_functions"("tenant_id", "status");

-- AddForeignKey
ALTER TABLE "function_units" ADD CONSTRAINT "function_units_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "function_units" ADD CONSTRAINT "function_units_function_id_fkey" FOREIGN KEY ("function_id") REFERENCES "job_functions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "function_units" ADD CONSTRAINT "function_units_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "function_templates" ADD CONSTRAINT "function_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "function_templates" ADD CONSTRAINT "function_templates_function_id_fkey" FOREIGN KEY ("function_id") REFERENCES "job_functions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "function_templates" ADD CONSTRAINT "function_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_function_id_fkey" FOREIGN KEY ("function_id") REFERENCES "job_functions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "function_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_audit_logs" ADD CONSTRAINT "document_audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_audit_logs" ADD CONSTRAINT "document_audit_logs_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "generated_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_audit_logs" ADD CONSTRAINT "document_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
