# map-business-rules

## Objective
Extract and document every business rule embedded in the Challenger codebase — approval flows, validations, constraints, status transitions, and role-based logic.

## When to Use
- Before modifying any workflow (approvals, statuses, roles)
- When onboarding business analysts
- After discovering behavior that doesn't match documentation
- To validate that business rules are consistently enforced across frontend and backend

## Inputs
- `back/src/server.ts` (SolicitationService class, route handlers)
- `back/prisma/schema.prisma` (enums, defaults, constraints)
- `back/prisma/setup.sql` (database triggers)
- `front/src/pages/Movimentacoes/` (form validations)
- `front/src/components/Layout.tsx` (RBAC menu rules)

## Steps
1. Read `SolicitationService` class fully — document every method
2. Read `SolicitationStatus` and `ReportStatus` enums — document state machines
3. Read all Zod schemas in frontend forms — document validation rules
4. Read `checkBlocklist()` — document blocking logic
5. Read `updateStatus()` — trace every possible state transition
6. Read `hasPermission()` in Layout.tsx — document RBAC matrix
7. Read route handlers for course-scoping logic
8. Read login handler for user status checks
9. Read `setup.sql` trigger — document automated behavior
10. Cross-reference backend constraints with frontend validations

## Validations
- [ ] Every enum value has a documented meaning
- [ ] Every state transition has a documented actor (role) and condition
- [ ] Blocking rules (blocklist, status checks) are fully traced
- [ ] RBAC matrix is complete (who can do what, where?)
- [ ] No divergent validation between frontend and backend

## Output
Update `docs/BRD.md` with new or corrected business rules, or generate a focused business rules report.
