# Feature Gap Analysis — Challenger (SDP)

> **Análise gerada por auditoria automatizada do código-fonte.**
> **Data:** 2026-05-29
> **Branch:** `master`, commit `1ba572d`

---

## Resumo Executivo

O Challenger possui uma arquitetura sólida e bem intencionada, com fluxos de negócio claramente definidos. No entanto, o código contém **bugs críticos que impedem funcionalidades essenciais** (como a criação de solicitações), inconsistências entre schema e migration, falta de segurança em múltiplas rotas, e funcionalidades incompletas. Abaixo, a análise detalhada.

---

## 1. Bugs Críticos (Impeditivos)

### BUG-001: ✅ CORRIGIDO — `SolicitationService.create()` usa nomes de campos incorretos
- **Arquivo:** `back/src/server.ts:98-119` → corrigido em `back/src/server.ts:108-113`
- **Severidade:** ~~🔴 CRÍTICA~~ ✅ Resolvido
- **Correção aplicada:** `projetoId`→`projectId`, `tipoDiariaId`→`dailyRateTypeId`, `valorDiarias` removido
- **Data da correção:** 2026-05-29

### BUG-002: ✅ CORRIGIDO — `DELETE /api/solicitantes/:id` deleta registro errado
- **Arquivo:** `back/src/server.ts:411-419` → corrigido em `back/src/server.ts:410-417`
- **Severidade:** ~~🔴 CRÍTICA~~ ✅ Resolvido
- **Correção aplicada:** Removido `prisma.user.delete()` indevido; apenas `prisma.solicitant.delete()` permanece
- **Data da correção:** 2026-05-29

### BUG-003: ✅ CORRIGIDO — Migration SQL desatualizada em relação ao schema.prisma
- **Arquivo:** Nova migration em `back/prisma/migrations/20260107000000_add_missing_columns_and_fks/migration.sql`
- **Severidade:** ~~🔴 CRÍTICA~~ ✅ Resolvido
- **Correção aplicada:** Nova migration adiciona `users.status`, `users.courseId`, `projetos.courseId` e as FKs ausentes com guards idempotentes (IF NOT EXISTS)
- **Data da correção:** 2026-05-29
- **Descrição:** O schema.prisma define campos que **não existem** na migration SQL:
  - `users.status` (TEXT, default 'PENDENTE')
  - `users.courseId` (INT, FK → cursos.id)
  - `projetos.courseId` (INT, FK → cursos.id)
---

## 2. Bugs de Segurança (Altos)

### BUG-004: JWT_SECRET hardcoded
- **Arquivo:** `back/src/server.ts:13`
- **Severidade:** 🟠 ALTA
- **Descrição:** `const JWT_SECRET = "segredo-super-secreto-mude-em-producao";`
- **Correção:** Usar `process.env.JWT_SECRET` com fallback seguro.

### BUG-005: Múltiplas rotas sem autenticação
- **Arquivo:** `back/src/server.ts`
- **Severidade:** 🟠 ALTA
- **Descrição:** As seguintes rotas não verificam JWT:
  - `POST /api/users` (cria usuário + envia e-mail)
  - `DELETE /api/users/:id`
  - `POST /api/solicitantes`, `DELETE /api/solicitantes/:id`
  - `POST /api/solicitacoes` (confia no `requesterId` do body)
  - `PATCH /api/solicitacoes/:id/status` (confia no `role` do body)
  - Todos os CRUDs automáticos (`/api/bancos`, `/api/cursos`, etc.)
- **Correção:** Adicionar `getUserFromRequest()` em todas as rotas e validar permissões.

### BUG-006: Role para aprovação vem do body, não do JWT
- **Arquivo:** `back/src/server.ts:512-513`
- **Severidade:** 🟠 ALTA
- **Descrição:** `PATCH /api/solicitacoes/:id/status` usa `req.body.role` para determinar permissões. Um atacante poderia enviar `role: "DIRECAO"` no body mesmo sendo um AGENTE.
- **Correção:** Extrair role do payload JWT (`getUserFromRequest`).

---

## 3. Bugs de Frontend (Médios)

### BUG-007: Case sensitivity nos imports (quebra em Linux)
- **Arquivo:** `front/src/App.tsx:9-10`
- **Severidade:** 🟡 MÉDIA
- **Descrição:** Os imports usam caminhos com case diferente dos diretórios reais:
  ```typescript
  import NewSolicitation from "./pages/movimentacoes/NewSolicitation"; // lowercase 'm'
  import Agents from "./pages/cadastros/Agents";                        // lowercase 'c'
  ```
  Os diretórios reais são `Movimentacoes/` e `Cadastros/` (maiúsculas). Funciona em macOS/Windows (case-insensitive), mas **quebra em Linux**.
