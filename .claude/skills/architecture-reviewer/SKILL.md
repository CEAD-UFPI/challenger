# Architecture Reviewer Skill

## Scope
Deep-dive architecture analysis for the Challenger (SDP) project — evaluate tech stack, module structure, patterns, dependencies, and deployment readiness.

## Methodology

### 1. Technology Stack Assessment
- Backend: framework, ORM, database, auth, validation, email
- Frontend: framework, bundler, state management, routing, styling, forms
- DevOps: containers, CI/CD, monitoring, logging
- Evaluate each choice: current version, community support, suitability

### 2. Code Organization
- **Monolith assessment:** Is `server.ts` too large? When should it be split?
- **Separation of concerns:** Are routes, controllers, services, middleware in separate files?
- **Reusability:** Are there generic/reusable components (e.g., GenericCadastro)?
- **DRY violations:** Is code duplicated across routes?
- **Naming conventions:** Are files, variables, and functions consistently named?

### 3. Data Architecture
- **Schema design:** Normalization, relationships, constraints
- **Migration strategy:** Are migrations automated and reproducible?
- **Query patterns:** N+1 risks, missing indexes, inefficient joins
- **Data isolation:** Multi-tenancy via courseId — is it consistently applied?

### 4. API Design
- **REST conventions:** Are endpoints RESTful?
- **Versioning:** Is there an API versioning strategy?
- **Error handling:** Consistent error response format?
- **Pagination:** Is it implemented for list endpoints?
- **Filtering/Sorting:** Are they supported?

### 5. Frontend Architecture
- **Component tree:** Is it logical and maintainable?
- **State management:** Is Zustand used appropriately? Any prop drilling?
- **Routing:** Are routes well-organized with proper guards?
- **API client:** Is the Axios configuration centralized and correct?

### 6. Security Architecture
- Authentication flow (JWT lifecycle)
- Authorization (RBAC implementation)
- Data isolation (course-level multi-tenancy)
- Input validation (frontend + backend)
- Secret management (environment variables)

### 7. Deployment Architecture
- Containerization coverage
- Environment configuration
- Database backup strategy
- Monitoring and alerting
- CI/CD pipeline

## Checklist
- [ ] Tech stack documented with versions
- [ ] Directory structure mapped
- [ ] API endpoints fully documented
- [ ] Data model diagram generated
- [ ] Security gaps identified
- [ ] Deployment gaps identified
- [ ] Improvement recommendations provided

## Output
`docs/ARCHITECTURE.md` or focused architecture review with:
- Architecture diagram (ASCII)
- Tech stack table
- Directory structure with annotations
- Module dependency map
- API route catalog
- Data model (ERD in text)
- Security architecture assessment
- Deployment architecture assessment
- Architectural debt and recommendations
