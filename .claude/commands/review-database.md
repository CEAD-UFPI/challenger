# review-database

## Objective
Comprehensive review of the Challenger database schema — verify migrations match the Prisma schema, indexes are optimal, constraints are correct, and data integrity is enforced.

## When to Use
- Before running migrations in production
- When debugging data integrity issues
- Before adding new models or relationships
- Performance optimization sprints

## Inputs
- `back/prisma/schema.prisma` — authoritative schema
- `back/prisma/migrations/` — all migration SQL files
- `back/prisma/setup.sql` — database triggers
- `back/prisma/seed.ts` — seed data
- `back/src/server.ts` — queries and data access patterns

## Steps

### Schema vs Migration Drift
1. Compare every field in `schema.prisma` with the latest migration SQL
2. Compare every foreign key in schema with migration
3. Compare every index/unique constraint
4. Flag any column, FK, or index present in schema but missing in migration
5. Flag any column, FK, or index present in migration but missing in schema

### Index Review
1. Identify all foreign key columns without explicit indexes
2. Check query patterns in `server.ts` for WHERE, JOIN, ORDER BY clauses
3. Verify indexes exist on frequently filtered columns (status, courseId, requesterId)
4. Check for over-indexing (indexes on columns never queried)

### Constraint Review
1. Verify all UNIQUE constraints are intentional (especially `telefone`, `celular`)
2. Check ON DELETE behavior for each FK (CASCADE vs RESTRICT vs SET NULL)
3. Verify required fields are NOT NULL in both schema and migration
4. Check for missing DEFAULT values on status/timestamp fields

### Data Integrity
1. Review enum values — are any unused? Are any missing?
2. Check for potential denormalization issues (e.g., courseId on both User and Solicitant)
3. Verify 1:1 relationships have UNIQUE on the FK side
4. Check decimal precision/scale for monetary values

### Trigger Review
1. Verify `setup.sql` trigger logic matches current schema
2. Check for stale trigger code (`trigger.txt`)
3. Ensure trigger is part of automated migration (not manual step)

### Performance
1. Identify N+1 query patterns in server.ts
2. Check for missing pagination on list queries
3. Review nested includes (potential for large joins)

## Validations
- [ ] Schema and migration are in sync (no drift)
- [ ] All FKs have appropriate indexes
- [ ] UNIQUE constraints are intentional and documented
- [ ] ON DELETE behavior is appropriate for each relationship
- [ ] No N+1 queries for list endpoints
- [ ] Database triggers are part of migration pipeline

## Output
Update `docs/ARCHITECTURE.md` database section or generate a focused DB review report with migration fixes.
