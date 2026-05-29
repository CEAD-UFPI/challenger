# analyze-architecture

## Objective
Perform a deep analysis of the Challenger (SDP) architecture — tech stack, folder structure, module dependencies, integrations, and deploy configuration.

## When to Use
- Onboarding a new developer
- Before proposing architectural changes
- Auditing for security or performance issues
- After major refactors

## Inputs
- Full repository (code, configs, Docker files, migrations)
- Reference: `docs/ARCHITECTURE.md` for prior baseline

## Steps
1. Read `back/package.json` and `front/package.json` for dependency inventory
2. Read `back/prisma/schema.prisma` for data model
3. Read `back/src/server.ts` for backend structure (monolith assessment)
4. Read `front/src/App.tsx` for route/component tree
5. Read `docker-compose.yml` and any Dockerfiles for infra
6. Map all API endpoints (search `app.get|app.post|app.patch|app.delete|app.put`)
7. Map all frontend routes (search `<Route`)
8. Identify architectural patterns and anti-patterns
9. Cross-reference with `docs/ARCHITECTURE.md`

## Validations
- [ ] All dependencies are documented
- [ ] API endpoints match frontend consumption
- [ ] Database schema matches migration files
- [ ] Docker configuration is complete (app + db, not just db)
- [ ] No hardcoded secrets or URLs in source code

## Output
Update `docs/ARCHITECTURE.md` with findings, or generate a focused architecture review.
