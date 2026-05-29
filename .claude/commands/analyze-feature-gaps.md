# analyze-feature-gaps

## Objective
Conduct a thorough gap analysis of the Challenger system — identify what exists, what's broken, what's incomplete, and what's missing entirely.

## When to Use
- Sprint planning / backlog grooming
- Before a major release
- After discovering unexpected behavior
- When estimating remaining work

## Inputs
- Full source code (`back/src/`, `front/src/`)
- Database schema and migrations
- Existing `docs/PRD.md`, `docs/BRD.md`, `docs/ARCHITECTURE.md`
- Prior `docs/FEATURE_GAP_ANALYSIS.md` (if exists)

## Steps
1. **Inventory complete features:**
   - Trace every API endpoint to working frontend functionality
   - Verify both happy path and error handling work

2. **Find broken features:**
   - Check for field name mismatches between frontend and backend (e.g., `projetoId` vs `projectId`)
   - Check for import errors (non-existent files, case mismatches)
   - Check for hardcoded/mock data that should be dynamic
   - Run type checking (`tsc --noEmit`) on both projects

3. **Find incomplete features:**
   - Identify Prisma models with no API endpoints
   - Identify frontend routes pointing to placeholders ("ComingSoon", "Em Construção")
   - Identify database triggers or functions not wired to UI
   - Check for CRUD but no Update operations

4. **Find missing features:**
   - Audit auth: missing password reset, missing session refresh
   - Audit notifications: missing email triggers for status changes
   - Audit data: missing exports, filters, pagination
   - Audit operations: missing logs, monitoring, backup scripts

5. **Security gaps:**
   - Check every route for authentication
   - Check for hardcoded secrets
   - Check for input validation (frontend only vs backend too)
   - Check CORS and rate limiting

6. **Infrastructure gaps:**
   - Check Docker coverage (all services containerized?)
   - Check CI/CD presence
   - Check environment variable documentation

## Validations
- [ ] Every finding includes file path and line number
- [ ] Every finding has a severity rating (Critical/High/Medium/Low)
- [ ] Every finding has a suggested fix
- [ ] Gap analysis covers: functionality, security, infrastructure, UX, data

## Output
Update `docs/FEATURE_GAP_ANALYSIS.md` with prioritized findings and Quick Wins section.