- **Correção:** Padronizar para lowercase ou corrigir os imports.

### BUG-008: `NewSolicitation.tsx` renderiza campo inexistente
- **Arquivo:** `front/src/pages/Movimentacoes/NewSolicitation.tsx:202-204,279-281`
- **Severidade:** 🟡 MÉDIA
- **Descrição:**
  - Linha 203: `{d.nome} - {d.estado}` — Model `Destination` não tem campo `estado`
  - Linha 281: `{o.nome}` — Model `SolicitationObjective` usa campo `objetivo`, não `nome`
- **Impacto:** Dropdowns mostram "undefined" ou valores vazios.
- **Correção:** Usar `d.nome` apenas (remover estado), e `{o.objetivo}` para objetivos.

### BUG-009: `MyReports.tsx` importa store inexistente
- **Arquivo:** `front/src/pages/MyReports.tsx:3`
- **Severidade:** 🟡 MÉDIA
- **Descrição:** `import { useStore } from '../store/useStore';` — O arquivo `useStore.ts` não existe. O componente quebraria ao ser renderizado.
- **Correção:** Criar uma store de relatórios ou integrar com a API.

### BUG-010: Dashboard com dados mockados
- **Arquivo:** `front/src/pages/Dashboard.tsx:46-47`
- **Severidade:** 🟡 MÉDIA
- **Descrição:** `const recentSolicitations: any[] = [];` — Todos os cards mostram zero, independente dos dados reais.
- **Correção:** Conectar à API `/api/solicitacoes` e `/api/relatorios`.

---

## 4. Funcionalidades Incompletas

### GAP-001: Tela de Relatórios é placeholder
- **Local:** `front/src/App.tsx:53-56`
- **Descrição:** A rota `/app/relatorios` renderiza um componente `ComingSoon` ("Em Construção"). Não há interface para agentes enviarem comprovantes ou FADEX revisar.
- **Impacto:** Todo o ciclo de prestação de contas (trigger → relatório → comprovante → aprovação) está sem interface.

### GAP-002: Sem edição (PUT/PATCH) nos CRUDs auxiliares
- **Local:** `back/src/server.ts:35-69`
- **Descrição:** A função `createCrudRoutes()` gera apenas GET, POST, DELETE. Não é possível editar bancos, cursos, destinos, objetivos ou tipos de diária após criados.
- **Impacto:** Erro de digitação em um cadastro = precisa deletar e recriar.

### GAP-003: Correção de solicitação devolvida sem UI
- **Local:** Fluxo de status `PENDENTE_CORRECAO`
- **Descrição:** Quando a Direção ou Financeiro rejeita, o status vai para `PENDENTE_CORRECAO`. Mas não existe endpoint ou interface para o Solicitante corrigir e reenviar.
- **Impacto:** Solicitações rejeitadas ficam presas em `PENDENTE_CORRECAO` permanentemente.

### GAP-004: API de relatórios só tem GET
- **Local:** `back/src/server.ts:525-560`
- **Descrição:** A rota de relatórios só tem listagem (GET). Não há endpoints para:
  - Atualizar status do relatório (PUT/PATCH)
  - Upload de comprovante
  - Adicionar atividades realizadas
  - Registrar histórico de ações
- **Impacto:** O modelo `TravelReport` e `ReportHistory` existem mas não são usados por nenhuma rota.

### GAP-005: Sem reset de senha
- **Descrição:** A tela de login tem link "Recuperar Senha?" (`href="#"`) que não faz nada. Não há endpoint de forgot/reset password.
- **Impacto:** Usuários que esquecem a senha ficam bloqueados.

### GAP-006: Sem notificações
- **Descrição:** O sistema não notifica usuários sobre mudanças de status, prazos de relatório, ou aprovações pendentes.
- **Impacto:** Usuários precisam acessar o sistema para verificar atualizações.

### GAP-007: Sem validação de entrada no backend
- **Descrição:** Nenhuma rota do backend valida o corpo da requisição (exceto pelo Prisma nas operações de escrita). O Zod está instalado mas só é usado no frontend.
- **Impacto:** Dados inválidos podem chegar ao banco, causando erros 500 genéricos.

