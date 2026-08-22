# Deployment Guide — SouBilingue

**Data:** 22 de agosto de 2026  
**Versão:** 1.0 — Pronta para produção

---

## 📋 Pré-requisitos

Antes de começar, certifique-se que você tem:

- ✅ Node.js 18+ instalado (`node --version`)
- ✅ npm ou yarn disponível
- ✅ Conta no Supabase (https://supabase.com)
- ✅ Conta na Anthropic (https://console.anthropic.com)
- ✅ Conta no Asaas (https://asaas.com) — para pagamentos
- ✅ Acesso ao servidor de produção (VPS, Railway, Vercel, etc)

---

## 🔧 Fase 1: Configurar Banco de Dados (Supabase)

### Passo 1.1 — Criar projeto Supabase

1. Acesse https://app.supabase.com
2. Clique em "New project"
3. Preencha:
   - **Name:** "soubilingue" (ou seu nome)
   - **Database password:** (salve com segurança)
   - **Region:** São Paulo (sa-east-1) ou a mais próxima de você
4. Aguarde provisão (~2 min)

### Passo 1.2 — Obter credenciais

1. Vá em **Project Settings > API**
2. Copie:
   - `NEXT_PUBLIC_SUPABASE_URL` → URL do projeto
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Anon Key
   - `SUPABASE_SERVICE_ROLE_KEY` → Service Role Key (⚠️ **jamais envie ao cliente**)

### Passo 1.3 — Aplicar migrations

Abra o terminal do Supabase Console e execute:

```sql
-- Copie e cole o conteúdo de:
-- supabase/migrations/0001_schema_inicial.sql
-- supabase/migrations/0002_responsavel_le_profile_do_aluno.sql
-- supabase/migrations/0003_adiciona_foto_url_tutores.sql
```

Ou, se estiver usando a CLI do Supabase (recomendado):

```bash
# 1. Instalar CLI
brew install supabase/tap/supabase  # macOS
# ou
choco install supabase              # Windows

# 2. Login
supabase login

# 3. Link ao projeto
supabase link --project-ref seu_project_ref

# 4. Aplicar migrations
supabase migration up

# 5. Popular dados de teste (seed)
supabase db seed
```

### Passo 1.4 — Verificar RLS (Row Level Security)

1. No Supabase Console, vá em **Authentication > Policies**
2. Verifique que as policies em cada tabela estão ativas
3. Se tiver dúvidas, consulte `CLAUDE.md` seção "Isolamento entre academias"

---

## 🔑 Fase 2: Configurar Variáveis de Ambiente

### Passo 2.1 — Criar `.env.local`

Na raiz do projeto, crie um arquivo `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... # Nunca envie ao cliente!

# Anthropic
ANTHROPIC_API_KEY=sk-ant-v0-...
ANTHROPIC_MODEL=claude-haiku-4-5-20251001

# Cron Secret (gere com: node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")
CRON_SECRET=seu_token_aleatorio_aqui

# Asaas (Sandbox para dev, Produção depois)
ASAAS_API_KEY=$aact_hmlg_... (sandbox) ou $aact_prod_... (prod)
ASAAS_API_URL=https://sandbox.asaas.com/api/v3 (sandbox) ou https://api.asaas.com/v3 (prod)
ASAAS_WEBHOOK_TOKEN=seu_token_aleatorio_aqui
```

### Passo 2.2 — Não fazer commit de `.env.local`

Verifique que `.env.local` está em `.gitignore`:

```bash
cat .gitignore | grep env.local
# Deve mostrar: .env.local
```

Se não estiver, adicione:

```bash
echo ".env.local" >> .gitignore
```

---

## 🚀 Fase 3: Build e Teste Local

### Passo 3.1 — Instalar dependências

```bash
cd C:\Users\Willian\ fraga\Documents\Sou\ Bilingue\soubilingue
npm install
```

### Passo 3.2 — Verificar tipos e build

```bash
# Verificar tipos TypeScript
npm run typecheck

# Fazer build de produção
npm run build
```

Ambos devem terminar sem erros.

### Passo 3.3 — Testar localmente

```bash
# Rodar servidor de produção local
NODE_ENV=production npm run start
```

Acesse http://localhost:3000 e teste:

1. ✅ Página pública `/` (vendas)
2. ✅ Login `/login`
3. ✅ Interface do aluno `/aluno` (após login)
4. ✅ Aula `/aluno/aula` (teste conversa com tutor)
5. ✅ Certificados `/aluno/certificados`

---

## 🌍 Fase 4: Deploy em Produção

### Opção A: Vercel (Recomendado para Next.js)

#### A.1 — Criar conta Vercel

1. Acesse https://vercel.com/signup
2. Faça login com GitHub/GitLab/Bitbucket
3. Conecte seu repositório

#### A.2 — Configurar variáveis de ambiente

1. No Vercel Dashboard, vá em **Settings > Environment Variables**
2. Adicione todas as variáveis de `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ANTHROPIC_API_KEY`
   - `ANTHROPIC_MODEL`
   - `CRON_SECRET`
   - `ASAAS_API_KEY`
   - `ASAAS_API_URL`
   - `ASAAS_WEBHOOK_TOKEN`

3. Clique em **Save**

#### A.3 — Deploy

1. Vá em **Deployments**
2. Clique em **Deploy**
3. Vercel fará build e deploy automaticamente

Seu site estará em: `https://soubilingue.vercel.app`

### Opção B: Railway (Alternativa simples)

#### B.1 — Conectar repositório

1. Acesse https://railway.app
2. Clique em "New Project > Deploy from GitHub repo"
3. Selecione seu repositório

#### B.2 — Configurar variáveis

1. Em **Variables**, adicione todas de `.env.local`
2. Railway fará o build automaticamente

#### B.3 — Usar domínio customizado

1. Em **Settings > Domain**, configure seu domínio
2. Aponte seu DNS para Railway

### Opção C: VPS Própria (DigitalOcean, AWS, etc)

#### C.1 — Provisionar servidor

```bash
# Exemplo DigitalOcean Droplet
- Ubuntu 22.04 LTS
- 2GB RAM, 50GB SSD
- SSH key configurada
```

#### C.2 — Setup do servidor

```bash
# 1. SSH no servidor
ssh root@seu_ip

# 2. Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Instalar PM2 (gerenciador de processos)
sudo npm install -g pm2

# 4. Clonar repositório
git clone https://github.com/seu-usuario/soubilingue.git
cd soubilingue

# 5. Instalar dependências
npm install

# 6. Configurar `.env.local`
nano .env.local
# Adicione todas as variáveis de ambiente

# 7. Build
npm run build

# 8. Iniciar com PM2
pm2 start "npm run start" --name soubilingue
pm2 startup
pm2 save
```

#### C.3 — Configurar Nginx (reverse proxy)

```bash
# Instalar Nginx
sudo apt-get install nginx

# Criar config
sudo nano /etc/nginx/sites-available/soubilingue
```

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/soubilingue /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# SSL com Let's Encrypt
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com
```

---

## 📧 Fase 5: Configurar Webhooks e Jobs

### Passo 5.1 — Webhook do Asaas (Pagamentos)

1. Acesse Asaas (sandbox ou produção)
2. Vá em **Integrações > Webhooks**
3. Configure:
   - **URL:** `https://seu-dominio.com/api/webhooks/asaas`
   - **Eventos:** "Pagamento recebido", "Pagamento falhou"
   - **Token:** Cole o valor de `ASAAS_WEBHOOK_TOKEN`

### Passo 5.2 — Webhook do Supabase (Autenticação)

O Supabase já envia eventos de auth automaticamente se necessário.
Neste projeto ainda não há webhooks de auth configurados.

### Passo 5.3 — Cron Job de Fechamento Mensal

Opção 1: **Vercel Cron**

No arquivo `vercel.json` (crie se não existir):

```json
{
  "crons": [{
    "path": "/api/jobs/fechamento-mensal",
    "schedule": "0 0 1 * *"
  }]
}
```

Opção 2: **n8n** (Workflow automation)

1. Configure n8n em seu servidor ou use n8n Cloud
2. Crie workflow que chama `/api/jobs/fechamento-mensal` todo dia 1º do mês
3. Passe header: `Authorization: Bearer {CRON_SECRET}`

Opção 3: **Cron manual** (Linux)

```bash
# Editar crontab
crontab -e

# Adicionar linha (1º dia do mês, 00:00)
0 0 1 * * curl -H "Authorization: Bearer $CRON_SECRET" https://seu-dominio.com/api/jobs/fechamento-mensal
```

---

## ✅ Fase 6: Validação e Testes

### Passo 6.1 — Checklist de produção

- ✅ TypeScript compile sem erros
- ✅ Todas as variáveis de env configuradas
- ✅ RLS ativo no Supabase (nenhuma tabela pública)
- ✅ HTTPS/SSL ativo em produção
- ✅ CORS configurado corretamente
- ✅ Backup do banco configurado (Supabase faz automaticamente)
- ✅ Logs e monitoring ativo
- ✅ Rate limiting em rotas de API (implementar se necessário)

### Passo 6.2 — Teste de fluxo completo

1. **Signup**: Acesse página de vendas → escolha plano → cadastre aluno
2. **Autenticação**: Faça login com a conta criada
3. **Aula**: Entre em `/aluno/aula` e teste conversa com tutor
4. **Certificado**: Simule 4 semanas completas (ou ajuste no banco) e valide geração
5. **Admin**: Acesse `/admin` com conta de super_admin e verifique relatórios

### Passo 6.3 — Monitoramento

Configure alertas para:
- Erros de API (500, timeout)
- Taxa de erro em /api/aula/chat
- Falhas de webhook do Asaas
- Uso de quota da Anthropic

Recomendado: **Sentry** (gratuito até certo limite)

```bash
# Instalar Sentry
npm install @sentry/nextjs

# Configurar em next.config.js
# Ver: https://docs.sentry.io/platforms/javascript/guides/nextjs/
```

---

## 🔐 Segurança

### Checklist de Segurança

- ✅ `.env.local` não foi commitado
- ✅ `SUPABASE_SERVICE_ROLE_KEY` não é `NEXT_PUBLIC_`
- ✅ RLS ativo em 100% das tabelas com `academy_id`
- ✅ Headers de segurança configurados (HSTS, CSP, X-Frame-Options)
- ✅ Rate limiting em rotas sensíveis (login, webhook, chat)
- ✅ Validação de CORS (apenas domínios conhecidos)
- ✅ Tokens de webhook (Asaas, Cron) aleatórios e seguros
- ✅ HTTPS/SSL obrigatório em produção
- ✅ Backup automático do banco de dados

---

## 📊 Monitoramento Pós-Deploy

### Métricas importantes

1. **Performance**
   - Tempo de resposta de `/api/aula/chat`
   - Taxa de erro em STT/TTS
   - Latência do banco de dados

2. **Negócio**
   - Cadastros por dia
   - Conversão (cadastro → primeiro pagamento)
   - Taxa de retenção (próximo mês)
   - Certificados gerados

3. **Operacional**
   - Uptime (objetivo: 99.5%+)
   - Taxa de erro de webhook Asaas
   - Taxa de erro de autenticação
   - Uso de quota Anthropic

### Ferramentas recomendadas

- **Vercel Analytics** (incluído se usar Vercel)
- **Supabase Logs** (authentication, database, edge functions)
- **Sentry** (error tracking)
- **LogRocket** (session replay — opcional)
- **Hotjar** (user behavior — opcional)

---

## 🚨 Troubleshooting

### "Erro ao conectar ao Supabase"

```
Verificar:
1. NEXT_PUBLIC_SUPABASE_URL e ANON_KEY estão corretos?
2. Supabase project está ativo (não suspenso)?
3. Firewall/rede permite conexão com Supabase?
4. RLS não está bloqueando a conexão?
```

### "Tutor não responde"

```
Verificar:
1. ANTHROPIC_API_KEY é válido?
2. Quota da Anthropic não foi excedida?
3. Network request foi enviado corretamente? (verificar DevTools)
4. Banco retorna dados do tutor? (verificar logs)
```

### "Webhook do Asaas não chama API"

```
Verificar:
1. URL do webhook está correta? (incluir /api/webhooks/asaas)
2. ASAAS_WEBHOOK_TOKEN está no header?
3. Servidor está respondendo com 200 OK?
4. Logs do Asaas mostram sucesso? (painel Asaas > Webhooks)
```

### "RLS bloqueando acesso"

```
Verificar:
1. auth.uid() retorna usuário correto?
2. academy_id no JWT corresponde à academia do usuário?
3. Policy está usando app.can_read() / app.can_manage()?
4. requireAcademyContext() foi chamado antes de acessar dados?
```

---

## 📞 Suporte

Se tiver dúvidas durante o deployment:

1. Consulte `CLAUDE.md` para regras técnicas
2. Consulte `ESCOPO.md` para arquitetura de features
3. Verifique logs do servidor (Vercel, Railway, VPS)
4. Use Supabase Console para debugging de banco
5. Teste webhooks com **Webhook.cool** ou **Postman**

---

**Versão:** 1.0  
**Última atualização:** 22 de agosto de 2026  
**Status:** Pronto para produção ✅
