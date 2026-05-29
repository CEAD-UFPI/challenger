# CLAUDE.md — Challenger (SDP)

> **Sistema de Diárias e Passagens** — Plataforma de gestão de diárias e passagens para a CEAD/UFPI.
> Stack: Express 5 + Prisma + PostgreSQL | React 18 + Vite + Tailwind + Zustand

---

## 1. Visão Geral do Projeto

Plataforma governamental para solicitação, aprovação e prestação de contas de viagens institucionais. O fluxo principal: **Solicitante** cria pedido de viagem → **Direção** aprova → **Financeiro** aprova → **FADEX** paga → Sistema gera relatório automático → **Agente** presta contas em 5 dias.

## 2. Stack Tecnológica

| Camada | Tecnologias |
|--------|------------|
| Backend | Node.js + Express 5 + TypeScript (ES2020/CommonJS) |
| ORM | Prisma 5.19 + PostgreSQL 15 |
| Auth | JWT (`jsonwebtoken` + `bcryptjs`) |
| Frontend | React 18 + Vite 5 + Tailwind 3 + Zustand 4 |
| Forms | React Hook Form + Zod |
| Email | Nodemailer (Mailtrap em dev) |
| DevOps | Docker Compose (apenas PostgreSQL) |

## 3. Estrutura de Diretórios

```
challenger/
├── docker-compose.yml          # PostgreSQL 15 (porta 5432, db: cead_db)
├── back/
│   ├── prisma/
│   │   ├── schema.prisma       # 12 enums, 10 models
│   │   ├── seed.ts             # 3 usuários de exemplo
│   │   ├── setup.sql           # Trigger PostgreSQL (relatório automático)
│   │   └── migrations/         # 1 migration inicial
│   └── src/
│       ├── server.ts           # 577 LOC — TODA a lógica do backend aqui
│       └── services/
│           └── emailService.ts # Envio de e-mail de convite
└── front/
    └── src/
        ├── App.tsx             # Rotas + ProtectedRoute
        ├── components/
        │   ├── Layout.tsx      # Sidebar + RBAC menu + role switcher
        │   └── GenericCadastro.tsx  # CRUD reutilizável
        ├── pages/
        │   ├── Login.tsx, Dashboard.tsx, MyReports.tsx
        │   ├── Movimentacoes/  # Solicitations.tsx, NewSolicitation.tsx
        │   └── Cadastros/      # Agents, Projects, DailyValues, Solicitants, CompleteProfile
        ├── services/api.ts     # Axios + JWT interceptor
        └── store/authStore.ts  # Zustand auth state
```

## 4. Tabelas Principais do Banco

| Tabela | Propósito | Campos-Chave |
|--------|----------|-------------|
| `users` | Usuários com roles, dados pessoais/bancários | roles[], courseId, status (PENDENTE/ATIVO/BLOQUEADO) |
| `solicitacoes` | Cabeçalho da viagem (grupo) | origem, destino, dataIda, dataVolta, status, requesterId |
| `detalhes_solicitacao` | Detalhe por agente na viagem | agentId, projectId, dailyRateTypeId, qtdDiarias (max 3.5) |
| `relatorios_viagem` | Prestação de contas (1:1 com detail) | prazoLimite (=dataVolta+5d), status, comprovanteUrl |
| `projetos` | Projetos/TEDs com verba | numTed (único), saldo, courseId |
| `solicitantes` | Vínculo User↔Course (quem pode solicitar) | userId (único), courseId |
| `cursos` | Departamentos/Cursos | nome (único) |
| `bancos`, `destinos`, `objetivos_solicitacao`, `tipos_de_diaria` | Tabelas auxiliares | — |

## 5. Regras de Negócio Invioláveis

### 5.1 Máquina de Estados da Solicitação
```
RASCUNHO → AGUARDANDO_DIRECAO → AGUARDANDO_FINANCEIRO → APROVADO_PARA_PAGAMENTO → PAGO
                ↓ (reject)              ↓ (reject)
           PENDENTE_CORRECAO ←──────────┘
```
- **Direção** aprova/rejeita em `AGUARDANDO_DIRECAO`
- **Financeiro** aprova/rejeita em `AGUARDANDO_FINANCEIRO`
- **FADEX** confirma pagamento em `APROVADO_PARA_PAGAMENTO`
- Aprovação empurra para o próximo estágio; rejeição volta para `PENDENTE_CORRECAO`