---

## 5. Inconsistências de Design

### INC-001: Dois caminhos para courseId no User
- **Descrição:** `User` tem `courseId` próprio E pode ter um `Solicitant` (que também tem `courseId`). O login resolve com `user.courseId || user.solicitantProfile?.courseId`. Isso permite inconsistência: os dois IDs podem diferir.
- **Sugestão:** Unificar — ou o User tem courseId, ou o vínculo é exclusivo pelo Solicitant.

### INC-002: Nomes de campos inconsistentes entre tabelas auxiliares
- **Descrição:**
  - `SolicitationObjective` usa campo `objetivo`
  - `DailyRateType`, `Bank`, `Course`, `Destination` usam `nome`
  - Mesmo conceito (nome descritivo), nomes diferentes
- **Sugestão:** Padronizar para `nome` em todas as tabelas auxiliares.

### INC-003: Origem/Destino duplicados
- **Descrição:** `Solicitation` tem `origem` e `destino` como strings. `SolicitationDetail` também tem `originId`/`destinyId` como FKs para `Destination`. Duas representações para o mesmo conceito.
- **Sugestão:** Consolidar em um único lugar ou documentar claramente a diferença.

### INC-004: Telefone e celular com UNIQUE constraint
- **Descrição:** Ambos os campos têm constraints UNIQUE, impedindo que dois usuários compartilhem o mesmo número (ex: ramal do departamento).
- **Sugestão:** Remover UNIQUE ou adicionar lógica de soft-merge.

---

## 6. Problemas de Infraestrutura e DevOps

### INFRA-001: Sem containerização da aplicação
- **Descrição:** `docker-compose.yml` contém apenas PostgreSQL. Backend e frontend não têm Dockerfiles.
- **Impacto:** Deploy manual, sem isolamento, difícil de reproduzir ambiente.

### INFRA-002: Sem CI/CD
- **Descrição:** Nenhum pipeline de integração ou deploy contínuo.
- **Impacto:** Sem testes automatizados, sem garantia de qualidade a cada commit.

### INFRA-003: Sem arquivos .env
- **Descrição:** Não há `.env.example` ou documentação de variáveis de ambiente.
- **Impacto:** Novos desenvolvedores não sabem quais variáveis configurar.

### INFRA-004: Trigger SQL aplicada manualmente
- **Descrição:** `setup.sql` (trigger do relatório automático) não faz parte das migrations do Prisma.
- **Impacto:** Setup não é reproduzível via `prisma migrate` — requer passo manual adicional.

---

## 7. Quick Wins (Vitórias Rápidas)

Ordem sugerida para correções de baixo esforço e alto impacto:

| # | Ação | Esforço | Impacto |
|---|------|---------|---------|
| 1 | ✅ Corrigir `SolicitationService.create()` (BUG-001) | ~~5 min~~ | ✅ Feito |
| 2 | ✅ Remover `prisma.user.delete()` indevido (BUG-002) | ~~2 min~~ | ✅ Feito |
| 3 | ✅ Nova migration para sincronizar schema (BUG-003) | ~~2 min~~ | ✅ Feito — migration criada |
| 4 | Mover JWT_SECRET para `process.env` (BUG-004) | 5 min | Alto — segurança |
| 5 | Corrigir case dos imports (BUG-007) | 5 min | Médio — Linux compat |
| 6 | Corrigir `{o.objetivo}` e remover `{d.estado}` (BUG-008) | 5 min | Médio — UX |
| 7 | Adicionar `getUserFromRequest` nas rotas desprotegidas | 30 min | Alto — segurança |
| 8 | Criar `.env.example` | 5 min | Infra |
| 9 | Adicionar PUT nos CRUDs automáticos | 30 min | Funcionalidade |
| 10 | Criar endpoint PATCH para relatórios | 1h | Funcionalidade |

---

## 8. Matriz de Severidade

| Severidade | Quantidade | Itens |
|-----------|-----------|-------|
| 🔴 Crítica | 3 | BUG-001, BUG-002, BUG-003 |
| 🟠 Alta | 3 | BUG-004, BUG-005, BUG-006 |
| 🟡 Média | 4 | BUG-007, BUG-008, BUG-009, BUG-010 |
| 🔵 Gap | 7 | GAP-001 a GAP-007 |
| ⚪ Inconsistência | 4 | INC-001 a INC-004 |
| 🟣 Infra | 4 | INFRA-001 a INFRA-004 |
