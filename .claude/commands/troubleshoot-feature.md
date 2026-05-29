# troubleshoot-feature

## Objective
Systematic troubleshooting of any feature or bug in the Challenger system — trace the full data path from UI to database and back, identify breakage points, and suggest fixes.

## When to Use
- User reports a feature not working
- Staging/production incident response
- After deployment when something breaks
- Code review of a complex change

## Inputs
- **Feature name or bug description** (e.g., "não consigo criar solicitação", "aprovação não funciona")
- **Steps to reproduce** (user role, data entered, expected vs actual behavior)
- **Environment** (local dev, staging, production)
- Optional: Browser console logs, network tab screenshots, server logs

## Steps

### 1. Frontend Trace
1. Identify the page/component involved (check `front/src/App.tsx` for route)
2. Read the component code — verify form fields, validation schema (Zod)
3. Check API call: endpoint URL, method, payload shape, headers
4. Check state management: what store is involved, is data flowing correctly?
5. Check role-based visibility: is the UI element hidden by `hasPermission()`?
6. Check for import errors or case mismatches (Linux compatibility)

### 2. Backend Trace
1. Find the route handler in `back/src/server.ts`
2. Check if the route requires auth — is `getUserFromRequest()` called?
3. Check if role/course filtering is applied correctly
4. Trace the business logic service (e.g., `SolicitationService`)
5. Check Prisma query: are field names correct? Are relations included?
6. Check error handling: what errors are caught, what's returned?

### 3. Database Trace
1. Run the equivalent Prisma query directly (via `prisma studio` or `psql`)
2. Check if the data exists in expected state
3. Check if constraints (unique, FK) are being violated
4. Check if database triggers are installed (`\df` in psql)
5. Verify migration state matches schema (`prisma migrate status`)

### 4. Integration Check
1. Verify frontend baseURL matches backend port
2. Verify CORS allows the request
3. Check JWT token: is it present, valid, not expired?
4. Check environment variables are set correctly

### 5. Common Issues Reference
| Symptom | Likely Cause | Check |
|---------|-------------|-------|
| "Campo não existe" / Prisma validation error | Field name mismatch (BUG-001) | `server.ts:109-114` |
| Usuário deletado indevidamente | BUG-002 | `server.ts:413` |
| Coluna não encontrada no banco | Migration drift (BUG-003) | `prisma migrate status` |
| Import quebra em Linux | Case mismatch (BUG-007) | `App.tsx` imports |
| Dropdown vazio | Campo errado (BUG-008) | `NewSolicitation.tsx:281` |
| "Sua conta está pendente" | Status != ATIVO | `users.status` column |

## Validations
- [ ] Traced full path: UI → API → Service → Database → Response → UI
- [ ] Identified exact line of code causing the issue
- [ ] Verified database state
- [ ] Tested fix locally (if applicable)
- [ ] Documented root cause and fix

## Output
A troubleshooting report with:
- Root cause (file + line number)
- Impact assessment
- Recommended fix with code diff
- Prevention suggestion (test, validation, refactor)
