# Arquitetura do Sistema — Challenger (SDP)

> **Sistema de Diárias e Passagens (SDP)** — Plataforma de gestão de diárias e passagens governamentais para a CEAD/UFPI.
> Documento gerado por auditoria automatizada do código-fonte real (branch: `master`, commit: `1ba572d`).

---

## 1. Visão Geral da Arquitetura

O Challenger adota uma arquitetura **monolítica de 2 camadas** (backend + frontend), com banco de dados PostgreSQL, comunicações via REST/JSON e autenticação por JWT.

```
┌──────────────────────────────────────────────┐
│                   CLIENTE                     │
│  React 18 + Vite + Tailwind + Zustand        │
│  Porta: 5173 (dev)                           │
└──────────────────┬───────────────────────────┘
                   │ HTTP/REST (JSON)
                   │ JWT Bearer Token
┌──────────────────▼───────────────────────────┐
│                   SERVIDOR                    │
│  Express 5 + Prisma Client + Zod + JWT       │
│  Porta: 3000                                 │
│  Arquivo único: back/src/server.ts (577 LOC) │
└──────────────────┬───────────────────────────┘
                   │ Prisma Client
┌──────────────────▼───────────────────────────┐
│              BANCO DE DADOS                   │
│  PostgreSQL 15 (Alpine)                      │
│  Container: cead_postgres, Porta: 5432       │
│  DB: cead_db, User: admin                    │
└──────────────────────────────────────────────┘
```

---

## 2. Stack Tecnológica

### 2.1 Backend (`back/`)

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Runtime | Node.js (CommonJS) | — |
| Framework HTTP | Express | ^5.2.1 |
| ORM | Prisma | ^5.19.0 |
| Banco de Dados | PostgreSQL | 15 (Alpine) |
| Autenticação | JWT (`jsonwebtoken`) | ^9.0.3 |
| Hashing de Senha | bcryptjs | ^3.0.3 |
| Validação | Zod | ^4.3.5 |
| E-mail | Nodemailer | ^8.0.1 |
| Datas | date-fns | ^4.1.0 |
| CORS | cors | ^2.8.5 |
| Env | dotenv | ^17.2.3 |
| Tipagem | TypeScript | ^5.x (via @types) |

### 2.2 Frontend (`front/`)

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | React | ^18.2.0 |
| Bundler | Vite | ^5.0.8 |
| Estilização | Tailwind CSS | ^3.4.0 |
| Roteamento | React Router DOM | ^6.21.0 |
| Estado Global | Zustand | ^4.4.0 |
| Formulários | React Hook Form + Zod | ^7.49.0 / ^3.22.0 |
| HTTP Client | Axios | ^1.6.0 |
| Ícones | Lucide React | ^0.300.0 |
| Utilidades | clsx, tailwind-merge, date-fns | — |

### 2.3 DevOps

| Ferramenta | Descrição |
|-----------|-----------|
| Docker Compose | `docker-compose.yml` — apenas o banco PostgreSQL |
| Container | `postgres:15-alpine` |
| CI/CD | Nenhum pipeline configurado |
| Deploy | Nenhum script ou configuração de deploy |

---

## 3. Estrutura de Diretórios

