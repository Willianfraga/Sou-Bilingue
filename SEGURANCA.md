# 🔒 Segurança — Sou Bilingue

**Data:** 22 de agosto de 2026  
**Versão:** 1.0  
**Status:** ✅ Implementado

---

## 📋 Checklist de Segurança

- [x] RLS em todas as tabelas
- [x] HMAC SHA-256 em webhooks
- [x] Validação de autenticação (requireSessao)
- [x] Isolamento de dados por aluno
- [x] Soft delete em históricos
- [x] Sem dados sensíveis no browser
- [x] `.env` no .gitignore
- [x] Service Role Key só no servidor

---

## 🛡️ RLS (Row Level Security)

### O que é RLS?

RLS é uma política de segurança no Supabase que garante que um usuário **NUNCA** acesse dados de outro usuário, mesmo que tente contornar a interface.

### Tabelas Protegidas

| Tabela | RLS | Policy | Descrição |
|--------|-----|--------|-----------|
| `profiles` | ✅ | Usuário vê só a si mesmo | Dados pessoais |
| `subscriptions` | ✅ | Aluno vê só suas assinaturas | Assinaturas ativas |
| `usage_sessions` | ✅ | Aluno vê só suas sessões | Histórico de uso |
| `usage_ledger` | ✅ | Aluno vê só seu consumo | Consumo de horas |
| `payments` | ✅ | Aluno vê só seus pagamentos | Histórico financeiro |
| `hour_topups` | ✅ | Aluno vê só seus topups | Recargas |
| `billing_config` | ✅ | Só admin pode ver | Configurações |

### Exemplo de RLS Policy

```sql
-- Aluno vê só suas sessões
CREATE POLICY "aluno_read_sessions" ON usage_sessions
  FOR SELECT
  USING (auth.uid() = aluno_id);

-- Aluno não pode deletar sessões
CREATE POLICY "prevent_delete_sessions" ON usage_sessions
  FOR DELETE
  USING (false);
```

### Testar RLS

```bash
# 1. Acesse como aluno A
# 2. Tente ver dados de aluno B via console do browser
fetch('https://xxx.supabase.co/rest/v1/usage_sessions?aluno_id=eq.aluno_b_id')
# Resultado: 0 linhas (RLS bloqueou)

# 3. Tente ver seus próprios dados
fetch('https://xxx.supabase.co/rest/v1/usage_sessions?aluno_id=eq.seu_id')
# Resultado: Suas sessões (RLS permitiu)
```

---

## 🔑 Autenticação

### Guards (Validação)

Todas as Server Actions usam `requireSessao()`:

```typescript
import { requireSessao } from "@/lib/auth/guards";

export async function minhaAction() {
  const { user } = await requireSessao();
  // user agora é validado e seguro
}
```

### Tipos de Autenticação

| Guard | Uso | Validação |
|-------|-----|-----------|
| `requireSessao()` | Server Actions | Usuário logado |
| `requireAdmin()` | Admin actions | Super admin |
| `requireAcademyAccess()` | Academia Flow | Acesso à academia |

---

## 🔐 Webhooks (HMAC SHA-256)

### Por que HMAC?

HMAC garante que **apenas o Asaas pode enviar webhooks** para a sua aplicação.

### Validação de Webhook

```typescript
// src/app/api/webhooks/asaas/route.ts
import { validateWebhookSignature } from "@/lib/asaas/client";

export async function POST(request: Request) {
  const signature = request.headers.get("asaas-webhook-token");
  const body = await request.text();

  // ✅ Valida se o webhook veio realmente do Asaas
  if (!validateWebhookSignature(body, signature)) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Processar webhook seguramente
}
```

### Token do Webhook

Em `.env.local`:
```env
ASAAS_WEBHOOK_TOKEN=webhook_xxx
```

⚠️ **NUNCA** publicar este token!

---

## 💰 Pagamentos

### Trava Anti-Duplicidade

**Problema:** Se um webhook for processado 2x, o aluno é cobrado 2x!

**Solução:** Constraint UNIQUE no banco:

```sql
ALTER TABLE billing_dispatches
ADD CONSTRAINT unique_invoice_stage 
UNIQUE(invoice_id, stage);
```

