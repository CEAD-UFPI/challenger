# Product Requirements Document (PRD) — Challenger (SDP)

> **Produto:** Sistema de Diárias e Passagens (SDP) — "Challenger"
> **Versão do Documento:** 1.0 (gerado por auditoria de código)
> **Data:** 2026-05-29
> **Código-Fonte:** Branch `master`, commit `1ba572d`

---

## 1. Visão do Produto

O **Challenger** é uma plataforma web para gestão completa do ciclo de vida de diárias e passagens institucionais, desde a solicitação até a prestação de contas. Destina-se a órgãos públicos e universidades que precisam controlar viagens de servidores vinculadas a projetos/TEDs.

### 1.1 Problema que Resolve
- Substitui processos manuais/impressos de solicitação de viagens
- Rastreia aprovações hierárquicas (Direção → Financeiro → FADEX)
- Automatiza a cobrança de prestação de contas (relatório em 5 dias)
- Impede novas viagens de agentes com prestação de contas pendente (blocklist)

### 1.2 Nome do Produto
- **Nome oficial:** Sistema de Diárias e Passagens (SDP)
- **Codinome:** Challenger
- **Contexto:** CEAD/UFPI (Centro de Educação Aberta e a Distância — Universidade Federal do Piauí)

---

## 2. Personas

### 2.1 Solicitante (Coordenação/Admin)
- **Quem é:** Coordenador de curso ou administrador que planeja viagens para sua equipe
- **Necessidades:** Criar solicitações de viagem, selecionar agentes, vincular a projetos/TEDs, acompanhar status
- **Permissões:** CRUD de solicitações, visualização de agentes e projetos do próprio curso

### 2.2 Agente (Professor/Bolsista/Técnico)
- **Quem é:** Servidor que realiza a viagem
- **Necessidades:** Ser cadastrado no sistema, completar perfil com dados bancários, prestar contas após a viagem
- **Permissões:** Visualizar seus relatórios de viagem, enviar comprovantes

### 2.3 Direção
- **Quem é:** Diretor(a) da unidade que aprova viagens no primeiro estágio
- **Necessidades:** Revisar e aprovar/rejeitar solicitações de viagem
- **Permissões:** Visualizar todas as solicitações, aprovar no estágio `AGUARDANDO_DIRECAO`

### 2.4 Financeiro
- **Quem é:** Responsável pela análise financeira e orçamentária
- **Necessidades:** Verificar disponibilidade de verba do projeto, aprovar para pagamento
- **Permissões:** Visualizar todas as solicitações, aprovar no estágio `AGUARDANDO_FINANCEIRO`

### 2.5 FADEX
- **Quem é:** Fundação de apoio responsável pelo pagamento efetivo
- **Necessidades:** Confirmar pagamento realizado, auditar prestações de contas
- **Permissões:** Confirmar pagamento, revisar relatórios de viagem

### 2.6 Admin
- **Quem é:** Administrador do sistema
- **Necessidades:** Gerenciar cadastros auxiliares (bancos, cursos, destinos, objetivos, tipos de diária), gerenciar usuários e vínculos
- **Permissões:** Acesso total

---

## 3. Objetivos do Produto

| # | Objetivo | Status Atual |
|---|----------|-------------|
| O1 | Permitir criação de solicitações de viagem com múltiplos agentes | ✅ Parcial (bug no backend impede criação) |
| O2 | Implementar fluxo de aprovação hierárquico (Direção → Financeiro → FADEX) | ✅ Implementado |
| O3 | Bloquear novas solicitações de agentes com prestação de contas pendente | ✅ Implementado |
| O4 | Gerar automaticamente relatórios de prestação de contas (5 dias pós-volta) | ✅ Trigger SQL criado (aplicação manual) |
| O5 | Isolar dados por curso/departamento (multi-tenancy) | ✅ Parcial (algumas rotas sem verificação) |
| O6 | Gerenciar cadastros auxiliares (bancos, cursos, destinos, etc.) | ✅ CRUD básico implementado |
| O7 | Permitir auto-cadastro de agentes com aprovação | ✅ Implementado |
| O8 | Enviar e-mails transacionais (convite, notificações) | ✅ Apenas e-mail de convite |

---

## 4. Funcionalidades (Feature List)

### 4.1 Implementadas

| ID | Funcionalidade | Status | Observações |
|----|---------------|--------|-------------|
| F01 | Login/Logout com JWT | ✅ | 8h de expiração, sem refresh token |
| F02 | CRUD de Usuários/Agentes | ✅ | Com validação de CPF e máscara no frontend |
| F03 | Auto-cadastro público | ✅ | `POST /api/users/public/auto-cadastro` |
| F04 | Ativação de conta via e-mail | ✅ | Link com JWT de 48h + formulário de perfil |
| F05 | CRUD de Projetos/TEDs | ✅ | Filtro por curso |
| F06 | CRUD de Tipos de Diária | ✅ | Com valor monetário |
| F07 | CRUD de Cursos, Bancos, Destinos, Objetivos | ✅ | Via GenericCadastro |
| F08 | Vínculo Solicitante-Curso | ✅ | Gerenciado na tela de Solicitantes |
| F09 | Criação de solicitação de viagem | ⚠️ | Implementado mas com bug que impede funcionamento |
| F10 | Fluxo de aprovação (Direção/Financeiro/FADEX) | ✅ | Máquina de estados funcional |
| F11 | Bloqueio por inadimplência (blocklist) | ✅ | Verifica relatórios em atraso |
| F12 | Limite de 3.5 diárias | ✅ | Cap forçado no backend |
| F13 | Geração automática de relatório (trigger SQL) | ✅ | PostgreSQL trigger em `setup.sql` |
| F14 | Dashboard com estatísticas | ⚠️ | Dados mockados (tudo zero) |
| F15 | RBAC no menu lateral | ✅ | Filtro por role + isSolicitant |