```
challenger/
├── docker-compose.yml          # Apenas PostgreSQL (sem app container)
├── metadata.json               # Nome: "Sistema de Diárias e Passagens (SDP)"
├── .gitignore
├── .claude/                    # Configurações do Claude Code
│   ├── settings.local.json
│   ├── commands/               # (a gerar)
│   └── skills/                 # (a gerar)
│
├── back/
│   ├── package.json            # Dependências do backend
│   ├── tsconfig.json           # TS config: ES2020, CommonJS
│   ├── README.md
│   ├── trigger.txt             # Anotações sobre a trigger SQL
│   ├── prisma/
│   │   ├── schema.prisma       # 371 linhas — 12 enums, 10 models
│   │   ├── seed.ts             # Seed: admin, professor, coordenador
│   │   ├── setup.sql           # Trigger PostgreSQL para relatórios
│   │   └── migrations/
│   │       └── 20260106155859_init_regras_v2/
│   │           └── migration.sql
│   └── src/
│       ├── server.ts           # 577 LOC — TUDO está aqui
│       └── services/
│           └── emailService.ts # Envio de e-mail de confirmação
│
└── front/
    ├── package.json
    ├── index.html
    ├── vite.config.ts          # Porta 5173
    ├── tailwind.config.js      # Configuração padrão
    ├── postcss.config.js
    ├── metadata.json
    └── src/
        ├── main.tsx           # Entry point
        ├── App.tsx            # 115 linhas — todas as rotas
        ├── index.css          # Tailwind directives
        ├── components/
        │   ├── Layout.tsx     # Sidebar + topbar + RBAC menu
        │   └── GenericCadastro.tsx  # CRUD genérico reutilizável
        ├── pages/
        │   ├── Login.tsx
        │   ├── Dashboard.tsx       # Placeholder (dados mockados)
        │   ├── MyReports.tsx       # Usa store inexistente (bug)
        │   ├── Movimentacoes/
        │   │   ├── Solicitations.tsx     # Listagem + aprovação/rejeição
        │   │   └── NewSolicitation.tsx   # Formulário de nova viagem
        │   └── Cadastros/
        │       ├── Agents.tsx           # CRUD de usuários/agentes
        │       ├── CompleteProfile.tsx  # Completa cadastro via token
        │       ├── DailyValues.tsx      # Tipos de diária
        │       ├── Projects.tsx         # Projetos/TEDs
        │       └── Solicitants.tsx      # Vínculo User-Curso
        ├── services/
        │   └── api.ts          # Axios com interceptors JWT
        └── store/
            └── authStore.ts    # Zustand: user, token, login, logout
```

---

## 4. Módulos e Domínios

### 4.1 Autenticação e Usuários

**Rotas:**
- `POST /api/login` — Login com email/senha, retorna JWT + perfil
- `POST /api/users` — Admin/Gestor cria usuário e dispara e-mail
- `POST /api/users/public/auto-cadastro` — Auto-cadastro público
- `POST /api/users/completar-cadastro` — Agente completa perfil via token
- `GET /api/users` — Lista usuários com filtro por curso
- `DELETE /api/users/:id` — Remove usuário

**RBAC via Roles (enum):** `ADMIN`, `FINANCEIRO`, `COORDENACAO`, `DIRECAO`, `FADEX`, `AGENTE`

**Status de Usuário:** `PENDENTE` → `ATIVO` (via completar-cadastro) / `BLOQUEADO`

### 4.2 Solicitações de Viagem

**Rotas:**
- `POST /api/solicitacoes` — Criar solicitação (com validação de bloqueio)
- `GET /api/solicitacoes` — Listar com filtro por curso
- `PATCH /api/solicitacoes/:id/status` — Aprovar/Rejeitar/Pagar

**Máquina de Estados:**
```
RASCUNHO → AGUARDANDO_DIRECAO → AGUARDANDO_FINANCEIRO → APROVADO_PARA_PAGAMENTO → PAGO
              ↓ (reject)              ↓ (reject)
         PENDENTE_CORRECAO ←——————————┘
              ↓ (corrigido pelo solicitante, volta para análise)
```

### 4.3 Relatórios de Viagem (Prestação de Contas)

**Rotas:**
- `GET /api/relatorios` — Listar com filtro por curso

**Trigger PostgreSQL** (`setup.sql`): Ao inserir um `SolicitationDetail`, cria automaticamente um `TravelReport` com prazo de 5 dias após `dataVolta`.

**Status:** `ABERTO` → `FECHADO` / `EM_CORRECAO` / `APROVADO` / `ARQUIVADO`

### 4.4 Cadastros Auxiliares (CRUD Automático)

A função `createCrudRoutes()` gera rotas `GET`, `POST`, `DELETE` para:

| Endpoint | Model | Tabela |
|----------|-------|--------|
| `/api/bancos` | Bank | `bancos` |
| `/api/cursos` | Course | `cursos` |
| `/api/destinos` | Destination | `destinos` |
| `/api/objetivos` | SolicitationObjective | `objetivos_solicitacao` |
| `/api/tipos-diaria` | DailyRateType | `tipos_de_diaria` |

### 4.5 Projetos

**Rotas:**
- `GET /api/projetos` — Lista com filtro por curso
- `POST /api/projetos` — Criar projeto

### 4.6 Solicitantes (Vínculo User-Curso)

