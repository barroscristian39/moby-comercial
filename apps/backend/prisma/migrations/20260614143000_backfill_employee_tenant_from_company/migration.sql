-- Corrige colaboradores antigos cujo tenant_id ficou divergente da empresa.
-- Com RLS forçado em employees, essa divergência faz a listagem retornar vazia
-- mesmo quando company_id/unit_id estão corretos.
UPDATE "employees" AS employee
SET "tenant_id" = company."tenant_id"
FROM "companies" AS company
WHERE employee."company_id" = company."id"
  AND employee."tenant_id" IS DISTINCT FROM company."tenant_id";
