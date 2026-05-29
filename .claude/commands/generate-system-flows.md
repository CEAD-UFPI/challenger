# generate-system-flows

## Objective
Generate comprehensive end-to-end system flow documentation for Challenger, with sequence diagrams, actor interactions, step-by-step rules, and exception handling.

## When to Use
- Onboarding new team members
- Before implementing changes that affect multiple system components
- Preparing for integration testing
- Documenting workflows for compliance/audit

## Inputs
- `back/src/server.ts` — all route handlers and service logic
- `back/prisma/schema.prisma` — data model and relationships
- `back/prisma/setup.sql` — database triggers
- `front/src/pages/` — all UI pages and their API calls
- `front/src/App.tsx` — routing structure
- `docs/BRD.md` — business rules reference

## Steps
1. Identify all system flows by tracing user-facing features:
   - Login/Authentication flow
   - User onboarding (create → email → activate)
   - Solicitation creation flow
   - Approval workflow (Direção → Financeiro → FADEX)
   - Rejection and correction flow
   - Travel report / accountability flow
   - Auto-registration flow

2. For each flow:
   a. List all actors (roles, systems, external services)
   b. Draw sequence diagram (text-based or ASCII)
   c. Document pre-conditions
   d. Document step-by-step sequence with code references
   e. List all business rules applied at each step
   f. Document every possible exception and error response
   g. Add troubleshooting section

3. Cross-reference API calls with frontend pages to ensure completeness
4. Verify trigger-based flows (e.g., report auto-creation) are documented
5. Note any incomplete flows or missing endpoints

## Validations
- [ ] Every flow has a sequence diagram
- [ ] Every flow has documented exceptions
- [ ] Every flow references specific code locations
- [ ] Flows cover all SolicitatioStatus and ReportStatus transitions
- [ ] Flows cover all user roles

## Output
Update `docs/SYSTEM_FLOWS.md` or generate a new focused flow document.