**Rotas:**
- `GET /api/solicitantes` — Listar
- `POST /api/solicitantes` — Criar vínculo
- `DELETE /api/solicitantes/:id` — Remover vínculo

---

## 5. Modelo de Dados (10 tabelas)

```
users ───────────┐
  │ 1:N ─────────├─ solicitation_details (detalhes_solicitacao)
  │               │    │ 1:1 ─── travel_reports (relatorios_viagem)
  │               │    │              │ 1:N ─── report_history (historico_relatorios)
  │               │    │ N:1 ─── solicitations (solicitacoes)
  │               │    │ N:1 ─── projects (projetos)
  │               │    │ N:1 ─── daily_rate_types (tipos_de_diaria)
  │               │    │ N:1 ─── solicitation_objectives (objetivos_solicitacao)
  │               │    │ N:1 ─── destinations (destinos) [×2: origin + destiny]
  │               │
  │ N:1 ──────────├─ courses (cursos)
  │ N:1 ──────────├─ banks (bancos)
  │ 1:1 ──────────├─ solicitants (solicitantes) → courses
  │
  solicitations ──┘
```

### Tabelas Principais

| Tabela | Campos Notáveis | Índices Únicos |
|--------|----------------|----------------|
| `users` | email, cpf, rg, roles[], courseId, bankId, status | email, username, cpf, rg, telefone, celular |
| `solicitacoes` | origem, destino, dataIda, dataVolta, status, requesterId | — |
| `detalhes_solicitacao` | solicitationId, agentId, projectId, dailyRateTypeId, objectiveId, qtdDiarias | — |
| `relatorios_viagem` | detailId (unique), prazoLimite, status | detailId |
| `projetos` | nomeDoProjeto, numTed, saldo, courseId | numTed |

---

## 6. Fluxo de Requisição

```
1. Cliente → api.ts (Axios)
2. Interceptor anexa JWT ao header Authorization
3. Express → getUserFromRequest() extrai payload do JWT
4. Rota → verifica roles no payload (RBAC inline)
5. Filtro de curso: usuários não-admin só veem dados do seu courseId
6. Prisma Client → PostgreSQL
7. Resposta JSON
```

---

## 7. Configuração de Ambiente

**Variáveis de ambiente esperadas (não documentadas em .env.example):**

| Variável | Uso | Default |
|----------|-----|---------|
| `DATABASE_URL` | Conexão Prisma ao PostgreSQL | — (obrigatória) |
| `PORT` | Porta do Express | 3000 |
| `SMTP_HOST` | Servidor SMTP | sandbox.smtp.mailtrap.io |
| `SMTP_PORT` | Porta SMTP | 2525 |
| `SMTP_USER` | Usuário SMTP | — |
| `SMTP_PASS` | Senha SMTP | — |

**JWT_SECRET:** Hardcoded como `"segredo-super-secreto-mude-em-producao"` em `back/src/server.ts:13` ⚠️

---

## 8. Docker e Infraestrutura

```yaml
# docker-compose.yml — Apenas o banco de dados
services:
  postgres:
    image: postgres:15-alpine
    container_name: cead_postgres
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: password123
      POSTGRES_DB: cead_db
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
```

**Problemas identificados:**
- Não há container para o backend ou frontend
- Senhas hardcoded no docker-compose.yml
- Sem network explícita configurada
- Sem healthcheck

---

## 9. Decisões Arquiteturais e Débitos Técnicos

| Decisão | Impacto |
|---------|---------|
| Monolito em `server.ts` único (577 LOC) | Sem separação de responsabilidades, difícil de testar |
| CRUD automático com `createCrudRoutes()` | Sem validação ou autorização granular nas tabelas auxiliares |
| JWT_SECRET hardcoded | Risco de segurança em produção |
| Sem `PUT/PATCH` nos CRUDs auxiliares | Impossível editar registros (apenas criar/deletar) |
| Frontend com `Cadastros/` vs `cadastros/` (case mismatch) | Quebra em Linux — arquivos existem com `C` maiúsculo mas App.tsx importa com `c` minúsculo |
| Sem migrations para `courseId` em users e projetos | Schema Prisma diverge do migration SQL |
| Sem testes automatizados | `npm test` retorna "Error: no test specified" |
| Sem tipagem nos `any` do Express | Perda de segurança de tipos nas rotas |
