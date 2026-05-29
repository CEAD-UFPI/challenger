# Business Requirements Document (BRD) — Challenger (SDP)

> **Sistema de Diárias e Passagens (SDP)**
> **Organização:** CEAD/UFPI (Centro de Educação Aberta e a Distância — Universidade Federal do Piauí)
> **Data:** 2026-05-29 | Versão: 1.0 (extraída do código-fonte)

---

## 1. Contexto de Negócio

### 1.1 Organização
A CEAD/UFPI gerencia projetos de ensino a distância financiados por TEDs (Termos de Execução Descentralizada). Esses projetos frequentemente exigem deslocamento de servidores (professores, técnicos, bolsistas) para atividades de campo, reuniões e capacitações.

### 1.2 Problema de Negócio
- Processo de solicitação de diárias e passagens era manual ou dependia de sistemas legados (migrados de Django)
- Necessidade de rastrear aprovações hierárquicas (Direção → Financeiro → FADEX)
- Obrigatoriedade legal de prestação de contas em até 5 dias após o retorno
- Necessidade de evitar novas viagens de servidores com prestação de contas pendente
- Múltiplos departamentos (cursos) com isolamento de dados

### 1.3 Stakeholders
| Stakeholder | Interesse |
|------------|----------|
| **CEAD/UFPI** | Controle e conformidade das viagens institucionais |
| **Coordenadores de Curso** | Solicitar viagens para suas equipes |
| **Direção** | Aprovar viagens no nível estratégico |
| **Financeiro** | Validar disponibilidade orçamentária dos projetos |
| **FADEX** | Executar pagamentos e auditar prestações de contas |
| **Agentes (Servidores)** | Realizar viagens e prestar contas |

---

## 2. Regras de Negócio Extraídas do Código

### 2.1 Fluxo de Aprovação Hierárquico (Regra 1)

Toda solicitação de viagem segue uma cadeia de aprovação sequencial:

```
RASCUNHO → AGUARDANDO_DIRECAO → AGUARDANDO_FINANCEIRO → APROVADO_PARA_PAGAMENTO → PAGO
                ↓ (rejeitar)            ↓ (rejeitar)
           PENDENTE_CORRECAO ←──────────┘
```

**Implementação:** `SolicitationService.updateStatus()` em `back/src/server.ts:121-158`

**Regras de transição:**
| De | Para | Quem | Ação |
|----|------|------|------|
| `RASCUNHO` | `AGUARDANDO_DIRECAO` | Sistema | Automático ao criar |
| `AGUARDANDO_DIRECAO` | `AGUARDANDO_FINANCEIRO` | DIRECAO | APPROVE |
| `AGUARDANDO_DIRECAO` | `PENDENTE_CORRECAO` | DIRECAO | REJECT |
| `AGUARDANDO_FINANCEIRO` | `APROVADO_PARA_PAGAMENTO` | FINANCEIRO | APPROVE |
| `AGUARDANDO_FINANCEIRO` | `PENDENTE_CORRECAO` | FINANCEIRO | REJECT |
| `APROVADO_PARA_PAGAMENTO` | `PAGO` | FADEX | PAY |

### 2.2 Bloqueio por Inadimplência (Regra 2)

**"Agentes com prestação de contas em atraso não podem participar de novas viagens."**

- Critério: `TravelReport` com `status NOT IN ('FECHADO', 'APROVADO')` E `prazoLimite < now()`
- Aplica-se a TODOS os agentes selecionados na nova solicitação
- Se qualquer agente estiver bloqueado, a solicitação INTEIRA é rejeitada (HTTP 403)
- A mensagem de erro inclui os nomes dos agentes bloqueados

**Implementação:** `SolicitationService.checkBlocklist()` em `back/src/server.ts:75-91`

### 2.3 Limite de Diárias (Regra 3)

**"A quantidade de diárias por agente não pode exceder 3.5."**

- O backend força o cap: `fields.qtdDiarias > 3.5 ? 3.5 : fields.qtdDiarias`
- Calculado como diferença entre `dataVolta` e `dataIda` em dias
- Arredondado para cima (`Math.ceil`)

**Implementação:** `SolicitationService.create()` em `back/src/server.ts:113`, cálculo no frontend em `NewSolicitation.tsx:86-92`

### 2.4 Prazo de Prestação de Contas (Regra 4)

**"O agente tem 5 dias corridos após a data de retorno para prestar contas."**

- Trigger PostgreSQL (`setup.sql`) cria automaticamente um `TravelReport` com `prazoLimite = dataVolta + 5 dias`
- Dispara no momento em que o `SolicitationDetail` é inserido (mesmo antes das aprovações)
- Status inicial: `ABERTO`

**Implementação:** `back/prisma/setup.sql`

### 2.5 Isolamento por Curso/Departamento (Regra 5)

**"Usuários não-administrativos só visualizam dados do seu próprio curso."**

