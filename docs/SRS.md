# Software Requirements Specification (SRS) — Challenger (SDP)

> **Sistema de Diárias e Passagens (SDP)**
> **Versão:** 1.0 | **Data:** 2026-05-29
> **Escopo:** Extraído do código-fonte real (branch `master`, commit `1ba572d`)

---

## 1. Introdução

### 1.1 Propósito
Este documento especifica os requisitos funcionais e não-funcionais do Sistema de Diárias e Passagens (Challenger), conforme implementado e/ou projetado no código-fonte.

### 1.2 Escopo
Gestão completa do ciclo de vida de diárias e passagens: cadastro de usuários, solicitação de viagens, aprovação hierárquica, pagamento e prestação de contas.

### 1.3 Stack Técnica
- **Backend:** Node.js + Express 5 + Prisma ORM + PostgreSQL 15
- **Frontend:** React 18 + Vite 5 + TailwindCSS 3 + Zustand 4 + React Router 6
- **Autenticação:** JWT (jsonwebtoken + bcryptjs)
- **Comunicação:** REST/JSON via Axios

---

## 2. Requisitos Funcionais

### RF01 — Autenticação
| Campo | Valor |
|-------|-------|
| **Descrição** | O sistema deve permitir login com email e senha, retornando token JWT e dados do perfil |
| **Endpoint** | `POST /api/login` |
| **Entrada** | `{ email: string, password: string }` |
| **Saída (200)** | `{ user: { id, name, email, roles[], courseId, isSolicitant }, token: string }` |
| **Erros** | 401 (credenciais inválidas), 403 (conta PENDENTE ou BLOQUEADA), 500 (erro interno) |
| **Regras** | Senha verificada com bcrypt.compare. Token JWT expira em 8h. Bloqueia login se user.status ≠ "ATIVO" |
| **Status** | ✅ Implementado |

### RF02 — Listagem de Usuários com Filtro por Curso
| Campo | Valor |
|-------|-------|
| **Descrição** | Listar usuários. Super users veem todos; demais veem apenas usuários do seu curso |
| **Endpoint** | `GET /api/users` |
| **Auth** | JWT obrigatório |
| **Regras** | ADMIN, FINANCEIRO, DIRECAO → sem filtro. Demais → WHERE courseId = currentUser.courseId. passwordHash é removido da resposta |
| **Status** | ✅ Implementado |

### RF03 — Criação de Usuário com Convite por E-mail
| Campo | Valor |
|-------|-------|
| **Descrição** | Admin/Gestor cria usuário, o sistema gera senha temporária e envia e-mail de convite |
| **Endpoint** | `POST /api/users` |
| **Entrada** | `{ cpf, email, firstName, lastName, role, courseId?, bankId?, ... }` |
| **Processamento** | 1. Limpa CPF (remove não-dígitos). 2. Gera senha aleatória (8 chars). 3. Hash bcrypt(10). 4. Cria user (status=PENDENTE). 5. Gera JWT temporário (48h). 6. Envia e-mail via Nodemailer |
| **Erros** | 400 (P2002: CPF/email duplicado) |
| **Status** | ✅ Implementado |
| **⚠️** | Rota sem autenticação |

### RF04 — Auto-Cadastro Público
| Campo | Valor |
|-------|-------|
| **Descrição** | Agente se cadastra pela tela de login |
| **Endpoint** | `POST /api/users/public/auto-cadastro` |
| **Entrada** | `{ cpf, email, password, firstName, lastName, courseId? }` |
| **Regras** | Status criado como PENDENTE, role fixo como AGENTE. Aguarda aprovação |
| **Status** | ✅ Implementado |

### RF05 — Completar Cadastro via Token
| Campo | Valor |
|-------|-------|
| **Descrição** | Agente clica no link do e-mail, define senha e preenche dados bancários/endereço |
| **Endpoint** | `POST /api/users/completar-cadastro` |
| **Entrada** | `{ token, password, telefone, cep, endereco, bancoId?, agencia?, conta? }` |
| **Regras** | Verifica JWT do e-mail. Atualiza senha + dados. Seta status=ATIVO |
| **Erros** | 401 (token inválido/expirado) |
| **Status** | ✅ Implementado |

### RF06 — CRUD de Projetos/TEDs
| Campo | Valor |
|-------|-------|
| **Descrição** | Gerenciar projetos com verba para diárias |
| **Endpoints** | `GET /api/projetos` (com filtro por curso), `POST /api/projetos` |
| **Entrada (POST)** | `{ nomeDoProjeto, numTed, dtInicial, dtFinal, contaCorrente, saldo, courseId? }` |
| **Status** | ✅ Implementado (GET + POST). ⚠️ Sem PUT/PATCH/DELETE implementado na API |

