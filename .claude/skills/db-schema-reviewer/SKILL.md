# DB Schema Reviewer Skill

## Scope
Comprehensive database schema review for the Challenger (SDP) project — verify integrity, consistency, performance, and alignment between Prisma schema and migrations.

## Methodology

### 1. Schema Extraction
1. Read `back/prisma/schema.prisma` — the authoritative data model
2. Read all files in `back/prisma/migrations/` — the migration history
3. Read `back/prisma/setup.sql` — database triggers and functions
4. Read `back/prisma/seed.ts` — test/initial data

### 2. Migration Drift Detection
For each model in schema.prisma:
- Compare every field with the latest migration SQL
- Compare every relationship/foreign key
- Compare every index and unique constraint
- Compare every default value
- Flag anything in schema but not in migration (and vice versa)

### 3. Index Analysis
- List all explicit indexes from schema and migrations
- List all foreign keys (implicit indexes in PostgreSQL)
- Check query patterns in server.ts for common WHERE/JOIN/ORDER BY
- Identify missing indexes on frequently filtered columns
- Identify potentially redundant indexes

### 4. Constraint Review
- **UNIQUE constraints:** Are all intentional? Any surprising ones (telefone, celular)?
- **NOT NULL:** Are required fields properly constrained?
- **DEFAULT values:** Are sensible defaults set for status and timestamp fields?
- **ON DELETE behavior:** CASCADE vs RESTRICT vs SET NULL — is each appropriate?
- **Decimal precision:** Are monetary fields using appropriate precision/scale?

### 5. Enum Review
- List all enums and their values
- Check if any enum values are unused in code
- Check if any needed values are missing
- Verify consistency between enum values and code references

### 6. Relationship Review
- Verify 1:1 relationships have UNIQUE on the FK side
- Verify 1:N relationships have proper FK setup
- Check for potential circular dependencies
- Check for orphaned relationships (FK nullable when it shouldn't be)

### 7. Naming Convention Review
- Table names: consistent casing, language, pluralization
- Column names: consistent across tables for same concept (e.g., `nome` vs `objetivo`)
- FK column naming: consistent pattern (e.g., `entityId`)
- Enum naming: consistent casing

### 8. Trigger and Function Review
- Verify trigger logic matches current schema (not outdated)
- Check for stale trigger code files (trigger.txt)
- Verify triggers are part of migration pipeline (not manual)

### 9. Performance Review
- Identify missing indexes on FK columns used in JOINs
- Check for potential N+1 query patterns in application code
- Review nested include chains for performance impact
- Check if pagination is needed on large tables

## Checklist
- [ ] Schema and migrations are in sync (no drift)
- [ ] All FKs have appropriate indexes
- [ ] All UNIQUE constraints are intentional
- [ ] All ON DELETE behaviors are appropriate
- [ ] All enums are used and complete
- [ ] Naming is consistent across tables
- [ ] Monetary fields have correct precision/scale
- [ ] 1:1 relationships have UNIQUE on FK
- [ ] Database triggers match current schema
- [ ] No N+1 query patterns in application code

## Output
Database review report with:
- Schema vs migration drift table
- Missing index recommendations
- Constraint review findings
- Enum audit
- Relationship integrity check
- Naming inconsistency report
- Performance recommendations
- Fix SQL/migration scripts (if applicable)
