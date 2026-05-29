# Implementation Roadmap — Challenger (SDP)

> **Plano de ação baseado na auditoria completa do código-fonte.**
> **Data:** 2026-05-29

---

## Visão Geral

O roadmap está organizado em 4 fases, priorizadas por criticidade e impacto. Cada tarefa inclui estimativa de esforço (em horas de desenvolvimento), impacto e dependências.

---

## Fase 1: Correções Críticas (Sprint 1 — 2-3 dias)

> **Objetivo:** Fazer o sistema funcionar. Corrigir bugs que impedem funcionalidades core.

| # | Tarefa | Arquivo(s) | Esforço | Impacto |
|---|--------|-----------|---------|---------|
| 1.1 | **Corrigir `SolicitationService.create()`** — renomear `projetoId`→`projectId`, `tipoDiariaId`→`dailyRateTypeId`, remover `valorDiarias` | `back/src/server.ts:109-114` | 15 min | 🔴 Crítico — destrava criação de solicitações |
| 1.2 | **Corrigir `DELETE /api/solicitantes/:id`** — remover `prisma.user.delete()` indevido | `back/src/server.ts:413` | 5 min | 🔴 Crítico — previne perda de dados |
| 1.3 | **Sincronizar banco com schema** — gerar nova migration ou executar `prisma db push` para incluir `users.status`, `users.courseId`, `projetos.courseId` | `back/prisma/` | 15 min | 🔴 Crítico — resolve drift migration/schema |
| 1.4 | **Corrigir case dos imports** — `./pages/movimentacoes/` → `./pages/Movimentacoes/`, `./pages/cadastros/` → `./pages/Cadastros/` | `front/src/App.tsx:9-10` | 10 min | 🟡 Linux compatibility |
| 1.5 | **Corrigir dropdown de objetivos** — `{o.nome}` → `{o.objetivo}` | `front/src/pages/Movimentacoes/NewSolicitation.tsx:281` | 5 min | 🟡 UX — dropdown funcional |
| 1.6 | **Corrigir dropdown de destinos** — remover `{d.estado}` (campo inexistente) | `front/src/pages/Movimentacoes/NewSolicitation.tsx:203` | 5 min | 🟡 UX — dropdown funcional |
| 1.7 | **Corrigir `MyReports.tsx`** — substituir import quebrado de `../store/useStore` por integração com API real, ou remover rota | `front/src/pages/MyReports.tsx` | 30 min | 🟡 Evita crash |
| 1.8 | **Fixar import do CompleteProfile** — `./pages/Cadastros/CompleteProfile` (corrigir case) | `front/src/App.tsx:14` | 5 min | 🟡 Consistência |

**Sprint Goal:** Ao final da Fase 1, deve ser possível criar uma solicitação de viagem do início ao fim sem erros.

---

## Fase 2: Segurança e Infraestrutura (Sprint 2 — 3-5 dias)

> **Objetivo:** Proteger o sistema e preparar para deploy.

| # | Tarefa | Esforço | Impacto |
|---|--------|---------|---------|
| 2.1 | **Mover JWT_SECRET para `process.env`** — `const JWT_SECRET = process.env.JWT_SECRET \|\| "fallback-dev-only"` | 15 min | 🟠 Segurança |
| 2.2 | **Criar middleware de autenticação** — extrair `getUserFromRequest` para `back/src/middleware/auth.ts`, aplicar como middleware Express real | 1h | 🟠 Arquitetura + Segurança |
| 2.3 | **Adicionar autenticação em TODAS as rotas protegidas** — `POST /api/users`, `DELETE /api/users/:id`, `POST /api/solicitantes`, `DELETE /api/solicitantes/:id`, CRUDs automáticos | 2h | 🟠 Segurança |
| 2.4 | **Extrair role do JWT (não do body)** no `PATCH /api/solicitacoes/:id/status` | 30 min | 🟠 Segurança |
| 2.5 | **Criar `.env.example`** com todas as variáveis documentadas | 15 min | 🟣 Infra |
| 2.6 | **Dockerizar backend** — criar `back/Dockerfile` e adicionar serviço no `docker-compose.yml` | 1h | 🟣 Infra |
| 2.7 | **Dockerizar frontend** — criar `front/Dockerfile` (multi-stage: build + nginx) | 1h | 🟣 Infra |
| 2.8 | **Adicionar PostgreSQL healthcheck e depends_on** no docker-compose | 30 min | 🟣 Infra |
| 2.9 | **Extrair API base URL para variável de ambiente** — `VITE_API_URL` no Vite | 20 min | 🟣 Infra |
| 2.10 | **Corrigir link de e-mail** — usar variável de ambiente para URL base (`FRONTEND_URL`) | 15 min | 🟣 Infra |

**Sprint Goal:** Sistema seguro, containerizado e pronto para deploy em qualquer ambiente.

---

## Fase 3: Funcionalidades Faltantes (Sprints 3-5 — 2-3 semanas)

> **Objetivo:** Completar o ciclo de negócio (relatórios, correção, notificações).

### Sprint 3 — Relatórios e Prestação de Contas

