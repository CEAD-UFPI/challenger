# generate-prd-brd-srs

## Objective
Generate or regenerate the three core requirement documents (PRD, BRD, SRS) from the current state of the Challenger source code.

## When to Use
- After significant feature additions
- When preparing for a stakeholder review
- As part of a release cycle
- When the existing docs are known to be stale

## Inputs
- Entire repository codebase (`back/` and `front/`)
- Existing `docs/PRD.md`, `docs/BRD.md`, `docs/SRS.md` as baseline
- `docs/ARCHITECTURE.md` for tech context
- `docs/FEATURE_GAP_ANALYSIS.md` for known issues

## Steps

### PRD Generation
1. Audit all frontend pages and backend endpoints to list features
2. Categorize features: Implemented, Partial, Not Implemented
3. Extract personas from role-based code (Roles enum + Layout RBAC)
4. Trace happy-path user flows from the UI
5. Define success criteria based on business rules
6. Generate prioritized backlog from gap analysis

### BRD Generation
1. Extract business rules from `SolicitationService`, route handlers, and Zod validations
2. Document all status state machines from Prisma enums
3. Document all constraints from schema (unique, foreign keys, defaults)
4. Map actors (roles) to actions (endpoints + status transitions)
5. Create business glossary from model/table names

### SRS Generation
1. Document every API endpoint: method, path, inputs, outputs, errors
2. Document every functional requirement with acceptance criteria
3. Document non-functional requirements: security, performance, usability
4. Document data validation rules across frontend and backend
5. Document all error flows

## Validations
- [ ] PRD: Every feature listed maps to actual code or a documented gap
- [ ] BRD: Every business rule is traceable to a specific file and line
- [ ] SRS: Every API endpoint is documented with request/response examples
- [ ] No placeholder or generic content — everything is code-derived

## Output
Updated `/docs/PRD.md`, `/docs/BRD.md`, `/docs/SRS.md`.
