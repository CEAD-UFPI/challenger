# review-auth-rbac

## Objective
Comprehensive review of authentication and role-based access control in Challenger — verify every route is properly protected and every role has correct permissions.

## When to Use
- Before production deployment
- After adding new roles or endpoints
- Security audit
- When debugging permission-related issues

## Inputs
- `back/src/server.ts` — all route handlers
- `back/src/services/emailService.ts` — email-based auth flows
- `front/src/store/authStore.ts` — token management
- `front/src/services/api.ts` — JWT interceptor
- `front/src/components/Layout.tsx` — RBAC menu configuration
- `back/prisma/schema.prisma` — Role enum

## Steps

### Authentication Review
1. List all API routes and their current auth status (protected/unprotected)
2. Verify `getUserFromRequest()` is called on every protected route
3. Check JWT configuration: secret storage, expiry, algorithm
4. Check password handling: hashing algorithm, salt rounds
5. Check token storage on frontend: localStorage, sessionStorage, memory
6. Check for refresh token mechanism
7. Check account lifecycle: creation → pending → active → blocked
8. Verify email verification flow (token expiry, one-time use)

### RBAC Review
1. Extract all role checks from backend route handlers
2. Extract all role checks from frontend (`Layout.tsx` `hasPermission()`)
3. Build RBAC matrix: Role × Endpoint × Action
4. Verify frontend guards are backed by backend guards (defense in depth)
5. Check for privilege escalation vectors:
   - Role passed from client instead of JWT (e.g., PATCH status)
   - Endpoints trusting user-supplied IDs
   - Missing course-scoping for non-admin users
6. Verify course-level isolation is consistently applied

### Frontend Auth Review
1. Verify `ProtectedRoute` covers all authenticated routes
2. Check that `isAuthenticated` is derived from actual token validation
3. Verify logout cleans up all state (store + localStorage)
4. Check for token expiration handling (auto-logout on 401)

## Validations
- [ ] Every API route has documented auth requirement
- [ ] Auth is enforced server-side (not just client-side)
- [ ] No role passed from untrusted source (body/query) for authorization decisions
- [ ] Course isolation is consistently applied
- [ ] JWT secret is not hardcoded
- [ ] Password reset flow exists or gap is documented

## Output
Generate an Auth/RBAC audit report with:
- Matrix of Endpoint × Role × Access
- List of unprotected routes
- List of client-side-only restrictions
- Prioritized remediation steps
