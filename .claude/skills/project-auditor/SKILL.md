# Project Auditor Skill

## Scope
Comprehensive codebase audit for the Challenger (SDP) project — inventory every module, file, route, model, service, and integration point.

## Methodology

### Phase 1: Inventory
1. Map complete directory tree (exclude: node_modules, .git, dist, build)
2. List all key configuration files (package.json, tsconfig, docker-compose, vite.config, tailwind.config, prisma schema)
3. Identify tech stack from dependency manifests
4. Count LOC per module and overall

### Phase 2: Route Audit
1. Extract every API endpoint from backend (search for `app.get|app.post|app.put|app.patch|app.delete`)
2. For each route, document: method, path, auth requirement, handler logic summary
3. Extract every frontend route from React Router (`<Route path=...`)
4. Map frontend routes to backend endpoints

### Phase 3: Data Model Audit
1. Read Prisma schema — document all models, enums, relations
2. Read all migration files — compare with schema for drift
3. Read seed file — document test data
4. Read SQL scripts (triggers, functions)

### Phase 4: Business Logic Audit
1. Read all service classes/methods
2. Document state machines (status transitions)
3. Document validation rules (Zod schemas, inline checks)
4. Document authorization patterns (RBAC)

### Phase 5: Integration Audit
1. Check Docker configuration
2. Check CI/CD pipelines
3. Check email/SMS/third-party integrations
4. Check environment variables

## Checklist
- [ ] All directories and files inventoried
- [ ] All routes documented with auth status
- [ ] All models and relations mapped
- [ ] All enums and their values documented
- [ ] All business rules traced to code
- [ ] All integrations documented
- [ ] Tech stack fully identified
- [ ] Security gaps flagged
- [ ] Missing infrastructure components flagged

## Output Format
Structured markdown report with sections matching the phases above, including:
- Directory tree
- Route table (method, path, auth, description)
- Model-relationship diagram (text)
- Business rules with code references
- Integration inventory
- Gap/risk summary
