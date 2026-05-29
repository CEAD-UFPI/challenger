# System Flows — Challenger (SDP)

> **Sistema de Diárias e Passagens (SDP)**
> **Formato:** Fluxos end-to-end com atores, sequência de passos, regras de negócio, exceções e troubleshooting.

---

## Fluxo 1: Onboarding de Agente (Admin → E-mail → Ativação)

### Atores
- **Admin:** Cadastra o agente no sistema
- **Sistema:** Gera credenciais, envia e-mail
- **Agente:** Recebe e-mail, ativa conta

### Sequência (Happy Path)

```
┌──────┐     ┌──────────┐     ┌────────┐     ┌──────────┐     ┌────────┐
│ Admin│     │ Frontend │     │Backend │     │ Nodemailer│     │ Agente │
└──┬───┘     └────┬─────┘     └───┬────┘     └─────┬─────┘     └───┬────┘
   │              │               │                 │               │
   │ Acessa       │               │                 │               │
   │ /cadastros/  │               │                 │               │
   │ agentes      │               │                 │               │
   │─────────────>│               │                 │               │
   │              │               │                 │               │
   │ Preenche     │               │                 │               │
   │ formulário   │               │                 │               │
   │ (nome, CPF,  │               │                 │               │
   │  email, role,│               │                 │               │
   │  curso,bank) │               │                 │               │
   │─────────────>│               │                 │               │
   │              │               │                 │               │
   │              │ POST /api/users               │               │
   │              │──────────────>│                 │               │
   │              │               │                 │               │
   │              │               │ 1. Valida CPF   │               │
   │              │               │ 2. Gera senha   │               │
   │              │               │    aleatória     │               │
   │              │               │ 3. Hash bcrypt  │               │
   │              │               │ 4. Cria User    │               │
   │              │               │    (PENDENTE)   │               │
   │              │               │ 5. Gera JWT 48h │               │
   │              │               │                 │               │
   │              │               │ sendConfirmationEmail()       │
   │              │               │────────────────>│               │
   │              │               │                 │               │
   │              │               │                 │ Envia HTML    │
   │              │               │                 │ com link      │
   │              │               │                 │──────────────>│
   │              │               │                 │               │
   │              │     201 { message, user }       │               │
   │              │<──────────────│                 │               │
   │              │               │                 │               │
   │              │               │                 │  Clica no     │
   │              │               │                 │  link do      │
   │              │               │                 │  e-mail       │
   │              │               │                 │               │
   │              │               │                 │ Acessa        │
   │              │               │                 │ /completar-   │
   │              │               │                 │ registo?      │
   │              │               │                 │ token=...     │
   │              │               │                 │──────────────>│
   │              │               │                 │               │
   │              │               │                 │ Define senha, │
   │              │               │                 │ preenche tel, │
   │              │               │                 │ CEP, endereço,│
   │              │               │                 │ banco, agência│
   │              │               │                 │ conta         │
   │              │               │                 │──────────────>│
   │              │               │                 │               │
   │              │               │ POST /users/completar-cadastro │
   │              │               │<───────────────────────────────│
   │              │               │                 │               │
   │              │               │ 1. jwt.verify   │               │
   │              │               │ 2. Hash nova    │               │
   │              │               │    senha         │               │
   │              │               │ 3. Atualiza     │               │
   │              │               │    user + status │               │
   │              │               │    = ATIVO       │               │
   │              │               │                 │               │
   │              │               │───Redirect login──────────────>│
   │              │               │                 │               │
```

### Regras Aplicadas
- **R1:** CPF validado no frontend (algoritmo da Receita Federal) e limpo de não-dígitos no backend
- **R2:** Senha temporária aleatória de 8 caracteres
- **R3:** JWT de ativação expira em 48 horas
- **R4:** Status só muda para ATIVO após completar cadastro
- **R5:** Login bloqueado enquanto status ≠ ATIVO

### Exceções
| Erro | Causa | Resposta |
|------|-------|----------|
| CPF/Email duplicado | P2002 do Prisma | 400 "CPF ou E-mail já cadastrados" |
| Token expirado | JWT > 48h | 401 "Link inválido ou expirado" |
| Senhas não coincidem | Frontend validation | "As senhas não coincidem" |
| Token ausente na URL | Acesso direto sem link | Tela de "Acesso Negado" |

### Troubleshooting
- **E-mail não chega:** Verificar credenciais SMTP (Mailtrap em dev). Log do Nodemailer no console.
- **Token inválido:** JWT_SECRET pode ter mudado entre o envio e a ativação.
- **Usuário não faz login:** Verificar se `status = 'ATIVO'` no banco: `SELECT id, email, status FROM users WHERE email='...';`

---

## Fluxo 2: Solicitação de Viagem (Solicitante → Aprovações → Pagamento)

