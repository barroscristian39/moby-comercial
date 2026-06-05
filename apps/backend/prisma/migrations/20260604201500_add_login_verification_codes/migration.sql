ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LOGIN_MFA_REQUEST';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LOGIN_MFA_COMPLETE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LOGIN_MFA_FAILED';

CREATE TABLE "login_verification_codes" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "code_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at" TIMESTAMP(3),
  "ip" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "login_verification_codes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "login_verification_codes_user_id_idx" ON "login_verification_codes"("user_id");
CREATE INDEX "login_verification_codes_expires_at_idx" ON "login_verification_codes"("expires_at");

ALTER TABLE "login_verification_codes"
ADD CONSTRAINT "login_verification_codes_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "login_verification_codes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "login_verification_codes" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS login_verification_codes_read_internal ON "login_verification_codes";
DROP POLICY IF EXISTS login_verification_codes_tenant_isolation ON "login_verification_codes";

CREATE POLICY login_verification_codes_read_internal ON "login_verification_codes"
  FOR SELECT TO moby_app
  USING (
    public.moby_is_auth_service()
    OR public.moby_is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM "users"
      WHERE "users"."id" = "login_verification_codes"."user_id"
        AND "users"."tenant_id" = public.moby_current_tenant_id()
    )
  );

CREATE POLICY login_verification_codes_tenant_isolation ON "login_verification_codes"
  FOR ALL TO moby_app
  USING (
    public.moby_is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM "users"
      WHERE "users"."id" = "login_verification_codes"."user_id"
        AND "users"."tenant_id" = public.moby_current_tenant_id()
    )
  )
  WITH CHECK (
    public.moby_is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM "users"
      WHERE "users"."id" = "login_verification_codes"."user_id"
        AND "users"."tenant_id" = public.moby_current_tenant_id()
    )
  );