| # | Tarefa | Esforço |
|---|--------|---------|
| 3.1 | Criar endpoints `PUT /api/relatorios/:id` (atualizar status, atividades, comprovante) | 2h |
| 3.2 | Criar endpoint `POST /api/relatorios/:id/upload` (upload de comprovante) | 3h |
| 3.3 | Criar endpoint `POST /api/relatorios/:id/historico` (registrar ação no histórico) | 1h |
| 3.4 | Criar tela de "Meus Relatórios" para o Agente (substituir MyReports quebrado) | 4h |
| 3.5 | Criar tela de "Revisão de Relatórios" para FADEX (aprovar/devolver com motivo) | 4h |
| 3.6 | Conectar Dashboard à API real (substituir dados mockados) | 2h |

### Sprint 4 — Correção e Edição

| # | Tarefa | Esforço |
|---|--------|---------|
| 4.1 | Criar endpoint `PUT /api/solicitacoes/:id` para editar solicitação em PENDENTE_CORRECAO | 2h |
| 4.2 | Criar tela de edição de solicitação rejeitada | 3h |
| 4.3 | Adicionar PUT nos CRUDs automáticos (editar bancos, cursos, destinos, objetivos, diárias) | 1h |
| 4.4 | Adicionar DELETE em projetos (com validação de vínculos) | 1h |

### Sprint 5 — Notificações e UX

| # | Tarefa | Esforço |
|---|--------|---------|
| 5.1 | Implementar e-mail de notificação de mudança de status (aprovação/rejeição) | 3h |
| 5.2 | Implementar e-mail de lembrete de prazo de relatório (1 dia antes do vencimento) | 2h |
| 5.3 | Implementar reset de senha (forgot + reset com token por e-mail) | 3h |
| 5.4 | Adicionar filtro por status e busca por texto nas listagens | 3h |
| 5.5 | Adicionar paginação em todas as listagens | 3h |
| 5.6 | Melhorar estados de erro no frontend (tratar 401 com redirect ao login) | 1h |

---

## Fase 4: Robustez e Qualidade (Sprints 6+ — Em Andamento)

> **Objetivo:** Preparar o sistema para produção com qualidade e observabilidade.

### Backend Architecture

| # | Tarefa | Esforço |
|---|--------|---------|
| 6.1 | Refatorar `server.ts`: extrair rotas para `routes/`, controllers para `controllers/`, services para `services/` | 8h |
| 6.2 | Adicionar validação de entrada com Zod no backend (não só no frontend) | 4h |
| 6.3 | Implementar tratamento de erros centralizado (error handler middleware) | 2h |
| 6.4 | Adicionar logs estruturados (pino ou winston) | 2h |
| 6.5 | Implementar graceful shutdown (SIGTERM/SIGINT) | 1h |

### Testes

| # | Tarefa | Esforço |
|---|--------|---------|
| 6.6 | Setup Vitest + Supertest para testes de API | 2h |
| 6.7 | Testes unitários: `SolicitationService` (checkBlocklist, create, updateStatus) | 3h |
| 6.8 | Testes de integração: fluxo completo de solicitação → aprovação → pagamento | 4h |
| 6.9 | Testes de frontend: componentes críticos (Login, NewSolicitation, Solicitations) | 4h |
| 6.10 | Alcançar >70% de cobertura de código | Contínuo |

### DevOps

| # | Tarefa | Esforço |
|---|--------|---------|
| 6.11 | Configurar CI/CD (GitHub Actions): lint, type-check, test, build | 3h |
| 6.12 | Configurar deploy automatizado (VPS ou cloud) | 3h |
| 6.13 | Configurar HTTPS (nginx + Let's Encrypt ou Caddy) | 2h |
| 6.14 | Configurar rate limiting no Express (`express-rate-limit`) | 1h |
| 6.15 | Setup de monitoramento (health check endpoint + uptime monitor) | 2h |

### Features Avançadas

| # | Tarefa | Esforço |
|---|--------|---------|
| 6.16 | Implementar refresh token (aumentar segurança sem perder UX) | 3h |
| 6.17 | Calcular valor total da diária (qtd × valor do tipo) automaticamente | 2h |
| 6.18 | Dashboard com gráficos e estatísticas reais | 4h |
| 6.19 | Exportar solicitações e relatórios (CSV/PDF) | 4h |
| 6.20 | Audit trail completo (log de todas as ações em todas as entidades) | 4h |

---

## Resumo de Esforço

| Fase | Tarefas | Esforço Estimado | Impacto |
|------|---------|-----------------|---------|
| Fase 1: Correções Críticas | 8 | ~1.5 horas | Crítico — sistema funcional |
| Fase 2: Segurança/Infra | 10 | ~8 horas | Alto — pronto para deploy |
| Fase 3: Funcionalidades | 13 | ~35 horas | Alto — produto completo |
| Fase 4: Robustez | 20 | ~60 horas | Médio — qualidade produção |
| **Total** | **51** | **~105 horas** | — |

---

## Recomendações Imediatas (Próximos Passos)

1. ⚡ **HOJE:** Executar as 8 tarefas da Fase 1 (~1.5h) para destravar o sistema
2. 📅 **ESTA SEMANA:** Executar Fase 2 para ter segurança e containerização
3. 📅 **ESTE MÊS:** Fase 3 para completar o MVP com relatórios e notificações
4. 🔄 **CONTÍNUO:** Fase 4 como melhoria contínua rumo à produção