### Atores
- **Solicitante:** Cria o pedido de viagem
- **Sistema:** Valida blocklist, cria registros, dispara trigger SQL
- **Direção:** Primeira aprovação
- **Financeiro:** Segunda aprovação (orçamentária)
- **FADEX:** Confirmação de pagamento

### Pré-condições
- Solicitante autenticado com `isSolicitant = true`
- Projetos, Tipos de Diária, Objetivos cadastrados
- Agentes sem relatórios em atraso

### Sequência (Happy Path)

```
Solicitante         Backend                    Direção         Financeiro       FADEX
    │                  │                          │                │              │
    │ POST /solicitacoes                         │                │              │
    │ {requesterId,    │                          │                │              │
    │  motivo, origem, │                          │                │              │
    │  destino,dataIda,│                          │                │              │
    │  dataVolta,      │                          │                │              │
    │  projetoId,      │                          │                │              │
    │  tipoDiariaId,   │                          │                │              │
    │  objectiveId,    │                          │                │              │
    │  agentIds[]}     │                          │                │              │
    │─────────────────>│                          │                │              │
    │                  │                          │                │              │
    │                  │ 1. checkBlocklist()      │                │              │
    │                  │    └─ Query relatórios   │                │              │
    │                  │       em atraso          │                │              │
    │                  │ 2. Se OK:                │                │              │
    │                  │    Cria Solicitation     │                │              │
    │                  │    (AGUARDANDO_DIRECAO)  │                │              │
    │                  │    + N Details           │                │              │
    │                  │    (cap qtdDiarias≤3.5)  │                │              │
    │                  │                          │                │              │
    │                  │ 3. Trigger PostgreSQL    │                │              │
    │                  │    AFTER INSERT detail   │                │              │
    │                  │    └─ Cria TravelReport  │                │              │
    │                  │       (prazo=dataVolta   │                │              │
    │                  │        + 5 dias)         │                │              │
    │                  │                          │                │              │
    │  201 (created)   │                          │                │              │
    │<─────────────────│                          │                │              │
    │                  │                          │                │              │
    │                  │   [Direção acessa        │                │              │
    │                  │    /app/solicitacoes]    │                │              │
    │                  │                          │                │              │
    │                  │                 Visualiza solicitações    │              │
    │                  │                 em AGUARDANDO_DIRECAO     │              │
    │                  │<─────────────────────────│                │              │
    │                  │                          │                │              │
    │                  │        PATCH /solicitacoes/:id/status     │              │
    │                  │        {role:"DIRECAO", action:"APPROVE"} │              │
    │                  │<─────────────────────────│                │              │
    │                  │                          │                │              │
    │                  │ Valida: status atual     │                │              │
    │                  │ == AGUARDANDO_DIRECAO    │                │              │
    │                  │ Atualiza →               │                │              │
    │                  │ AGUARDANDO_FINANCEIRO    │                │              │
    │                  │                          │                │              │
    │                  │──200 (updated)──────────>│                │              │
    │                  │                          │                │              │
    │                  │                          │  [Financeiro   │              │
    │                  │                          │   acessa tela] │              │
    │                  │                          │                │              │
    │                  │              PATCH {role:"FINANCEIRO",    │              │
    │                  │                    action:"APPROVE"}      │              │
    │                  │<─────────────────────────────────────────│              │
    │                  │                          │                │              │
    │                  │ Valida: status ==        │                │              │
    │                  │ AGUARDANDO_FINANCEIRO    │                │              │
    │                  │ Atualiza →               │                │              │
    │                  │ APROVADO_PARA_PAGAMENTO  │                │              │
    │                  │                          │                │              │
    │                  │──200─────────────────────────────────────>│              │
    │                  │                          │                │              │
    │                  │                          │   [FADEX       │              │
    │                  │                          │    acessa tela]│              │
    │                  │                          │                │              │
    │                  │              PATCH {role:"FADEX",         │              │
    │                  │                    action:"PAY"}          │              │
    │                  │<──────────────────────────────────────────│              │
    │                  │                          │                │              │
    │                  │ Valida: status ==        │                │              │
    │                  │ APROVADO_PARA_PAGAMENTO  │                │              │
    │                  │ Atualiza → PAGO          │                │              │
    │                  │                          │                │              │
    │                  │──200─────────────────────────────────────>│              │
```

### Regras Aplicadas
- **R1:** Bloqueio se qualquer agente tiver relatório em atraso (403)
- **R2:** `qtdDiarias` capado em 3.5
- **R3:** Status inicial = `AGUARDANDO_DIRECAO`
- **R4:** Transições rigidamente controladas por role e status atual
- **R5:** Apenas um role pode agir em cada estágio

### Exceções
| Erro | Causa | Resposta |
|------|-------|----------|
| Agente com pendência | Blocklist check | 403 "Bloqueado! Pendências: [nome]" |
| Transição inválida | Role errado ou status errado | 400 "Não está na vez da [role]" |
| Status não encontrado | ID inválido | 400 "Solicitação não encontrada" |

