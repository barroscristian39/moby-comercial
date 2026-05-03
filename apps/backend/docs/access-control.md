# MOBY Access Foundation

## Model

MOBY uses a tenant-first access model:

- `SUPER_ADMIN` has no `tenant_id` and is a global platform operator.
- `TENANT_ADMIN` belongs to one tenant and receives all active companies and units from that tenant at authentication time.
- Operational users belong to one tenant and only receive the companies and units explicitly listed in `user_company_access` and `user_unit_access`.

Access is denied unless authentication, tenant status, role/permission and scope checks all pass.

## Request Context

JWT validation always reloads the user from the database. This invalidates access immediately when a user is disabled, deleted, or when the tenant is suspended/canceled.

`GET /api/auth/context` returns:

- `user_id`
- `tenant_id`
- `role`
- `companies_allowed`
- `units_allowed`
- `available_permissions`
- `menus`

The frontend should render menus from this endpoint instead of hardcoding ACL decisions.

## Authorization Layers

1. `JwtAuthGuard`: authenticates every non-public route by default.
2. `RolesGuard`: supports coarse route roles and lets `SUPER_ADMIN` bypass role checks.
3. `PermissionsGuard`: enforces explicit permissions from `@RequirePermissions(...)`.
4. `ScopeGuard` and `AuthorizationService`: validate tenant, company and unit scope.
5. Repositories keep tenant-aware filters in database queries.

## Tenant Status

Operational access is allowed only when:

- tenant `is_active = true`
- tenant `status` is `ACTIVE` or `TRIAL`

Suspending or canceling a tenant revokes refresh tokens for that tenant. `SUPER_ADMIN` remains able to operate globally.

## Tokens and Passwords

- Access token: short-lived JWT.
- Refresh token: HttpOnly cookie with rotation; the refresh endpoint does not accept `userId` from the client.
- Passwords: scrypt with high work factor; legacy bcrypt hashes are verified and upgraded on successful login.
- Reset password: one-time token, SHA-256 stored hash, 30-minute expiration, generic response for forgot-password requests.

## Audit

Critical mutations, login, failed login, refresh, logout, password reset, tenant status changes and user permission/status changes write to `audit_logs`. Sensitive fields such as password, token, secret, authorization and cookie are redacted before storage.
