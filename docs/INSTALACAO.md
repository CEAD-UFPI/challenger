# Roteiro de Instalação — Challenger (Sistema de Diárias e Passagens)

A instalação é dividida em duas partes independentes:

| Parte | Onde roda | O que contém |
|---|---|---|
| **A. Banco de dados** | Servidor de BD | PostgreSQL 15 |
| **B. Aplicação** | Servidor de aplicação | API Node.js (`back/`) + Frontend React estático (`front/`) servido pelo Nginx |

As duas partes podem ficar na mesma máquina. Nesse caso, use `localhost` como host do banco.

```
 Navegador ──HTTPS──▶ Nginx (servidor de aplicação)
                        ├── /        → arquivos estáticos do front (front/dist)
                        └── /api/*   → API Node (porta 3000, PM2)
                                          │
                                          └──TCP 5432──▶ PostgreSQL (servidor de BD)
```

> Os comandos abaixo são para **Ubuntu Server 22.04/24.04**. Em outras distribuições, adapte o gerenciador de pacotes.

---

## Parte A — Banco de dados

Escolha **uma** das opções: **A1 (Docker)** ou **A2 (PostgreSQL nativo)**. Para produção, recomendamos a A2.

### A1. Via Docker (desenvolvimento/homologação)

1. Instale o Docker e o plugin Compose:
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose-v2
   sudo usermod -aG docker $USER   # depois, saia e entre de novo na sessão
   ```
2. Na raiz do projeto, crie o `.env` do banco a partir do exemplo e **troque a senha**:
   ```bash
   cp .env.example .env
   nano .env        # defina POSTGRES_PASSWORD
   ```
3. Suba o container e confira se ficou saudável:
   ```bash
   docker compose up -d
   docker compose ps          # STATUS deve mostrar "healthy"
   ```
4. Anote a string de conexão que a aplicação vai usar:
   ```
   postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@<IP_DO_SERVIDOR>:5432/<POSTGRES_DB>?schema=public
   ```

### A2. PostgreSQL nativo (produção)

1. **Instale o PostgreSQL 15** (repositório oficial):
   ```bash
   sudo apt install -y curl ca-certificates
   sudo install -d /usr/share/postgresql-common/pgdg
   sudo curl -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc --fail https://www.postgresql.org/media/keys/ACCC4CF8.asc
   echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list
   sudo apt update && sudo apt install -y postgresql-15
   ```

2. **Crie o usuário e o banco da aplicação.** Use uma senha forte, sem `@`, `:` ou `/` (ou codifique-a como URL):
   ```bash
   sudo -u postgres psql <<'SQL'
   CREATE ROLE cead_app WITH LOGIN PASSWORD 'TROQUE_ESTA_SENHA';
   CREATE DATABASE cead_db OWNER cead_app ENCODING 'UTF8' TEMPLATE template0;
   \c cead_db
   ALTER SCHEMA public OWNER TO cead_app;
   SQL
   ```
   > O usuário `cead_app` precisa ser **dono** do banco e do schema `public`. As migrations criam tabelas, tipos enum, uma função PL/pgSQL e um trigger.

3. **Libere o acesso remoto.** Este passo só é necessário se a aplicação estiver em **outra** máquina.
   - Em `/etc/postgresql/15/main/postgresql.conf`:
     ```
     listen_addresses = '*'          # ou o IP da interface interna
     ```
   - Em `/etc/postgresql/15/main/pg_hba.conf`, libere **apenas** o IP do servidor de aplicação:
     ```
     host    cead_db    cead_app    <IP_DO_SERVIDOR_APP>/32    scram-sha-256
     ```
   - Reinicie e restrinja a porta no firewall:
     ```bash
     sudo systemctl restart postgresql
     sudo ufw allow from <IP_DO_SERVIDOR_APP> to any port 5432 proto tcp
     ```

4. **Teste a conexão a partir do servidor de aplicação**:
   ```bash
   sudo apt install -y postgresql-client
   psql "postgresql://cead_app:SENHA@<IP_DO_SERVIDOR_BD>:5432/cead_db" -c "select version();"
   ```

5. **Configure o backup diário.** Recomendado:
   ```bash
   sudo mkdir -p /var/backups/cead && sudo chown postgres /var/backups/cead
   sudo -u postgres crontab -e
   # Adicione (backup às 02h, mantém 14 dias):
   0 2 * * * pg_dump -Fc cead_db > /var/backups/cead/cead_$(date +\%F).dump && find /var/backups/cead -name '*.dump' -mtime +14 -delete
   ```
   Para restaurar: `pg_restore -d cead_db --clean /var/backups/cead/cead_AAAA-MM-DD.dump`

> **Importante:** a estrutura das tabelas **não** é criada manualmente. Ela é criada pela aplicação no passo B2.5 (`prisma migrate deploy`). O antigo `setup.sql` (trigger de relatórios) agora faz parte das migrations.

---

## Parte B — Aplicação

### B1. Pré-requisitos do servidor de aplicação

```bash
# Node.js 22 LTS (o Vite 7 exige Node >= 20.19)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git nginx
sudo npm install -g pm2