### Troubleshooting
- **Solicitação não aparece para Direção:** Verificar se `status = 'AGUARDANDO_DIRECAO'` e se o usuário tem role DIRECAO.
- **Erro 400 "Não está na vez":** O status atual não corresponde ao esperado para aquele role. Verificar `SELECT id, status FROM solicitacoes WHERE id = ...;`
- **⚠️ BUG CONHECIDO:** `SolicitationService.create()` usa nomes de campos errados — a criação de solicitação VAI FALHAR até que seja corrigido.

---

## Fluxo 3: Rejeição e Correção (PENDENTE_CORRECAO)

### Atores
- **Direção** ou **Financeiro:** Rejeita a solicitação
- **Solicitante:** Deve corrigir e reenviar

### Sequência
```
Direção/Financeiro → PATCH REJECT → status = PENDENTE_CORRECAO
Solicitante → Edita a solicitação → Reenvia → status volta para análise
```

### Status Atual
⚠️ **PARCIALMENTE IMPLEMENTADO:**
- Backend suporta transição para `PENDENTE_CORRECAO` ✅
- Endpoint para correção e reenvio: ❌ NÃO EXISTE
- Interface para editar solicitação rejeitada: ❌ NÃO EXISTE

---

## Fluxo 4: Prestação de Contas (Relatório de Viagem)

### Atores
- **Sistema (Trigger SQL):** Cria o relatório automaticamente
- **Agente:** Preenche atividades e anexa comprovantes
- **FADEX:** Revisa e aprova/devolve

### Sequência (Projetada)
```
[Trigger SQL]
  AFTER INSERT detalhes_solicitacao
  → Cria relatorios_viagem
    prazoLimite = dataVolta + 5 dias
    status = ABERTO

[Agente]
  Acessa /app/meus-relatorios (NÃO IMPLEMENTADO)
  Preenche atividades realizadas
  Anexa comprovantes (upload)
  Submete → status = FECHADO

[FADEX]
  Revisa relatório
  Aprova → status = APROVADO
  Ou devolve → status = EM_CORRECAO + motivo
```

### Status Atual
⚠️ **MAJORITARIAMENTE NÃO IMPLEMENTADO:**

| Componente | Status |
|-----------|--------|
| Trigger SQL (cria relatório) | ✅ Implementado (`setup.sql`) |
| Endpoint GET /api/relatorios | ✅ Implementado |
| Endpoint PUT/PATCH relatório | ❌ Não existe |
| Tela do Agente (enviar comprovante) | ❌ Placeholder "Em Construção" |
| Tela da FADEX (revisar) | ❌ Não existe |
| Upload de arquivos | ❌ Não existe |
| Histórico de ações (ReportHistory) | ❌ Modelo existe mas não é usado |

---

## Fluxo 5: Auto-Cadastro de Agente (Rota Pública)

### Atores
- **Agente:** Se cadastra pela tela de login
- **Admin:** Aprova ou rejeita o cadastro (não implementado)

### Sequência
```
Agente → Tela de Login → "Cadastrar-se"
  → Preenche: CPF, email, senha, nome, curso
  → POST /api/users/public/auto-cadastro
  → Sistema cria user (status=PENDENTE, role=AGENTE)
  → 201 { message: "Cadastro realizado. Aguarde aprovação." }

Admin → ? (Sem endpoint/tela de aprovação de cadastros pendentes)
```

### Status Atual
⚠️ **PARCIAL:** O auto-cadastro funciona, mas a aprovação pelo Admin é apenas implícita (via `POST /api/users` separado). Não há fila de aprovação de cadastros pendentes.

---

## Fluxo 6: Login e Sessão

### Sequência
```
Usuário → Tela de Login → email + senha
  → POST /api/login
  → Backend:
    1. Busca user por email (include solicitantProfile)
    2. bcrypt.compare(password, passwordHash)
    3. Verifica user.status === "ATIVO"
    4. Calcula isSolicitant
    5. Determina courseId (user.courseId || solicitantProfile.courseId)
    6. Gera JWT { id, roles, courseId, isSolicitant }
    7. Retorna { user, token }
  → Frontend:
    1. Salva token em localStorage ("sdp_token")
    2. Armazena user + token no Zustand store
    3. Seta activeRole = user.roles[0]
    4. Redireciona para /app (Dashboard)
```

### Regras
- JWT expira em 8 horas
- Sem refresh token — após expirar, usuário precisa fazer login novamente
- Token persiste em localStorage (sobrevive a refresh)
- Usuário (objeto) NÃO persiste — perdido no refresh da página

### Exceções
| Erro | Resposta |
|------|----------|
| Email não encontrado | 401 "Credenciais inválidas" |
| Senha incorreta | 401 "Credenciais inválidas" |
| Status ≠ ATIVO | 403 "Conta pendente de ativação ou bloqueada" |
