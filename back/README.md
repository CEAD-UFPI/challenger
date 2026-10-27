# Challenger — API

Veja o roteiro em [../docs/INSTALACAO.md](../docs/INSTALACAO.md).

Estrutura de `src/`:

- `config/env.ts` — leitura e validação das variáveis de ambiente
- `middlewares/` — autenticação/autorização (JWT + perfis) e tratamento de erros
- `routes/` — rotas por domínio (auth, users, solicitations, projects, catalog)
- `services/` — regras de negócio (fluxo de aprovação, bloqueio por relatório, e-mail, tokens)
- `schemas/` — validações Zod reutilizáveis