### 5.2 Bloqueio por Inadimplência (Regra Crítica)
Antes de criar uma solicitação, o sistema verifica se **QUALQUER** agente selecionado possui relatórios de viagem em atraso (`prazoLimite < now()` e status NÃO está `FECHADO` ou `APROVADO`). Se sim, a solicitação é **bloqueada com 403**.

### 5.3 Limite de Diárias
`qtdDiarias` é automaticamente capada em **3.5** (o backend força o cap, mesmo que o frontend envie valor maior).

### 5.4 Relatório Automático (Trigger PostgreSQL)
Ao inserir um `SolicitationDetail`, uma trigger PostgreSQL (`setup.sql`) cria automaticamente um `TravelReport` com:
- `prazoLimite = dataVolta + 5 dias`
- `status = 'ABERTO'`

### 5.5 Isolamento por Curso
Usuários **não-admin/financeiro/direção** só visualizam dados do seu próprio `courseId`. Aplicado em: users, projetos, solicitações, relatórios.

### 5.6 Status de Usuário
- `PENDENTE`: Criado mas não ativou conta → **não pode fazer login**
- `ATIVO`: Pode fazer login
- `BLOQUEADO`: Não pode fazer login

### 5.7 Perfis (Roles)
| Role | Permissões |
|------|-----------|
| **ADMIN** | Acesso total, vê todos os cursos, gerencia cadastros |
| **FINANCEIRO** | Aprova/rejeita solicitações no estágio financeiro, vê todos os cursos |
| **DIRECAO** | Aprova/rejeita solicitações no 1º estágio, vê todos os cursos |
| **FADEX** | Confirma pagamento, vê todos os relatórios |
| **COORDENACAO** | Solicitante (pode criar viagens), vê dados do próprio curso |
| **AGENTE** | Viajante, presta contas, vê dados do próprio curso |

## 6. Fluxos Críticos (End-to-End)

### 6.1 Criação de Usuário (Admin → Email → Ativação)
1. Admin acessa `/app/cadastros/agentes`, preenche formulário → `POST /api/users`
2. Backend gera senha aleatória, cria usuário com `status=PENDENTE`, gera JWT de 48h
3. `sendConfirmationEmail()` dispara e-mail com link `completar-registo?token=...`
4. Agente clica no link → `CompleteProfile.tsx` → define senha + dados bancários → `POST /api/users/completar-cadastro`
5. Backend seta `status=ATIVO`, usuário pode fazer login

### 6.2 Solicitação de Viagem (Solicitante → Aprovações → Pagamento)
1. Solicitante em `/app/solicitacoes/nova` → preenche origem, destino, datas, projeto, agentes
2. `POST /api/solicitacoes` → `SolicitationService.create()` verifica blocklist → cria `Solicitation` + N `SolicitationDetail` com `status=AGUARDANDO_DIRECAO`
3. Trigger PostgreSQL cria `TravelReport` para cada detail
4. Direção em `/app/solicitacoes` → APPROVE → `AGUARDANDO_FINANCEIRO`
5. Financeiro → APPROVE → `APROVADO_PARA_PAGAMENTO`
6. FADEX → PAY → `PAGO`

### 6.3 Prestação de Contas (Agente → FADEX)
1. Trigger cria `TravelReport` com prazo de 5 dias após volta
2. Agente deve anexar comprovantes (funcionalidade **não implementada no frontend**)
3. FADEX revisa e aprova ou devolve para correção

## 7. Comandos Úteis

### Desenvolvimento Local
```bash
# Iniciar banco de dados
docker compose up -d

# Backend
cd back
npm install
npx prisma migrate dev        # Aplicar migrations
npx prisma db seed            # Popular dados de exemplo
npx ts-node src/server.ts     # Iniciar servidor (porta 3000)

# Trigger PostgreSQL (aplicar manualmente após migrate)
psql -h localhost -U admin -d cead_db -f back/prisma/setup.sql

# Frontend
cd front
npm install
npm run dev                   # Iniciar Vite (porta 5173)
```

### Banco de Dados
```bash
# Acessar PostgreSQL
docker exec -it cead_postgres psql -U admin -d cead_db

# Resetar banco
docker compose down -v && docker compose up -d
cd back && npx prisma migrate dev && npx prisma db seed

# Aplicar trigger (necessário após reset)
psql -h localhost -U admin -d cead_db -f back/prisma/setup.sql

# Studio Prisma (visualizar dados)
cd back && npx prisma studio
```

### Troubleshooting Comum
```bash
# Erro de conexão com banco
docker compose ps              # Verificar se postgres está rodando
docker compose logs postgres   # Ver logs do banco

# Erro "column does not exist" (migration desatualizada)
cd back && npx prisma db push  # Sincronizar schema sem migration

# Verificar se a trigger existe
docker exec -it cead_postgres psql -U admin -d cead_db -c "\df"

# Erro no seed
cd back && npx prisma db seed  # Re-executar seed
```