node -v    # deve mostrar v22.x
```

Obtenha o código:
```bash
sudo mkdir -p /opt/challenger && sudo chown $USER /opt/challenger
git clone <URL_DO_REPOSITORIO> /opt/challenger
cd /opt/challenger
```

### B2. Backend (API)

1. **Instale as dependências.** As devDependencies também são necessárias, porque incluem TypeScript, Prisma CLI e ts-node para o seed:
   ```bash
   cd /opt/challenger/back
   npm ci
   ```

2. **Configure as variáveis de ambiente:**
   ```bash
   cp .env.example .env
   nano .env
   ```

   | Variável | Obrigatória | Exemplo / observação |
   |---|---|---|
   | `NODE_ENV` | sim | `production` |
   | `PORT` | não | `3000` |
   | `DATABASE_URL` | sim | `postgresql://cead_app:SENHA@IP_BD:5432/cead_db?schema=public` |
   | `JWT_SECRET` | **sim em produção** | Gere com: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
   | `CORS_ORIGIN` | sim | `https://diarias.seudominio.edu.br` |
   | `FRONTEND_URL` | sim | Igual ao acima; é usada nos links dos e-mails |
   | `TRUST_PROXY` | sim (com Nginx) | `1`. Sem isso, o limite de tentativas de login trata todos os usuários como o mesmo IP |
   | `LOGIN_RATE_LIMIT` | não | `10` tentativas falhas de login por IP a cada 15 min |
   | `UPLOAD_DIR` | sim | `/var/lib/challenger/uploads`. É onde ficam os comprovantes dos relatórios |
   | `MAX_UPLOAD_MB` | não | `10` |
   | `SMTP_HOST` / `SMTP_PORT` | não | Se vazio, usa o Gmail/Google Workspace |
   | `SMTP_USER` / `SMTP_PASS` | recomendado | Conta de envio. Para Gmail, use uma **senha de app** |
   | `SMTP_FROM` | não | `"Challenger CEAD <cticead@ufpi.edu.br>"` |

   > Sem SMTP configurado, a API não falha. Os links de convite e de recuperação de senha são gravados no log (`pm2 logs`).

3. **Proteja o arquivo e crie a pasta de comprovantes:**
   ```bash
   chmod 600 .env
   sudo mkdir -p /var/lib/challenger/uploads
   sudo chown $USER /var/lib/challenger/uploads
   ```
   > A pasta `UPLOAD_DIR` guarda os comprovantes enviados pelos agentes. Ela **precisa entrar no backup**, junto com o banco (veja B6).

4. **Gere o client do Prisma:**
   ```bash
   npx prisma generate
   ```

