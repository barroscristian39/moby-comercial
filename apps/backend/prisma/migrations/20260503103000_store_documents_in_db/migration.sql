ALTER TABLE "function_templates"
  ALTER COLUMN "file_path" DROP NOT NULL,
  ADD COLUMN "file_content" BYTEA;

ALTER TABLE "generated_documents"
  ALTER COLUMN "file_path" DROP NOT NULL,
  ADD COLUMN "file_content" BYTEA;

ALTER TABLE "accident_templates"
  ALTER COLUMN "file_path" DROP NOT NULL,
  ADD COLUMN "file_content" BYTEA;

ALTER TABLE "accident_generated_documents"
  ALTER COLUMN "file_path" DROP NOT NULL,
  ADD COLUMN "file_content" BYTEA;