### RF07 — Criação de Solicitação de Viagem
| Campo | Valor |
|-------|-------|
| **Descrição** | Solicitante cria pedido de viagem com múltiplos agentes |
| **Endpoint** | `POST /api/solicitacoes` |
| **Entrada** | `{ requesterId, motivo, origem, destino, dataIda, dataVolta, projetoId, tipoDiariaId, objectiveId, qtdDiarias?, agentIds[] }` |
| **Processamento** | 1. `checkBlocklist(agentIds)`. 2. Cria `Solicitation` (status=AGUARDANDO_DIRECAO). 3. Cria N `SolicitationDetail` (um por agente). 4. Trigger SQL cria `TravelReport` para cada detail |
| **Regras** | qtdDiarias cap em 3.5. Bloqueia se agentes tiverem relatórios em atraso |
| **Status** | ⚠️ Implementado com BUG CRÍTICO: nomes de campos incorretos (projetoId vs projectId, etc.) |

### RF08 — Fluxo de Aprovação
| Campo | Valor |
|-------|-------|
| **Descrição** | Aprovação hierárquica: Direção → Financeiro → FADEX |
| **Endpoint** | `PATCH /api/solicitacoes/:id/status` |
| **Entrada** | `{ role: string, action: "APPROVE" | "REJECT" | "PAY" }` |
| **Máquina de Estados** | Ver BRD Seção 2.1 |
| **Status** | ✅ Máquina de estados implementada. ⚠️ Role vem do body (não do JWT). ⚠️ Sem autenticação na rota |

### RF09 — Bloqueio por Inadimplência (Blocklist)
| Campo | Valor |
|-------|-------|
| **Descrição** | Bloquear solicitações com agentes que têm prestação de contas em atraso |
| **Query** | `TravelReport WHERE status NOT IN ('FECHADO','APROVADO') AND prazoLimite < now()` |
| **Resposta** | 403 com mensagem "Bloqueado! Pendências: [nomes]" |
| **Status** | ✅ Implementado |

### RF10 — Listagem de Relatórios
| Campo | Valor |
|-------|-------|
| **Descrição** | Listar relatórios com filtro por curso |
| **Endpoint** | `GET /api/relatorios` |
| **Auth** | JWT obrigatório |
| **Regras** | ADMIN, FINANCEIRO, FADEX veem todos. Demais veem relatórios do seu curso |
| **Status** | ✅ Implementado. ⚠️ Apenas GET — sem PUT/PATCH para atualizar |

### RF11 — CRUD de Tabelas Auxiliares
| Campo | Valor |
|-------|-------|
| **Descrição** | CRUD automático para bancos, cursos, destinos, objetivos, tipos de diária |
| **Endpoints** | `GET/POST/DELETE /api/{bancos,cursos,destinos,objetivos,tipos-diaria}` |
| **Funcionalidades** | Listar, Criar, Deletar |
| **Limitações** | Sem edição (PUT/PATCH). Sem autenticação. Sem validação de entrada |
| **Status** | ✅ Parcial |

### RF12 — Vínculo Solicitante-Curso
| Campo | Valor |
|-------|-------|
| **Descrição** | Vincular usuário a curso como "solicitante" (pode criar viagens) |
| **Endpoints** | `GET/POST /api/solicitantes`, `DELETE /api/solicitantes/:id` |
| **Status** | ✅ Parcial. ⚠️ DELETE com bug grave (deleta usuário antes do vínculo) |

---

## 3. Requisitos Não-Funcionais

### NFR01 — Segurança
| Requisito | Status | Observação |
|----------|--------|-----------|
| Senhas hasheadas (bcrypt, salt 10) | ✅ | |
| Autenticação JWT | ✅ | 8h expiração, sem refresh |
| JWT_SECRET em variável de ambiente | ❌ | Hardcoded |
| Autenticação em TODAS as rotas | ❌ | Várias rotas sem verificação |
| Role validation server-side | ⚠️ | Parcial (filtro por curso apenas) |
| HTTPS | ❌ | Sem configuração |
| Rate limiting | ❌ | Sem proteção contra brute force |
| CORS configurado | ⚠️ | `cors()` sem opções (permite tudo) |

