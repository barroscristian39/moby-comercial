ALTER TABLE "function_templates"
ADD COLUMN "variables" JSONB NOT NULL DEFAULT '[]';