### 4.2 Parciais ou Quebradas

| ID | Funcionalidade | Problema |
|----|---------------|----------|
| F16 | Envio de comprovantes pelo Agente | Frontend é placeholder "Em Construção" |
| F17 | Revisão de relatórios pela FADEX | Sem interface implementada |
| F18 | Edição de registros auxiliares | CRUD só tem GET/POST/DELETE, sem PUT/PATCH |
| F19 | Correção de solicitação devolvida | Status `PENDENTE_CORRECAO` existe mas sem UI para reenvio |

### 4.3 Não Implementadas

| ID | Funcionalidade | Prioridade |
|----|---------------|-----------|
| F20 | Notificações por e-mail de mudança de status | Alta |
| F21 | Histórico de ações em solicitações (audit trail) | Alta |
| F22 | Cálculo automático de valor total da diária (qtd × valor) | Média |
| F23 | Upload de documentos/comprovantes | Alta |
| F24 | Relatórios gerenciais (export CSV/PDF) | Média |
| F25 | Reset de senha | Alta |
| F26 | Tela de perfil do usuário logado | Baixa |
| F27 | Filtros e busca na listagem de solicitações | Média |
| F28 | Paginação nas listagens | Média |

---

## 5. Fluxo Principal do Usuário (Happy Path)

```
1. Admin cadastra agentes, cursos, projetos, tipos de diária
2. Admin ou sistema envia e-mail de convite ao agente
3. Agente clica no link, define senha, preenche dados bancários → conta ATIVADA
4. Solicitante (Coordenador) acessa "Nova Viagem"
5. Solicitante preenche: origem, destino, datas, projeto, tipo de diária, objetivo
6. Solicitante seleciona agentes que irão viajar
7. Sistema verifica blocklist → APROVADO → status: AGUARDANDO_DIRECAO
8. Direção revisa e APROVA → status: AGUARDANDO_FINANCEIRO
9. Financeiro revisa e APROVA → status: APROVADO_PARA_PAGAMENTO
10. FADEX confirma pagamento → status: PAGO
11. [Após dataVolta] Trigger gera relatório com prazo de 5 dias
12. Agente anexa comprovantes e envia relatório
13. FADEX revisa e aprova prestação de contas
```

---

## 6. Critérios de Sucesso

| Métrica | Alvo | Estado Atual |
|---------|------|-------------|
| Usuários conseguem criar solicitação sem erros | 100% | ❌ (bug no backend) |
| Tempo médio do ciclo de aprovação | < 48h | Não mensurável (sem logs) |
| Conformidade na prestação de contas (5 dias) | > 80% | Não implementado |
| Cobertura de testes | > 70% | 0% |
| Disponibilidade do sistema | 99.5% | Sem monitoramento |

---

## 7. Backlog Sugerido (Priorizado)

### Fase 1 — Correções Críticas (Sprint 1)
1. **CORREÇÃO:** `SolicitationService.create()` — corrigir nomes de campos (`projetoId`→`projectId`, etc.)
2. **CORREÇÃO:** `DELETE /api/solicitantes/:id` — remover `prisma.user.delete()` indevido
3. **CORREÇÃO:** Criar nova migration incluindo `users.status`, `users.courseId`, `projetos.courseId`
4. **CORREÇÃO:** Corrigir case dos imports no `App.tsx` (Linux compatibility)
5. **CORREÇÃO:** Corrigir renderização de `{o.nome}` para `{o.objetivo}` no NewSolicitation
6. **CORREÇÃO:** Remover referência a `{d.estado}` (campo inexistente) no NewSolicitation

### Fase 2 — Segurança e Infraestrutura (Sprint 2)
7. Mover JWT_SECRET para variável de ambiente
8. Adicionar middleware de autenticação nas rotas desprotegidas
9. Validar role do JWT (não do body) no PATCH status
10. Criar `.env.example`
11. Dockerizar backend e frontend
12. Configurar CI/CD básico

### Fase 3 — Funcionalidades Faltantes (Sprints 3-5)
13. Implementar upload de comprovantes no relatório
14. Tela de revisão de relatórios para FADEX
15. Dashboard com dados reais da API
16. Notificações por e-mail (mudança de status, prazo de relatório)
17. Reset de senha
18. Edição de registros (PUT/PATCH nos CRUDs auxiliares)

### Fase 4 — Robustez (Sprints 6+)
19. Testes automatizados (backend + frontend)
20. Logs estruturados e monitoramento
21. Paginação em todas as listagens
22. Filtros avançados e exportação de dados
23. Refresh token para JWT
24. Rate limiting