### NFR02 — Performance
| Requisito | Status |
|----------|--------|
| Paginação | ❌ Não implementada |
| Índices de banco | ⚠️ FKs com índice implícito; sem índices explícitos em colunas frequentemente filtradas |
| Caching | ❌ Nenhum |
| Query optimization | ⚠️ N+1 potencial nos includes aninhados (relatórios → detail → solicitation → requester) |

### NFR03 — Disponibilidade
| Requisito | Status |
|----------|--------|
| Containerização | ⚠️ Apenas PostgreSQL |
| Health checks | ❌ |
| Graceful shutdown | ❌ |
| Logs estruturados | ❌ (apenas console.log/console.error) |
| Monitoramento | ❌ |

### NFR04 — Manutenibilidade
| Requisito | Status |
|----------|--------|
| Separação de camadas (controllers, services, routes) | ❌ Monolito em server.ts único |
| Testes automatizados | ❌ 0% de cobertura |
| Tipagem TypeScript | ⚠️ Parcial (muitos `any`) |
| Documentação de API | ❌ |
| .env.example | ❌ |

### NFR05 — Usabilidade
| Requisito | Status |
|----------|--------|
| Interface responsiva | ✅ Tailwind CSS |
| Feedback visual de ações | ✅ (loading states, mensagens de erro/sucesso) |
| Validação de formulários | ✅ Zod + React Hook Form no frontend |
| Mensagens de erro em português | ✅ |
| Estados vazios tratados | ✅ |

---

## 4. Requisitos de Dados

### 4.1 Entidades Principais
Ver `ARCHITECTURE.md` Seção 5 e `CLAUDE.md` Seção 4 para o modelo completo.

### 4.2 Validações de Dados

| Entidade | Campo | Validação | Onde |
|----------|-------|----------|------|
| User | cpf | 11 dígitos, algoritmo da Receita Federal | Frontend (Agents.tsx) |
| User | email | Formato email, único | Backend (unique constraint) |
| Solicitation | dataIda < dataVolta | Zod refine | Frontend (NewSolicitation.tsx) |
| Solicitation | motivo | Mínimo 10 caracteres | Frontend (Zod) |
| Solicitation | agentIds | Mínimo 1 | Frontend (Zod) |
| SolicitationDetail | qtdDiarias | Máximo 3.5 | Backend (cap) |
| Project | numTed | Único | Backend (unique constraint) |

### 4.3 Restrições de Integridade

| Tabela | Constraint | Tipo |
|--------|-----------|------|
| users | email, username, cpf, rg, telefone, celular | UNIQUE |
| projetos | numTed | UNIQUE |
| solicitantes | userId | UNIQUE (1:1) |
| bancos, cursos, destinos, objetivos, tipos_diaria | nome/objetivo | UNIQUE |
| relatorios_viagem | detailId | UNIQUE (1:1) |

---

## 5. Fluxos de Erro

### 5.1 Erro de Autenticação
```
Cliente → POST /api/login (credenciais inválidas)
  → bcrypt.compare falha → 401 { error: "Credenciais inválidas." }
```

### 5.2 Erro de Conta Não Ativada
```
Cliente → POST /api/login (conta PENDENTE)
  → user.status !== "ATIVO" → 403 { error: "Sua conta está pendente de ativação ou foi bloqueada." }
```

### 5.3 Erro de Bloqueio (Blocklist)
```
Cliente → POST /api/solicitacoes
  → checkBlocklist encontra relatórios em atraso
  → 403 { error: "Bloqueado! Pendências: Prof. Wesley" }
```

### 5.4 Erro de Transição de Status Inválida
```
Cliente → PATCH /api/solicitacoes/1/status { role: "DIRECAO", action: "APPROVE" }
  → Solicitação está em AGUARDANDO_FINANCEIRO (não AGUARDANDO_DIRECAO)
  → 400 { error: "Não está na vez da Direção" }
```

### 5.5 Erro de Duplicidade
```
Cliente → POST /api/users (email já existe)
  → Prisma P2002 → 400 { error: "E-mail já existe." }
```

### 5.6 Erro de Token Inválido (Completar Cadastro)
```
Cliente → POST /api/users/completar-cadastro { token: "expirado" }
  → jwt.verify falha → 401 { error: "Link inválido ou expirado." }
```

---

## 6. Dependências Externas

| Serviço | Propósito | Configuração |
|---------|----------|-------------|
| PostgreSQL 15 | Banco de dados | Docker, porta 5432 |
| Mailtrap/SMTP | Envio de e-mails | Nodemailer, configurável via env |
| Nenhuma outra | — | Sem integrações com AWS, Stripe, APIs externas |
