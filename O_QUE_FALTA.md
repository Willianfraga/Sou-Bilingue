# ✅ O que Falta Fazer — Sou Bilingue

**Data:** 22 de agosto de 2026  
**Status:** Projeto pronto, faltam testes e deploy

---

## 📊 Sumário Rápido

| Categoria | Status | Ação |
|-----------|--------|------|
| **Desenvolvimento** | ✅ 100% | Pronto |
| **Compilação** | ✅ 100% | Pronto |
| **Build** | ✅ 100% | Pronto |
| **Documentação** | ✅ 100% | Pronto |
| **Testes** | ⚠️ 0% | ❌ TODO |
| **Banco Real** | ❌ Não testado | ❌ TODO |
| **Asaas Real** | ❌ Sandbox | ❌ TODO |
| **Deploy** | ⚠️ Pronto | ❌ TODO |

---

## 🎯 PRIORIDADE 1: Executar Agora (30 min)

### ✅ 1. Testar Build Localmente

```bash
npm run build
npm run typecheck
# ✅ Ambos 100% sucesso
```

**Status:** ✅ JÁ FEITO

---

## 🎯 PRIORIDADE 2: Testes Locais (1-2 horas)

### ❌ 1. Testar Checkout

**O que testar:**
- [ ] Acessar `/checkout`
- [ ] Selecionar um plano
- [ ] Ver redirecionamento para Asaas (sandbox)
- [ ] Completar pagamento fake
- [ ] Ver webhook processar
- [ ] Dashboard atualizar com nova assinatura

**Onde testa:**
```
http://localhost:3000/checkout
```

**O que espera:**
- Checkout funciona
- Webhook recebe confirmação
- Subscription ativa no banco

---

### ❌ 2. Testar Sessão (Timer)

**O que testar:**
- [ ] Acessar `/aluno/aula`
- [ ] Clicar "Começar Sessão"
- [ ] Ver timer contar (1s)
- [ ] Esperar 15 minutos → Ver alerta 🟡
- [ ] Ou esperar < 5 minutos → Ver alerta 🔴
- [ ] Clicar "Encerrar"
- [ ] Ver horas debitadas

**Onde testa:**
```
http://localhost:3000/aluno/aula
```

**O que espera:**
- Timer funciona
- Alertas aparecem
- Horas debitadas corretamente

---

### ❌ 3. Testar Dashboard

**O que testar:**
- [ ] Acessar `/aluno/dashboard`
- [ ] Ver 4 cards com stats
- [ ] Ver gráficos Chart.js carregarem
- [ ] Clicar em filtros (semana/mês/etc)
- [ ] Testar exportação CSV
- [ ] Testar exportação PDF

**Onde testa:**
```
http://localhost:3000/aluno/dashboard
```

**O que espera:**
- Dados carregam rápido
- Gráficos renderizam
- Exportação funciona

---

### ❌ 4. Testar Admin

**O que testar:**
- [ ] Acessar `/admin/dashboard` (como super_admin)
- [ ] Ver estatísticas gerais
- [ ] Clicar "Editar" em um plano
- [ ] Mudar preço
- [ ] Salvar
- [ ] Clique "Ver detalhes" de um aluno
- [ ] Ver modal com dados

**Onde testa:**
```
http://localhost:3000/admin/dashboard
```

**O que espera:**
- Admin dashboard funciona
- Edição de preços funciona
- Modal de aluno funciona

---

### ❌ 5. Testar Topups

**O que testar:**
- [ ] Acessar `/aluno/topups`
- [ ] Selecionar um pacote (5h, 10h, 20h)
- [ ] Ir para checkout
- [ ] Completar pagamento
- [ ] Ver horas creditadas
- [ ] Ver no dashboard que horas aumentaram

**Onde testa:**
```
http://localhost:3000/aluno/topups
```

**O que espera:**
- Topup checkout funciona
- Horas creditadas
- Dashboard atualiza

---