## 8. Configuração de Ambiente

Variáveis de ambiente necessárias (criar `.env` em `back/`):

```bash
DATABASE_URL="postgresql://admin:password123@localhost:5432/cead_db"
PORT=3000
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=seu_user_mailtrap
SMTP_PASS=sua_senha_mailtrap
```

⚠️ **JWT_SECRET** está hardcoded em `back/src/server.ts:13` como `"segredo-super-secreto-mude-em-producao"`. **Mover para variável de ambiente antes de deploy.**

## 9. Bugs Conhecidos e Débitos Técnicos

### CRÍTICOS (impedem funcionalidade)

| Bug | Local | Impacto |
|-----|-------|---------|
| `SolicitationService.create()` usa nomes errados de campos | `server.ts:109-114` | Criação de solicitação CRASHA: `projetoId` deveria ser `projectId`, `tipoDiariaId` → `dailyRateTypeId`, `valorDiarias` não existe |
| Migration desatualizada vs schema.prisma | `migration.sql` | Colunas `users.status`, `users.courseId`, `projetos.courseId` faltam na migration — `db push` ou nova migration necessário |
| `DELETE /api/solicitantes/:id` deleta usuário errado | `server.ts:413` | `prisma.user.delete()` antes de `prisma.solicitant.delete()` — **RISCO DE PERDA DE DADOS** |
| `MyReports.tsx` importa store inexistente | `front/src/pages/MyReports.tsx:3` | Componente quebra se renderizado |
| Case sensitivity nos imports | `App.tsx` | Importa `./pages/movimentacoes/` mas diretório é `Movimentacoes/` (quebra em Linux) |

### MÉDIOS

| Issue | Local |
|-------|-------|
| Frontend renderiza `{o.nome}` para objetivos (campo é `objetivo`) | `NewSolicitation.tsx:281` |
| Frontend renderiza `{d.estado}` para destinos (campo não existe) | `NewSolicitation.tsx:203` |
| Sem autenticação em várias rotas (POST/DELETE) | `server.ts` |
| Role passado no body em vez do JWT no PATCH status | `server.ts:512-513` |
| Sem refresh token — expira em 8h | `authStore.ts` |
| CRUD automático sem PUT/PATCH — impossível editar | `server.ts:createCrudRoutes` |
| API URL hardcoded (`localhost:3000`) | `front/src/services/api.ts` |
| Link de e-mail hardcoded (`localhost:5173`) | `emailService.ts:20` |

## 10. Deploy Checklist

- [ ] Mover `JWT_SECRET` para variável de ambiente
- [ ] Criar `.env.example` com todas as variáveis
- [ ] Criar Dockerfiles para backend e frontend
- [ ] Adicionar serviços no `docker-compose.yml` para app e frontend
- [ ] Configurar nginx/Caddy como reverse proxy
- [ ] Executar `npx prisma migrate deploy` em produção
- [ ] Aplicar trigger PostgreSQL (`setup.sql`) no banco de produção
- [ ] Configurar SMTP real (não Mailtrap)
- [ ] Alterar `baseURL` do Axios para usar variável de ambiente
- [ ] Alterar link de confirmação no `emailService.ts` para URL de produção
- [ ] Corrigir os bugs críticos listados na seção 9
- [ ] Adicionar HTTPS/TLS
- [ ] Configurar rate limiting no Express
- [ ] Setup de monitoramento e logs

## 11. Endpoints da API (Resumo)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/api/login` | Não | Login → JWT |
| GET/POST | `/api/users` | Sim/Parcial | Listar/Criar usuários |
| POST | `/api/users/public/auto-cadastro` | Não | Auto-registro |
| POST | `/api/users/completar-cadastro` | Token | Ativar conta |
| DELETE | `/api/users/:id` | Não | ⚠️ Remover usuário |
| GET/POST/DELETE | `/api/solicitantes` | Não | ⚠️ Vínculo user-curso |
| GET/POST | `/api/projetos` | Sim | Projetos/TEDs |
| GET/POST | `/api/solicitacoes` | Parcial | Solicitações |
| PATCH | `/api/solicitacoes/:id/status` | Não | ⚠️ Atualizar status |
| GET | `/api/relatorios` | Sim | Relatórios |
| GET/POST/DELETE | `/api/{bancos,cursos,destinos,objetivos,tipos-diaria}` | Não | ⚠️ CRUD automático |