5. **Crie as tabelas no banco** (aplica todas as migrations):
   ```bash
   npm run db:migrate
   ```
   O resultado esperado é `All migrations have been successfully applied.`

6. **Carregue os dados iniciais.** O seed cria bancos, cursos, objetivos, tipos de diária, destinos e o usuário administrador:
   ```bash
   SEED_ADMIN_PASSWORD='UmaSenhaForte!' npm run db:seed
   ```
   - O administrador criado é `admin@ufpi.edu.br`, com a senha definida acima.
   - Para incluir dados de demonstração (o professor de exemplo), acrescente `SEED_DEMO=true`. **Não use em produção.**
   - O seed é idempotente: pode ser executado de novo sem duplicar dados.

7. **Compile e inicie com o PM2:**
   ```bash
   npm run build
   pm2 start dist/server.js --name challenger-api
   pm2 save
   pm2 startup     # execute o comando que ele imprimir, para iniciar no boot
   ```

8. **Verifique:**
   ```bash
   curl http://localhost:3000/api/health      # {"status":"ok"}
   pm2 logs challenger-api --lines 20
   ```

### B3. Frontend

1. **Configure a URL da API.** Ela é embutida no build, então precisa estar definida antes de compilar:
   ```bash
   cd /opt/challenger/front
   cp .env.example .env
   nano .env
   ```
   Com o Nginx fazendo proxy de `/api` no mesmo domínio (recomendado):
   ```
   VITE_API_URL=/api
   ```

2. **Instale e gere o build:**
   ```bash
   npm ci
   npm run build          # gera front/dist
   ```

3. **Publique os arquivos estáticos:**
   ```bash
   sudo mkdir -p /var/www/challenger
   sudo rsync -a --delete dist/ /var/www/challenger/
   ```

### B4. Nginx (frontend + proxy da API)

Crie `/etc/nginx/sites-available/challenger`:

```nginx
server {
    listen 80;
    server_name diarias.seudominio.edu.br;

    root /var/www/challenger;
    index index.html;

    # Upload de comprovantes (o padrão do Nginx, 1 MB, recusaria os arquivos)
    client_max_body_size 12m;

    # API
    location /api/ {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    # SPA: as rotas do React (/app, /reset-password, /completar-registo) caem no index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Ative o site e configure o HTTPS:
```bash
sudo ln -s /etc/nginx/sites-available/challenger /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d diarias.seudominio.edu.br

sudo ufw allow 'Nginx Full'
```

> A porta 3000 **não** deve ficar exposta externamente. Só o Nginx acessa a API.

### B5. Primeiro acesso

1. Acesse `https://diarias.seudominio.edu.br` e entre com `admin@ufpi.edu.br` e a senha do `SEED_ADMIN_PASSWORD`.
2. Troque a senha do admin em **Meu Perfil → Alterar Senha**.
3. Cadastre os dados de apoio: **Cursos, Bancos, Destinos, Objetivos, Tipos de Diária e Projetos**.
4. Cadastre os usuários em **Agentes**. Cada usuário recebe um convite por e-mail, válido por 48h, para definir a própria senha.
5. Em **Solicitantes**, vincule a um curso os usuários que poderão abrir solicitações de viagem.

### B6. Backup dos comprovantes

O banco guarda apenas o nome do arquivo; o conteúdo fica em `UPLOAD_DIR`. Exemplo de backup diário:
```bash
sudo crontab -e
# Às 02h30, mantendo 14 dias:
30 2 * * * tar -czf /var/backups/cead/uploads_$(date +\%F).tar.gz -C /var/lib/challenger uploads && find /var/backups/cead -name 'uploads_*.tar.gz' -mtime +14 -delete
```
Se o banco e a aplicação estão em máquinas diferentes, copie esses arquivos para um local externo (rsync/scp).

---

## Testes automatizados

```bash
cd back
npm test                 # só os testes unitários (não precisam de banco)
```

