# Feature Gap Analyst Skill

## Scope
Perform a comprehensive gap analysis of the Challenger (SDP) project — identify bugs, incomplete features, missing functionality, security issues, and architectural problems.

## Methodology

### 1. Bug Detection
Scan for common bug patterns:
- **Field name mismatches:** Cross-reference Prisma schema fields with server.ts usage
- **Import errors:** Check for imports of non-existent files or case mismatches
- **Undefined references:** Frontend accessing fields that don't exist in API response models
- **Wrong table operations:** Delete/update on wrong Prisma model
- **Missing await:** Async calls without await
- **Hardcoded values where dynamic expected**

### 2. Completeness Check
For each Prisma model, verify:
- [ ] Has GET (list) endpoint
- [ ] Has POST (create) endpoint
- [ ] Has PUT/PATCH (update) endpoint
- [ ] Has DELETE endpoint
- [ ] Has frontend UI page(s)
- [ ] Auth is enforced on all endpoints

For each frontend route, verify:
- [ ] Backend endpoint exists and is functional
- [ ] All referenced fields exist in API response
- [ ] Loading, error, and empty states are handled

### 3. Security Audit
- [ ] JWT secret is in environment variable (not hardcoded)
- [ ] Every protected route has server-side auth check
- [ ] Role validation uses JWT payload (not request body)
- [ ] Course-level isolation is consistently enforced
- [ ] Input validation exists on backend (not just frontend)
- [ ] CORS is properly configured (not wide open `*`)
- [ ] Rate limiting is configured

### 4. Infrastructure Audit
- [ ] All services are containerized (app, not just DB)
- [ ] Database migrations are automated (not manual SQL)
- [ ] Database triggers are part of migration pipeline
- [ ] CI/CD pipeline exists
- [ ] Environment variables are documented (.env.example)
- [ ] Health check endpoint exists
- [ ] Logging is structured (not just console.log)

### 5. UX Completeness
- [ ] Dashboard shows real data (not mock)
- [ ] All statuses have visual representation (icons/colors)
- [ ] Error messages are user-friendly and in Portuguese
- [ ] Form validation provides inline feedback
- [ ] Empty states have helpful messages

## Severity Classification
- 🔴 **Critical:** Breaks core functionality, causes data loss, or exposes security vulnerability
- 🟠 **High:** Security risk, missing auth, hardcoded secrets
- 🟡 **Medium:** Bug with workaround, missing feature in active flow
- 🔵 **Gap:** Feature not implemented but needed for complete workflow
- ⚪ **Inconsistency:** Works but inconsistent design/implementation

## Checklist
- [ ] Every finding has file path + line number
- [ ] Every finding has severity classification
- [ ] Every finding has a suggested fix
- [ ] Quick wins section identifies low-effort/high-impact fixes
- [ ] Gap analysis covers: functionality, security, infrastructure, UX, data

## Output
`docs/FEATURE_GAP_ANALYSIS.md` with:
- Executive summary
- Critical bugs with reproduction steps
- Security gaps with exploitation scenarios
- Incomplete features with impact assessment
- Infrastructure gaps
- Quick wins (prioritized by effort/impact)
- Severity matrix