## 🎯 PRIORIDADE 3: Banco de Dados Real (2-3 horas)

### ❌ 1. Criar Supabase Project Real

**Passos:**
1. Acesse: https://supabase.com
2. Faça login ou crie conta
3. Criar novo projeto
4. Copiar credenciais:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

**Tempo:** 5 min

---

### ❌ 2. Aplicar Migrations

```bash
# Configure Supabase CLI
supabase init

# Aplicar migrations
supabase db push

# Verificar
supabase db pull
```

**Tempo:** 10 min

**Verificar:**
- [ ] 4 migrations aplicadas
- [ ] 7 tabelas criadas
- [ ] RLS policies ativas

---

### ❌ 3. Atualizar .env.local

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
ASAAS_API_KEY=sk_test_xxx
ASAAS_WEBHOOK_TOKEN=webhook_xxx
```

**Tempo:** 5 min

---

### ❌ 4. Testar Banco Real

```bash
npm run dev

# No browser, testar:
# 1. Criar subscription
# 2. Ver dados em https://supabase.com/dashboard
# 3. Webhook processar (verificar em logs)
```

**Tempo:** 20 min

---

## 🎯 PRIORIDADE 4: Asaas Real (1-2 horas)

### ❌ 1. Criar Conta Asaas Produção

**Passos:**
1. Acesse: https://asaas.com
2. Criar conta (produção, não sandbox)
3. Ir para: Configurações → API
4. Copiar chaves:
   - API Key (produção)
   - Webhook token

**⚠️ ATENÇÃO:**
- Webhook token do sandbox é diferente de produção!
- Configure webhook URL em Asaas dashboard

**Tempo:** 15 min

---

### ❌ 2. Atualizar Credenciais

Criar `.env.production`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
ASAAS_API_KEY=sk_live_xxx    ← PRODUÇÃO!
ASAAS_WEBHOOK_TOKEN=webhook_xxx_produção
```

**⚠️ NUNCA VERSIONE .env.production**

Verificar `.gitignore`:
```
.env
.env.local
.env.production
.env.*.local
```

**Tempo:** 10 min

---

### ❌ 3. Configurar Webhook em Asaas

**Passos:**
1. Acesse: https://asaas.com/dashboard
2. Ir para: Integrações → Webhooks
3. Adicionar webhook:
   - **URL:** `https://seu-dominio.com/api/webhooks/asaas`
   - **Token:** Seu webhook token
   - **Eventos:** Selecionar todos

**Tempo:** 10 min

---

### ❌ 4. Testar Pagamento Real

1. Fazer uma compra real (R$ 0.01 é OK para teste)
2. Completar pagamento
3. Verificar:
   - Webhook processa em logs
   - Subscription ativa no banco
   - Dashboard atualiza

**Tempo:** 15 min

---

## 🎯 PRIORIDADE 5: Deploy (1-2 horas)

### ❌ 1. Criar Conta Vercel

**Passos:**
1. Acesse: https://vercel.com
2. Sign up com GitHub (recomendado)
3. Autorizar Vercel

**Tempo:** 5 min

---

### ❌ 2. Conectar GitHub

```bash
# Fazer commit e push
git add .
git commit -m "Pronto para deploy"
git push origin main
```

**Tempo:** 5 min

---

### ❌ 3. Deploy Automático

**Passos:**
1. Acesse: https://vercel.com/new
2. Importar projeto (GitHub)
3. Selecionar repo `soubilingue`
4. Framework: Next.js (auto-detectado)
5. Clicar "Deploy"

**Tempo:** 5 min

---

### ❌ 4. Configurar Variáveis