Para rodar também os testes de integração, use um **banco exclusivo de testes**. Ele é **apagado e recriado** a cada execução:
```bash
TEST_DATABASE_URL="postgresql://cead_app:SENHA@localhost:5432/cead_db_test?schema=public" npm test
```
- O usuário precisa de permissão `CREATEDB`, ou o banco `cead_db_test` precisa já existir com ele como dono.
- A suíte se recusa a rodar se `TEST_DATABASE_URL` for igual a `DATABASE_URL`.
- **Nunca** aponte `TEST_DATABASE_URL` para o banco de produção.

---

## Atualização de versão

```bash
cd /opt/challenger && git pull

# Backend
cd back
npm ci
npx prisma generate
npm run db:migrate          # aplica apenas as migrations novas
npm run build
pm2 restart challenger-api

# Frontend
cd ../front
npm ci && npm run build
sudo rsync -a --delete dist/ /var/www/challenger/
```

> Faça um backup do banco (`pg_dump`) **antes** de rodar `db:migrate` em produção.

### Banco que já estava em uso (instalação anterior)

Se o banco foi criado antes desta versão, ou se o `setup.sql` foi executado manualmente, basta rodar `npm run db:migrate`:
- a migration `20260501000000_trigger_relatorio_viagem` usa `CREATE OR REPLACE`/`DROP TRIGGER IF EXISTS`, então é segura mesmo com o trigger já existente;
- a migration `20260502000000_numero_endereco_e_devolucao` só **adiciona** colunas opcionais.

---

## Ambiente de desenvolvimento (resumo)

```bash
# 1. Banco
cp .env.example .env && docker compose up -d

# 2. API (http://localhost:3000)
cd back && npm install && cp .env.example .env    # ajuste DATABASE_URL
npx prisma migrate dev && SEED_DEMO=true npm run db:seed
npm run dev

# 3. Front (http://localhost:5173)
cd ../front && npm install && cp .env.example .env
npm run dev
```

Usuários de demonstração (com `SEED_DEMO=true`, senha `123456`):
- `admin@ufpi.edu.br` (ADMIN + FINANCEIRO)
- `professor@ufpi.edu.br` (AGENTE + solicitante do curso HISTÓRIA)

---

## Solução de problemas

| Sintoma | Causa provável / solução |
|---|---|
| `JWT_SECRET é obrigatória em produção` ao iniciar | Defina `JWT_SECRET` no `back/.env`. |
| `P1001: Can't reach database server` | Verifique o IP/porta na `DATABASE_URL`, o `listen_addresses`, o `pg_hba.conf` e o firewall (Parte A2, passo 3). |
| `P3018` / `permission denied for schema public` em `db:migrate` | O usuário do banco não é dono do schema. Rode `ALTER SCHEMA public OWNER TO cead_app;`. |
| Erro de CORS no navegador | `CORS_ORIGIN` deve ser exatamente a origem do front (protocolo + domínio, sem `/` no final). |
| Página em branco / 404 ao recarregar `/app/...` | Falta o `try_files ... /index.html` no Nginx. |
| Front chama `localhost:3000` em produção | O `VITE_API_URL` não estava definido **antes** do `npm run build`. Defina e gere o build de novo. |
| Convite ou recuperação de senha não chegam | Confira as variáveis `SMTP_*`. Sem SMTP, o link aparece em `pm2 logs challenger-api`. |
| `Muitas tentativas. Aguarde 15 minutos` para todos os usuários | Falta `TRUST_PROXY=1` no `back/.env` atrás do Nginx. Todos aparecem com o IP do proxy. |
| Upload de comprovante falha com erro 413 | Falta `client_max_body_size 12m;` no Nginx (B4). |
| `EACCES` ao enviar comprovante | O usuário que roda o PM2 não tem permissão de escrita em `UPLOAD_DIR`. |
| Login retorna "conta pendente de ativação" | O usuário ainda não concluiu o convite. Reenvie com "Esqueci minha senha" ou recrie o usuário. |
