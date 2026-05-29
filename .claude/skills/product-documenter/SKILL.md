# Product Documenter Skill

## Scope
Generate structured, code-derived product documentation (PRD, BRD, SRS) for the Challenger (SDP) project.

## Methodology

### PRD Generation
1. **Personas:** Extract from Role enum and RBAC code in Layout.tsx. For each role, document: who they are, their needs, their permissions.
2. **Features:** Categorize into:
   - Implemented: fully working end-to-end
   - Partial: code exists but has bugs or missing pieces
   - Not implemented: only in schema/models, no UI or API
3. **User Flows:** Trace from frontend page → API call → backend handler → database → response → UI update.
4. **Success Criteria:** Define measurable outcomes based on business rules.
5. **Backlog:** Prioritize based on gap analysis findings.

### BRD Generation
1. **Business Context:** Extract from project metadata, organization naming, domain terminology.
2. **Business Rules:** Extract from:
   - `SolicitationService` methods (checkBlocklist, create, updateStatus)
   - Status enums and their transitions
   - Database constraints (unique, foreign keys, defaults, checks)
   - Route-level authorization filters
   - Zod validation schemas
3. **Operational Processes:** Document step-by-step for each user journey.
4. **Restrictions:** Document all constraints from schema and code.
5. **Glossary:** Map domain terms to code entities.

### SRS Generation
1. **Functional Requirements:** One requirement per API endpoint. Include: method, path, inputs, outputs, error codes, business rules.
2. **Non-Functional Requirements:** Security, performance, availability, maintainability, usability.
3. **Data Requirements:** Entities, validations, constraints.
4. **Error Flows:** Every possible error response for every endpoint.
5. **External Dependencies:** Every third-party service and configuration.

## Checklist
- [ ] Every claim is traceable to a specific file and line number
- [ ] No generic/placeholder content
- [ ] All API endpoints documented with request/response examples
- [ ] All business rules have code references
- [ ] All personas map to actual Role enum values
- [ ] Backlog prioritized by severity and effort

## Output
- `docs/PRD.md` — product vision, personas, features, success criteria, backlog
- `docs/BRD.md` — business context, rules, processes, restrictions, glossary
- `docs/SRS.md` — functional/non-functional requirements, data, error flows