No Vercel Dashboard:
1. Project → Settings → Environment Variables
2. Adicionar:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ASAAS_API_KEY`
   - `ASAAS_WEBHOOK_TOKEN`

3. Clicar "Save"
4. Vercel auto-redeploy

**Tempo:** 10 min

---

### ❌ 5. Testar em Produção

```
https://seu-projeto.vercel.app
```

**Testar:**
- [ ] Checkout funciona
- [ ] Dashboard carrega
- [ ] Admin funciona
- [ ] Exportação funciona
- [ ] Webhook processa

**Tempo:** 20 min

---

## 🎯 PRIORIDADE 6: Otimizações (Optional)

### ⚠️ 1. n8n Workflows (Automação)

**O que fazer:**
- [ ] Criar workflow para auto-encerramento de sessões
- [ ] Criar workflow para expiração de topups
- [ ] Criar workflow para email de relatório

**Referência:** `docs/FASE24_1_GRAFICOS_INTERATIVOS.md` → "Próximas Fases"

**Tempo:** 2-3 horas (opcional)

---

### ⚠️ 2. Firebase Cloud Messaging (Push)

**O que fazer:**
- [ ] Configurar FCM
- [ ] Implementar push notifications
- [ ] Alertar quando < 5 minutos de horas

**Tempo:** 2-3 horas (opcional)

---

### ⚠️ 3. Testes Automatizados

**O que fazer:**
- [ ] Testes unitários (Jest)
- [ ] Testes E2E (Playwright)
- [ ] Testes de integração

**Tempo:** 4-5 horas (opcional)

---

## 📋 CHECKLIST COMPLETO

### Desenvolvimento (✅ PRONTO)
- [x] 7 fases implementadas
- [x] 11000+ linhas de código
- [x] 0 erros TypeScript
- [x] Build 100% sucesso
- [x] 14 arquivos de documentação

### Testes Locais (❌ TODO - 1-2 horas)
- [ ] Checkout funciona
- [ ] Sessão funciona
- [ ] Dashboard funciona
- [ ] Admin funciona
- [ ] Topups funciona

### Banco de Dados (❌ TODO - 2-3 horas)
- [ ] Supabase project criado
- [ ] Migrations aplicadas
- [ ] RLS ativa
- [ ] Webhook configurado

### Asaas Produção (❌ TODO - 1-2 horas)
- [ ] Conta Asaas criada
- [ ] Credenciais obtidas
- [ ] Webhook configurado
- [ ] Teste pagamento real

### Deploy (❌ TODO - 1-2 horas)
- [ ] Vercel account criado
- [ ] GitHub conectado
- [ ] Projeto deployado
- [ ] Variáveis configuradas
- [ ] Teste em produção

### Total: 5-12 horas

---

## 🚀 Plano de Ação Recomendado

### Semana 1
**Seg-Ter:** Testes locais (2 horas)
**Qua-Qui:** Banco de dados real (3 horas)
**Sex:** Deploy + Asaas produção (3 horas)

### Semana 2
**Seg-Ter:** Testes em produção (2 horas)
**Qua-Fri:** Otimizações e melhorias (3-5 horas)

---

## 📞 Suporte

**Dúvidas durante testes?**
1. Leia: `COMANDOS_UTEIS.md` → Troubleshooting
2. Leia: `SEGURANCA.md` → Webhooks
3. Leia: `ARQUITETURA.md` → Fluxos

---

## ✅ Resumo

| Tarefa | Tempo | Status |
|--------|-------|--------|
| Testes locais | 1-2 h | ❌ TODO |
| Banco real | 2-3 h | ❌ TODO |
| Asaas real | 1-2 h | ❌ TODO |
| Deploy | 1-2 h | ❌ TODO |
| **TOTAL** | **5-9 h** | **❌ TODO** |

**Código:** ✅ 100% pronto  
**Documentação:** ✅ 100% pronta  
**Testes & Deploy:** ❌ 0% (mas guia completo fornecido)

---

**Você tem TUDO o que precisa para completar estas tarefas!** 🚀

Próximo passo: Abra `COMANDOS_UTEIS.md` e comece os testes locais.

---

**Versão:** 1.0  
**Data:** 22/08/2026  
**Status:** ✅ Roadmap Completo
