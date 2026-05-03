-- Ensure the connection role can switch into moby_app on PostgreSQL 16+.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_auth_members membership
    JOIN pg_roles granted_role ON granted_role.oid = membership.roleid
    JOIN pg_roles member_role ON member_role.oid = membership.member
    WHERE granted_role.rolname = 'moby_app'
      AND member_role.rolname = current_user
      AND membership.set_option
  ) THEN
    EXECUTE format('GRANT moby_app TO %I WITH SET TRUE', current_user);
  END IF;
END
$$;
