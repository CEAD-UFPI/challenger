# System Flows Generator Skill

## Scope
Generate detailed end-to-end system flow documentation for the Challenger (SDP) project, with sequence diagrams, actor interactions, step-by-step logic, business rules, exceptions, and troubleshooting guides.

## Methodology

### Flow Discovery
1. Identify flows by tracing user-facing features through the codebase:
   - Start from frontend pages (`front/src/pages/`)
   - Follow API calls to backend routes (`back/src/server.ts`)
   - Trace through services, database queries, and external integrations
2. Categorize flows: Authentication, Onboarding, Core Business (solicitations), Approvals, Reports, Administrative

### For Each Flow
1. **Actors:** List all participants (user roles, system components, external services)
2. **Sequence Diagram:** Draw ASCII/text-based sequence diagram showing:
   - Each actor as a column
   - Every interaction as an arrow (request/response)
   - Database operations and side effects
3. **Pre-conditions:** What must exist/be true before this flow can execute
4. **Step-by-Step:** Numbered steps with:
   - What happens (technical)
   - What the user sees (UX)
   - Code reference (file:line)
5. **Business Rules:** Every rule applied at each step
6. **Exceptions:** Every possible error:
   - What triggers it
   - What response the user gets
   - How to resolve it
7. **Post-conditions:** System state after successful completion

### Troubleshooting
For each flow, document common failure modes:
- Symptom → Likely cause → Diagnostic query/command → Fix

## Checklist
- [ ] Every flow has a sequence diagram
- [ ] Every flow has documented exceptions
- [ ] Every step has a code reference (file:line)
- [ ] All SolicitatioStatus transitions are covered
- [ ] All ReportStatus transitions are covered
- [ ] Covers all user roles (ADMIN, FINANCEIRO, DIRECAO, FADEX, COORDENACAO, AGENTE)
- [ ] Database triggers are documented
- [ ] Email flows are documented
- [ ] Troubleshooting section is practical and actionable

## Output
`docs/SYSTEM_FLOWS.md` — comprehensive flow documentation with:
- ASCII sequence diagrams
- Step-by-step execution trace
- Business rules per step
- Complete exception catalog
- Troubleshooting guide