**Como funciona:**

```typescript
// Primeira execução
INSERT INTO billing_dispatches (invoice_id, stage) 
VALUES ('inv_123', 'payment_confirmed');
// ✅ Sucesso

// Segunda execução (webhook retentado)
INSERT INTO billing_dispatches (invoice_id, stage) 
VALUES ('inv_123', 'payment_confirmed');
// ❌ Erro: Violação de constraint
// Nenhuma cobrança duplicada!
```

### Nunca Enviar Direto

⚠️ **ERRADO:**
```typescript
// Enviando pagamento sem passar pela trava
const invoice = await asaas.createInvoice(...);
// Risco: Duplicidade se webhook reentrar
```

✅ **CORRETO:**
```typescript
// Sempre usar dispatchBillingMessage()
await dispatchBillingMessage(invoiceId, 'payment_confirmed');
// Garante: Idempotência 100%
```

---

## 🔒 Dados Sensíveis

### O que NÃO vai no Browser

❌ **NUNCA:**
- ASAAS_API_KEY
- SUPABASE_SERVICE_ROLE_KEY
- Senhas
- Tokens privados

✅ **OK no Browser:**
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- User ID (auth.uid())

### Verificar Variáveis

```javascript
// No console do browser
console.log(process.env)

// Se vir SUPABASE_SERVICE_ROLE_KEY → PROBLEMA!
// Contém prefixo NEXT_PUBLIC_ → PROBLEMA!
```

---

## 📝 Soft Delete

Históricos financeiros **nunca** são deletados:

```typescript
// Não permitido
DELETE FROM invoices WHERE id = 'inv_123';
// ❌ Constraint: on delete restrict

// Permitido: Marcar como deletado
UPDATE invoices 
SET deleted_at = now() 
WHERE id = 'inv_123';
// ✅ Mantém histórico, esconde visualmente
```

---

## 🚨 Checklist Pré-Deploy

Antes de fazer deploy em PRODUÇÃO:

- [ ] `.env.production` criado (não versionado)
- [ ] ASAAS_API_KEY é da **produção** (não sandbox)
- [ ] ASAAS_WEBHOOK_TOKEN é **único** e forte
- [ ] SUPABASE_SERVICE_ROLE_KEY não tem prefixo `NEXT_PUBLIC_`
- [ ] RLS policies aplicadas em produção
- [ ] Webhook URL é **https** (não http)
- [ ] Teste: Fazer uma compra real
- [ ] Teste: Webhook processa corretamente
- [ ] Teste: RLS bloqueia aluno B acessando aluno A

---

## 🔍 Monitoramento

### Verificar Segurança

```bash
# 1. Verificar RLS ativa
supabase db pull
# Procure: "create policy" em todos os arquivos

# 2. Ver policies no Supabase
supabase roles list

# 3. Testar webhook
curl -X POST http://localhost:3000/api/webhooks/asaas \
  -H "asaas-webhook-token: seu_token" \
  -H "Content-Type: application/json" \
  -d '{"event":"payment.confirmed"}'
```

### Logs de Auditoria

```sql
-- Ver quem fez o quê (future feature)
SELECT * FROM audit_logs 
WHERE table_name = 'invoices'
ORDER BY created_at DESC;
```

---

## 🆘 Segurança Descoberta

Se encontrar um problema de segurança:

1. **PARE** a aplicação
2. **NÃO** cometa o código no Git
3. **REVOGUE** chaves comprometidas imediatamente
4. **NOTIFIQUE** o time
5. **CORREÇÃO** em branch separado

### Revogar Chaves

**Asaas:**
```
Dashboard → Configurações → API Keys → Revogar
```

**Supabase:**
```
Dashboard → Project → Settings → API → Regenerate anon/service role keys
```

---

## 📚 Leitura Adicional

- Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security
- HMAC SHA-256: https://pt.wikipedia.org/wiki/HMAC
- OWASP Top 10: https://owasp.org/www-project-top-ten/

---

**Versão:** 1.0  
**Data:** 22/08/2026  
**Status:** ✅ Documentação Completa