- Papéis com visão global: `ADMIN`, `FINANCEIRO`, `DIRECAO` (solicitações), `FADEX` (relatórios)
- Demais papéis (`AGENTE`, `COORDENACAO`) têm filtro `WHERE courseId = currentUser.courseId`
- Se o usuário não tem `courseId`, retorna array vazio

**Implementação:** Filtros inline em `GET /api/users`, `GET /api/projetos`, `GET /api/solicitacoes`, `GET /api/relatorios`

### 2.6 Ciclo de Vida do Usuário (Regra 6)

**"Usuários devem ativar a conta antes de fazer login."**

- `PENDENTE`: Criado por admin ou auto-cadastro, aguardando ativação
- `ATIVO`: Completou o cadastro (definiu senha + dados bancários)
- `BLOQUEADO`: Impedido de acessar (não há endpoint para bloquear, mas a verificação existe)

**Implementação:** `POST /api/login` (linha 178) verifica `user.status !== "ATIVO"` e retorna 403.

### 2.7 Solicitação com Múltiplos Agentes (Regra 7)

**"Uma viagem pode ter múltiplos agentes com o mesmo trajeto."**

- `Solicitation` é o cabeçalho (origem, destino, datas, motivo)
- `SolicitationDetail` é criado para cada agente (1:1 com projeto, tipo de diária, objetivo)
- Dados individuais de transporte podem diferir por agente

---

## 3. Processos Operacionais

### 3.1 Processo de Onboarding de Agente
```
1. Admin acessa Gestão de Agentes → preenche nome, CPF, email, curso, banco
2. Sistema gera senha aleatória e cria usuário (status=PENDENTE)
3. Sistema envia e-mail com link de ativação (JWT de 48h)
4. Agente clica no link → define senha → preenche endereço e dados bancários
5. Sistema ativa conta (status=ATIVO)
6. Agente pode fazer login
```

### 3.2 Processo de Solicitação de Viagem
```
1. Solicitante preenche: origem, destino, datas (ida/volta), motivo
2. Vincula a um projeto/TED existente
3. Seleciona tipo de diária e objetivo
4. Seleciona um ou mais agentes do seu curso
5. Sistema verifica blocklist
6. Se aprovado, cria solicitação + detalhes + relatórios automáticos
```

### 3.3 Processo de Prestação de Contas
```
1. [Automático] Ao inserir detail, trigger cria TravelReport com prazo dataVolta + 5 dias
2. Agente acessa "Meus Relatórios"
3. Agente preenche atividades realizadas e anexa comprovantes
4. Agente submete → status muda para FECHADO
5. FADEX revisa → APROVADO ou EM_CORRECAO (devolve com motivo)
6. Se devolvido, agente corrige e reenvia
```

---

## 4. Restrições de Negócio

| Restrição | Descrição | Fonte |
|----------|----------|-------|
| **R01** | Apenas usuários com status ATIVO podem fazer login | `server.ts:178` |
| **R02** | Apenas Solicitantes (vínculo User↔Course) ou Admin/Coordenação podem criar viagens | `server.ts:186-198` (flag isSolicitant) |
| **R03** | qtdDiarias máximo é 3.5 | `server.ts:113` |
| **R04** | Data de volta deve ser posterior à data de ida | `NewSolicitation.tsx:30-33` (Zod) |
| **R05** | CPF e Email são únicos no sistema | `schema.prisma` (unique constraints) |
| **R06** | Um usuário só pode ter um vínculo de Solicitant (1:1) | `schema.prisma` (solicitantes_userId_key UNIQUE) |
| **R07** | Projetos têm numTed único | `schema.prisma` (projetos_numTed_key UNIQUE) |
| **R08** | Cada detail gera exatamente 1 relatório (1:1) | `schema.prisma` (relatorios_viagem_detailId_key UNIQUE) |

---

## 5. Glossário de Negócio

| Termo | Definição | Entidade no Sistema |
|-------|----------|-------------------|
| **Solicitação** | Pedido de viagem com origem, destino, datas e motivo | `Solicitation` |
| **Diária** | Valor pago por dia de deslocamento ao servidor | `DailyRateType` (valor + tipo) |
| **TED** | Termo de Execução Descentralizada — convênio que financia projetos | `Project.numTed` |
| **FADEX** | Fundação de Apoio — entidade que executa os pagamentos | Role `FADEX` |
| **Solicitante** | Usuário autorizado a criar pedidos de viagem para seu curso | `Solicitant` (vínculo User↔Course) |
| **Blocklist** | Lista de agentes impedidos de viajar por terem relatórios em atraso | `SolicitationService.checkBlocklist()` |
| **Prestação de Contas** | Relatório que o agente deve entregar em até 5 dias após a viagem | `TravelReport` |
| **Relatório** | Documento de comprovação da viagem (atividades + comprovantes) | `TravelReport` |
| **Curso** | Departamento/unidade acadêmica (multi-tenancy) | `Course` |
| **Projeto** | Projeto financiado por TED com verba para diárias | `Project` |
