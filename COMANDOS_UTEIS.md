# Sou Bilingue — Comandos Úteis

## 🚀 Desenvolvimento

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Compilar TypeScript (sem gerar output)
npm run typecheck

# Build de produção
npm run build

# Testar (se houver testes)
npm test
```

## 🗄️ Banco de Dados (Supabase)

```bash
# Visualizar migrations
supabase migration list

# Aplicar migrations ao banco real
supabase db push

# Puxar schema remoto
supabase db pull

# Criar nova migration
supabase migration create <nome_migration>

# Revert último migration
supabase db reset
```

## 🔧 Verificação & Build

```bash
# Verificar tipos TypeScript
npm run typecheck

# Build de produção
npm run build

# Analisar bundle size
npm run build -- --analyze
```

## 📦 Git & Deploy

```bash
# Adicionar todas as mudanças
git add .

# Commit com mensagem
git commit -m "Fases 1, 2, 2.3, 2.4, 2.4.1, 2.5, 3 - Completo"

# Push para main
git push origin main

# Ver status
git status

# Ver log
git log --oneline -10
```

## 🌐 Vercel Deploy

```bash
# Deploy automático ao push para main
# Acesse: https://vercel.com/dashboard

# Logs em tempo real
vercel logs

# Preview deployment
vercel --prod
```

## 📊 Monitoramento

```bash
# Ver logs do servidor local
npm run dev

# Ver performance durante build
npm run build

# Analisar bundle
npm run build -- --analyze
```

## 🔐 Variáveis de Ambiente

**`.env.local` (desenvolvimento):**

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
ASAAS_API_KEY=sk_xxx (sandbox)
ASAAS_WEBHOOK_TOKEN=webhook_xxx
```

**`.env.production` (produção):**

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
ASAAS_API_KEY=sk_xxx (produção)
ASAAS_WEBHOOK_TOKEN=webhook_xxx
NODE_ENV=production
```

## 🧪 Testes Manuais

```bash
# Testar checkout
# 1. Acesse http://localhost:3000/checkout
# 2. Selecione um plano
# 3. Clique em checkout
# 4. Confirme no Asaas (sandbox)
# 5. Webhook deve processar pagamento

# Testar sessão
# 1. Acesse http://localhost:3000/aluno/aula
# 2. Clique "Começar sessão"
# 3. Veja timer contar
# 4. Observe alertas em 15min e <5min
# 5. Clique "Encerrar"

# Testar dashboard
# 1. Acesse http://localhost:3000/aluno/dashboard
# 2. Veja cards com estatísticas
# 3. Veja gráficos carregarem
# 4. Clique nos filtros de período

# Testar admin
# 1. Acesse http://localhost:3000/admin/dashboard
# 2. Veja statistics
# 3. Teste editar preço de plano
# 4. Clique "Ver detalhes" de um aluno
```

## 🐛 Debugging

```bash
# Logs do Supabase no console do browser
# F12 > Console

# Logs da API
# Veja servidor terminal (npm run dev)

# Logs SQL (Supabase)
# Dashboard > Logs

# Ver variáveis de ambiente
console.log(process.env)

# Debugger Node.js
node --inspect-brk node_modules/.bin/next dev
# Acesse: chrome://inspect
```

## 📈 Performance

```bash
# Lighthouse score (Chrome DevTools)
# F12 > Lighthouse > Analyze page load

# Core Web Vitals
# Lighthouse > Metrics

# Bundle size
npm run build
# Ver output na terminal
```

## 🚨 Troubleshooting

**Erro: "Module not found"**
```bash
rm -rf node_modules package-lock.json
npm install
npm run typecheck
```

**Erro: "SUPABASE_SERVICE_ROLE_KEY is missing"**
```bash
# Verificar .env.local
# Certifique-se que .env.local está no .gitignore
```

**Build falha com TypeScript errors**
```bash
npm run typecheck
# Veja lista de erros
# Corrija os tipos
```

**Webhook não processa pagamento**
```bash
# 1. Verifique ASAAS_WEBHOOK_TOKEN
# 2. Teste webhook no Asaas dashboard
# 3. Veja logs: npm run dev
# 4. Verifique RLS na tabela payments
```

## 📚 Documentação

Leia os arquivos em `docs/`:

```
docs/
├── FASE1_COMPLETO.md
├── FASE2_RASTREAMENTO_HORAS.md
├── FASE23_RECARGAS_HORAS.md
├── FASE24_DASHBOARD.md
├── FASE24_1_GRAFICOS_INTERATIVOS.md
├── FASE25_EXPORTACAO_DADOS.md
└── FASE3_ADMIN_DASHBOARD.md
```

## 💻 Estrutura de Pastas

```
src/
├── app/           # Rotas Next.js
├── lib/           # Funções reutilizáveis
├── components/    # React components
├── hooks/         # Custom hooks
└── ...

docs/             # Documentação
supabase/         # Migrations SQL
```

## 🔗 Links Úteis

- **Local:** http://localhost:3000
- **Admin:** http://localhost:3000/admin/dashboard
- **Checkout:** http://localhost:3000/checkout
- **Dashboard aluno:** http://localhost:3000/aluno/dashboard
- **Supabase:** https://supabase.com
- **Asaas:** https://sandbox.asaas.com (sandbox)
- **Vercel:** https://vercel.com

## 📞 Stack

| Ferramenta | Versão | Uso |
|-----------|--------|-----|
| Node.js | 18+ | Runtime |
| npm | 8+ | Package manager |
| Next.js | 15 | Framework |
| React | 19 | UI |
| TypeScript | 5 | Tipos |
| Tailwind | 3 | Styling |
| Supabase | - | Database |
| PostgreSQL | 15 | DB |
| Asaas | - | Payments |
| Chart.js | 4 | Gráficos |
| jsPDF | 2 | PDF generation |

## ✅ Pre-deployment Checklist

```bash
# 1. Testar localmente
npm run dev
# Testar checkout, sessão, dashboard, admin

# 2. Build production
npm run build
npm run typecheck

# 3. Aplicar migrations
supabase db push

# 4. Configurar env produção
# .env.production com credenciais reais

# 5. Deploy Vercel
git push origin main

# 6. Verificar logs
vercel logs

# 7. Teste end-to-end
# Fazer uma compra real
# Verificar webhook
# Verificar dashboard
```

---

**Para mais informações, veja os arquivos de documentação em `docs/`** 📖
