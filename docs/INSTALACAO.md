# Roteiro de Instalação — Challenger (Sistema de Diárias e Passagens)

## Visão geral do ambiente

| Servidor | IP | Função | Situação |
|---|---|---|---|
| `cead-diarias-homologacao` | **10.42.90.242** | Banco de dados (PostgreSQL 15 em Docker, porta **5433**) | ✅ Instalado |
| Servidor de aplicação | **10.42.90.243** | API Node.js (PM2) + Frontend (Nginx) | ⏳ Parte B deste roteiro |

```
 Navegador ──HTTP──▶ Nginx :80 (10.42.90.243)
                      ├── /        → front/dist (arquivos estáticos)
                      └── /api/*   → API Node :3000 (PM2, só local)
                                        │
                                        └──TCP 5433──▶ PostgreSQL (10.42.90.242)
```

> **Dica para colar comandos:** os terminais deste ambiente (zsh/fish) quebraram comandos longos colados com `\` ou heredoc.
> Por isso, todos os comandos deste roteiro estão **um por linha**. Cole e execute um bloco por vez e confira a saída antes de seguir.

---

## Parte A — Banco de dados (10.42.90.242) ✅ concluída

Registro do que foi feito, para referência ou reinstalação.

| Item | Valor |
|---|---|
| Pasta | `~/cead-diarias-db` (usuário `cead`) |
| Arquivos | `docker-compose.yml` (cópia em `deploy/db/docker-compose.yml` no repositório) e `.env` (credenciais, `chmod 600`) |
| Container | `cead_diarias_db` (imagem `postgres:15-alpine`) |
| Volume | `cead_diarias_pgdata` |
| Porta | `10.42.90.242:5433` (a 5432 é do banco da **OLICMAT**, `olicmat-db` — **não mexer**) |
| Banco / usuário | `cead_db` / `cead_app` |

Comandos úteis (na .242, dentro de `~/cead-diarias-db`):

```bash
docker compose ps
docker compose logs --tail 50
docker compose restart
```

Para ver a senha do banco, necessária no passo B4:

```bash
grep POSTGRES_PASSWORD ~/cead-diarias-db/.env
```

> Volumes antigos removidos em 27/10/2026 (`challenger_*`, `erp-poller_*`, `homologacao_pgdata`). O backup deles está em `~/backup-volumes-2026-10-27` na .242.

Os passos que ainda faltam na .242 (firewall e backup do banco) estão nos passos **B10** e **B11**, porque dependem da aplicação já instalada.

---

## Parte B — Aplicação (10.42.90.243)

Todos os comandos abaixo são executados **na 10.42.90.243**, com um usuário que tenha `sudo` (ex.: `cead`), salvo indicação em contrário.

### B1. Conferir o sistema e o acesso ao banco

```bash
lsb_release -d
df -h /
sudo apt update
sudo apt install -y netcat-openbsd curl git rsync
nc -zv 10.42.90.242 5433
```

✅ **Esperado:** Ubuntu 22.04/24.04, alguns GB livres e `Connection to 10.42.90.242 5433 port [tcp/*] succeeded!`.
❌ Se o `nc` falhar, a .243 não alcança o banco. Verifique a rede antes de seguir.

### B2. Instalar Node.js 22, Nginx e PM2

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource_setup.sh
sudo bash /tmp/nodesource_setup.sh
sudo apt install -y nodejs nginx
sudo npm install -g pm2
node -v
npm -v
pm2 -v
nginx -v
```

✅ **Esperado:** `node` v22.x. O Vite 7 exige Node 20.19 ou superior.

### B3. Baixar o código

```bash
sudo mkdir -p /opt/challenger
sudo chown $USER:$USER /opt/challenger
git clone https://github.com/CEAD-UFPI/challenger.git /opt/challenger
cd /opt/challenger
git checkout dev-master
git log --oneline -3
```

- Se o repositório for **privado**, o `git clone` pede usuário e senha. Use seu usuário do GitHub e, como senha, um **Personal Access Token**, criado em GitHub → Settings → Developer settings → Tokens, com permissão de leitura no repositório.
- Use a branch `dev-master` enquanto o PR #3 não for aprovado. Depois do merge, use `git checkout master`.

### B4. Configurar o backend (`back/.env`)

Gere o segredo do JWT e copie o resultado:

```bash
openssl rand -hex 48
```

Na **10.42.90.242**, pegue a senha do banco:

```bash
grep POSTGRES_PASSWORD ~/cead-diarias-db/.env
```

De volta à **.243**, crie o arquivo a partir do exemplo e edite com o `nano`:

```bash
cd /opt/challenger/back
cp .env.example .env
chmod 600 .env
nano .env
```

Deixe o conteúdo assim, substituindo os campos `<...>`:

```ini
NODE_ENV=production
PORT=3000

DATABASE_URL="postgresql://cead_app:<SENHA_DO_BANCO>@10.42.90.242:5433/cead_db?schema=public"

JWT_SECRET=<RESULTADO_DO_openssl_rand>

CORS_ORIGIN=http://10.42.90.243
FRONTEND_URL=http://10.42.90.243

TRUST_PROXY=1
LOGIN_RATE_LIMIT=10

UPLOAD_DIR=/var/lib/challenger/uploads
MAX_UPLOAD_MB=10

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=cticead@ufpi.edu.br
SMTP_PASS=<SENHA_DE_APP_DO_GMAIL>
SMTP_FROM="Challenger CEAD <cticead@ufpi.edu.br>"
```

Para salvar no `nano`: `Ctrl+O`, `Enter`, `Ctrl+X`.

**Observações:**
- **`CORS_ORIGIN` / `FRONTEND_URL`:** quando houver um nome de domínio (ex.: `https://diarias.cead.ufpi.br`), troque nas duas variáveis e faça o passo B12.
- **`TRUST_PROXY=1`:** é obrigatório atrás do Nginx. Sem ele, o limite de tentativas de login trata todos os usuários como um único IP e bloqueia todo mundo.
- **SMTP:** para o Gmail, a senha precisa ser uma **senha de app**. Se o SMTP ficar vazio, a aplicação funciona e os links de convite e de recuperação de senha aparecem em `pm2 logs`.

Crie a pasta dos comprovantes:

```bash
sudo mkdir -p /var/lib/challenger/uploads
sudo chown -R $USER:$USER /var/lib/challenger
```

### B5. Instalar dependências e criar as tabelas

```bash
cd /opt/challenger/back
npm ci
npx prisma generate
npm run db:migrate
```

✅ **Esperado:** `All migrations have been successfully applied.`, com 4 migrations aplicadas.

> O `npm ci` também instala as devDependencies (TypeScript, Prisma CLI, ts-node), que são necessárias para o build e o seed. **Não** exporte `NODE_ENV=production` no terminal antes deste comando. No `.env` não há problema.

### B6. Carregar os dados iniciais e criar o administrador

Escolha uma senha forte para o admin (troque `UmaSenhaForte123` abaixo):

```bash
SEED_ADMIN_PASSWORD='UmaSenhaForte123' npm run db:seed
```

✅ **Esperado:** `✅ Seed finalizado (sem dados de demonstração).`

- Cria bancos, cursos, objetivos, tipos de diária, destinos, um projeto de exemplo e o usuário **`admin@ufpi.edu.br`**.
- Pode ser executado de novo sem duplicar dados.
- Em homologação, se quiser também o professor de exemplo (`professor@ufpi.edu.br`), acrescente `SEED_DEMO=true` antes do comando.

### B7. Compilar e iniciar a API com o PM2

```bash
cd /opt/challenger/back
npm run build
pm2 start dist/server.js --name challenger-api --cwd /opt/challenger/back
pm2 save
pm2 startup
```

O `pm2 startup` imprime um comando começando com `sudo env PATH=...`. **Copie e execute esse comando**, para que a API suba sozinha quando o servidor reiniciar.

Teste:

```bash
curl http://localhost:3000/api/health
pm2 status
pm2 logs challenger-api --lines 20 --nostream
```

✅ **Esperado:** `{"status":"ok"}`, o `challenger-api` como `online` e, no log, `🚀 Backend Challenger rodando na porta 3000`.

### B8. Compilar o frontend

```bash
cd /opt/challenger/front
cp .env.example .env
nano .env
```

Deixe o arquivo com **uma única linha**:

```ini
VITE_API_URL=/api
```

Depois instale, compile e publique:

```bash
npm ci
npm run build
sudo mkdir -p /var/www/challenger
sudo rsync -a --delete dist/ /var/www/challenger/
ls /var/www/challenger
```

✅ **Esperado:** `✓ built in ...`, e `index.html` e `assets` dentro de `/var/www/challenger`.

### B9. Configurar o Nginx

A configuração já está no repositório (`deploy/nginx/challenger.conf`):

```bash
sudo cp /opt/challenger/deploy/nginx/challenger.conf /etc/nginx/sites-available/challenger
sudo ln -sf /etc/nginx/sites-available/challenger /etc/nginx/sites-enabled/challenger
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

✅ **Esperado:** `syntax is ok` e `test is successful`.

Se o firewall (`ufw`) estiver ativo, libere o HTTP. Confira antes:

```bash
sudo ufw status
```

Só se aparecer `Status: active`:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx HTTP'
```

> ⚠️ Não rode `ufw enable` se ele estiver inativo, a menos que tenha liberado o SSH antes. Isso pode cortar seu acesso à máquina.

Teste pela rede, a partir do seu computador ou da própria .243:

```bash
curl http://10.42.90.243/api/health
```

✅ **Esperado:** `{"status":"ok"}`. Agora abra **http://10.42.90.243** no navegador. A tela de login deve aparecer.

### B10. Restringir a porta do banco à 10.42.90.243 (executar na .242)

Hoje a porta 5433 aceita conexões de qualquer máquina da rede. Este passo deixa entrar **apenas a .243**. A porta 5432 (OLICMAT) **não é afetada**.

> O Docker ignora o `ufw` para portas publicadas por containers. Por isso a regra vai na cadeia `DOCKER-USER` do iptables, aplicada por um serviço do systemd a cada boot.

**Na .243**, envie os dois arquivos do repositório para a .242. A .242 aceita login com senha:

```bash
scp /opt/challenger/deploy/db/docker-user-firewall.sh cead@10.42.90.242:~/cead-diarias-db/
scp /opt/challenger/deploy/db/docker-user-firewall.service cead@10.42.90.242:~/cead-diarias-db/
```

**Na .242:**

```bash
cd ~/cead-diarias-db
sudo install -m 755 docker-user-firewall.sh /usr/local/sbin/docker-user-firewall.sh
sudo install -m 644 docker-user-firewall.service /etc/systemd/system/docker-user-firewall.service
sudo systemctl daemon-reload
sudo systemctl enable --now docker-user-firewall.service
sudo iptables -L DOCKER-USER -n --line-numbers
```

✅ **Esperado:** uma regra `DROP tcp -- !10.42.90.243 0.0.0.0/0 ctorigdstport 5433`.

Valide os três cenários:

| Onde rodar | Comando | Resultado esperado |
|---|---|---|
| .243 | `nc -zv -w 3 10.42.90.242 5433` | `succeeded` |
| Seu computador (WSL) | `nc -zv -w 3 10.42.90.242 5433` | timeout / falha |
| .243 | `curl http://localhost:3000/api/health` | `{"status":"ok"}` |

Para desfazer, se necessário:

```bash
sudo systemctl disable --now docker-user-firewall.service
sudo iptables -D DOCKER-USER -p tcp -m conntrack --ctorigdstport 5433 ! -s 10.42.90.243 -j DROP
```

### B11. Backups

**Banco (na .242), todo dia às 02h, mantendo 14 dias:**

```bash
mkdir -p ~/backups-db
crontab -e
```

Adicione esta linha, sem quebrar:

```
0 2 * * * docker exec cead_diarias_db pg_dump -U cead_app -Fc cead_db > /home/cead/backups-db/cead_$(date +\%F).dump && find /home/cead/backups-db -name '*.dump' -mtime +14 -delete
```

Para testar na hora:

```bash
docker exec cead_diarias_db pg_dump -U cead_app -Fc cead_db > ~/backups-db/teste.dump
ls -lh ~/backups-db
```

Para restaurar:

```bash
docker exec -i cead_diarias_db pg_restore -U cead_app -d cead_db --clean < ~/backups-db/ARQUIVO.dump
```

**Comprovantes (na .243), todo dia às 02h30, mantendo 14 dias:**

```bash
mkdir -p ~/backups-uploads
crontab -e
```

Adicione:

```
30 2 * * * tar -czf /home/cead/backups-uploads/uploads_$(date +\%F).tar.gz -C /var/lib/challenger uploads && find /home/cead/backups-uploads -name '*.tar.gz' -mtime +14 -delete
```

> O banco guarda apenas o **nome** dos arquivos. O conteúdo dos comprovantes só existe em `/var/lib/challenger/uploads`, então os dois backups são necessários. O ideal é copiar ambos periodicamente para fora dos servidores.

### B12. HTTPS (quando houver um nome de domínio)

O certificado gratuito (Let's Encrypt) exige um **nome de domínio** apontando para a .243 e acessível pela internet. Ele não funciona só com o IP. Quando o domínio existir:

1. No `back/.env`, troque `CORS_ORIGIN` e `FRONTEND_URL` para `https://<dominio>` e rode `pm2 restart challenger-api`.
2. Em `/etc/nginx/sites-available/challenger`, troque `server_name 10.42.90.243 _;` por `server_name <dominio>;`.
3. Rode os comandos:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d <dominio>
   ```

### B13. Primeiro acesso

1. Abra **http://10.42.90.243** e entre com `admin@ufpi.edu.br` e a senha usada no B6.
2. Vá em **Meu Perfil → Alterar Senha** se quiser trocar a senha inicial.
3. Cadastre os dados de apoio: **Cursos, Bancos, Destinos, Objetivos, Tipos de Diária e Projetos**.
4. Em **Agentes**, cadastre os usuários. Cada um recebe um e-mail de convite, válido por 48h, para criar a própria senha.
5. Em **Solicitantes**, vincule a um curso os usuários que poderão abrir solicitações de viagem.

---

## Atualizar para uma nova versão (na .243)

Antes de atualizar, faça um backup do banco (B11, comando de teste na .242).

```bash
cd /opt/challenger
git pull
cd back
npm ci
npx prisma generate
npm run db:migrate
npm run build
pm2 restart challenger-api
cd ../front
npm ci
npm run build
sudo rsync -a --delete dist/ /var/www/challenger/
```

Se a configuração do Nginx mudar no repositório, repita o B9.

---

## Testes automatizados (desenvolvimento)

```bash
cd back
npm test
```

O comando acima roda só os testes unitários, que não precisam de banco. Para incluir os testes de integração, informe um banco **exclusivo** para eles, que é **apagado e recriado** a cada execução:

```bash
TEST_DATABASE_URL="postgresql://USUARIO:SENHA@localhost:5432/cead_db_test?schema=public" npm test
```

> **Nunca** aponte `TEST_DATABASE_URL` para o banco da .242. A suíte se recusa a rodar se ele for igual a `DATABASE_URL`, mas não detecta outros bancos reais.

## Ambiente de desenvolvimento local (resumo)

```bash
cp .env.example .env
docker compose up -d
cd back
npm install
cp .env.example .env
npx prisma migrate dev
SEED_DEMO=true npm run db:seed
npm run dev
```

Em outro terminal:

```bash
cd front
npm install
cp .env.example .env
npm run dev
```

Com `SEED_DEMO=true` e sem `SEED_ADMIN_PASSWORD`, os usuários de demonstração usam a senha `123456`: `admin@ufpi.edu.br` e `professor@ufpi.edu.br`.

---

## Solução de problemas

| Sintoma | Causa provável / solução |
|---|---|
| `nc` da .243 para `10.42.90.242 5433` falha | Container parado (`docker compose ps` na .242) ou regra do B10 com IP errado. |
| `P1001: Can't reach database server` | Mesmo caso acima. Confira também host e porta (**5433**) na `DATABASE_URL`. |
| `P1000: Authentication failed` | Senha na `DATABASE_URL` diferente da do `~/cead-diarias-db/.env` na .242. |
| `JWT_SECRET é obrigatória em produção` | Preencha `JWT_SECRET` no `back/.env` e rode `pm2 restart challenger-api`. |
| Erro de CORS no navegador | `CORS_ORIGIN` precisa ser exatamente o endereço aberto no navegador (ex.: `http://10.42.90.243`, sem `/` no final). |
| Página em branco ou 404 ao recarregar `/app/...` | Configuração do Nginx não aplicada (B9). |
| Front chamando `localhost:3000` | O `front/.env` não tinha `VITE_API_URL=/api` no momento do build. Corrija e repita o B8. |
| `Muitas tentativas. Aguarde 15 minutos` para todos | Falta `TRUST_PROXY=1` no `back/.env`. |
| Upload de comprovante com erro 413 | Falta `client_max_body_size` no Nginx (B9). |
| `EACCES` ao enviar comprovante | Permissão em `/var/lib/challenger/uploads`. Rode de novo o `chown` do B4. |
| Convite ou recuperação de senha não chegam | Confira o `SMTP_*`. Os links aparecem em `pm2 logs challenger-api`. |
| Login: "conta pendente de ativação" | O usuário ainda não concluiu o convite. Use "Esqueci minha senha" ou recrie o usuário. |
| API não volta após reiniciar o servidor | O comando impresso pelo `pm2 startup` não foi executado (B7). |
