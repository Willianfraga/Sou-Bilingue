# Fase 2.3 — Recargas de Horas (Hour Topups) ✅

**Data de implementação:** 22 de agosto de 2026  
**Status:** Implementada (sem testes em banco real ainda)

## Resumo

A Fase 2.3 permite que alunos **comprem horas extras** quando ficam sem saldo:

- Seleção de pacotes (5, 10, 20 horas)
- Cálculo automático de preço (configurável)
- Checkout via Asaas (PIX/Boleto/Cartão)
- Webhook confirma pagamento
- Horas creditadas instantaneamente
- Histórico de recargas
- Expiração automática (1 ano)

## Arquitetura

### 1. **Backend** (`src/lib/billing/topups.ts`)

**Funções principais:**

```typescript
// Configuração
TOPUP_PACKAGES[]                    // [5h, 10h, 20h]
getTopupUnitPrice()                 // R$ 9.90/h (configurável)

// Operações
createHourTopup(alunoId, horas, email, nome)
  ├─ Valida quantidade (múltiplo de 5)
  ├─ Busca assinatura ativa
  ├─ Calcula preço
  ├─ Cria topup (pending)
  ├─ Cria customer/invoice no Asaas
  └─ Retorna checkoutUrl

confirmTopupPayment(topupId, paymentId)
  ├─ Atualiza status → 'ativa'
  ├─ Registra em usage_ledger (tipo: 'recarga')
  └─ horas_restantes recalculado

getActiveTopups(alunoId)            // Topups não expirados
getTopupHistory(alunoId, limit)     // Histórico completo
expireOldTopups()                   // Job diário (n8n)
```

### 2. **Server Actions** (`src/app/aluno/topups/actions.ts`)

```typescript
getTopupPackagesAction()            // Lista pacotes
startTopupAction(horas)             // Inicia recarga
confirmTopupPaymentAction()         // Webhook (interno)
getActiveTopupsAction()             // Fetch ativos
getTopupHistoryAction(limit)        // Fetch histórico
```

### 3. **Componente UI** (`src/components/aluno/TopupSelector.tsx`)

Grid de pacotes interativo:
- Seleção visual (checkmark + highlight)
- Exibição de preço (R$ configurável)
- Botão "Continuar para Pagamento"
- Descrição de cada pacote
- Info box explicativo

### 4. **Banco de Dados** (Migration `0006_fase23_hour_topups.sql`)

**Tabela `hour_topups` (já existe, ajustada):**
```sql
id              UUID PK
aluno_id        UUID FK → alunos
subscription_id UUID FK → subscriptions
horas           INT (5, 10, 20, ...)
valor           DECIMAL (preço total)
valor_unitario  DECIMAL (R$ por hora)
status          'pending' | 'ativa' | 'utilizada' | 'expirada'
payment_id      UUID FK → payments
asaas_invoice_id VARCHAR (novo)
expira_em       DATE (1 ano padrão)
criada_em       TIMESTAMPTZ
```

**Novas funções SQL:**
- `process_topup_payment(topup_id, payment_id)` — Webhook
- `expire_old_topups()` — Job diário

**Nova view:**
- `v_aluno_topups_ativos` — Resumo por aluno

## Fluxo de uma recarga

```
ALUNO CLICA "RECARREGAR HORAS"
  ↓
TopupSelector exibe 3 pacotes
  ├─ 5h (R$ 49.50)
  ├─ 10h (R$ 99.00) ← melhor valor
  └─ 20h (R$ 198.00) ← maior economia
  ↓
Aluno seleciona 10h
  ↓
Clica "Continuar para Pagamento"
  → startTopupAction(10)
    ├─ Valida auth
    ├─ Busca assinatura ativa
    ├─ Calcula: 10h × R$ 9.90 = R$ 99.00
    ├─ INSERT hour_topups (status='pending')
    ├─ Cria invoice no Asaas
    └─ Gera checkoutUrl
  ↓
Browser redireciona para Asaas
  ↓
Aluno paga via PIX/Boleto/Cartão
  ↓
Asaas dispara webhook POST /api/webhooks/asaas
  ├─ Valida HMAC SHA-256
  ├─ Evento: payment.confirmed
  ├─ Busca topup_id associado
  └─ process_topup_payment(topup_id, payment_id)
    ├─ UPDATE hour_topups (status='ativa')
    ├─ INSERT em usage_ledger (tipo='recarga')
    └─ horas_restantes recalcula (GENERATED ALWAYS)
  ↓
Aluno retorna ao app
  ↓
HourUsageTracker atualiza
  └─ horas_restantes agora 8 + 10 = 18h
  └─ Oferece novo "Começar Conversação"
  ↓
[Dias depois: expira_em passa]
  ↓
n8n job diário chama expire_old_topups()
  └─ Topups com expira_em < hoje → status='expirada'
```

## Configuração

### Preço por hora

**Padrão:** R$ 9.90/h

**Alterar via SQL:**
```sql
UPDATE billing_config 
SET valor = '15.00' 
WHERE chave = 'preco_recarga_por_hora';
```

**Ou via Admin UI (Fase 3.1):**
```
Admin → Configurações → Preço de Recarga
```

### Pacotes

**Padrão:**
- 5 horas → R$ 49.50
- 10 horas → R$ 99.00 (10% desconto)
- 20 horas → R$ 198.00 (10% desconto)

**Customizar** em `src/lib/billing/topups.ts`:
```typescript
export const TOPUP_PACKAGES: TopupPackage[] = [
  { horas: 5, descricao: "5 horas de conversação" },
  { horas: 10, descricao: "10 horas (melhor valor)" },
  { horas: 20, descricao: "20 horas (maior economia)" },
  // Adicionar mais conforme necessário
];
```

### Validade de topup

**Padrão:** 1 ano (`365 * 24 * 60 * 60 * 1000` ms)

**Alterar:**
```typescript
// em createHourTopup()
expira_em: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) // 6 meses
```

## Integração com Webhook

**POST `/api/webhooks/asaas` — novo evento:**

```typescript
if (event === "payment.confirmed") {
  // ... código existente ...

  // Buscar topup por payment_id
  const { data: topup } = await supabase
    .from("hour_topups")
    .select("id")
    .eq("asaas_payment_id", paymentId)
    .single();

  if (topup) {
    // Processar topup
    await confirmTopupPaymentAction(topup.id, paymentId);
  }
}
```

## Integração com N8N

**Workflow necessário (diário):**

1. **Trigger:** 02:00 AM todos os dias
2. **Ação:** `SELECT expire_old_topups()`
3. **Log:** Registrar `expired_count`

**SQL:**
```sql
SELECT * FROM public.expire_old_topups();
```

## Exemplos de uso

### Integrar no HourUsageTracker

```typescript
import { TopupSelector } from "@/components/aluno/TopupSelector";

// Quando horas_restantes < 1
{horasRestantes < 1 && (
  <TopupSelector
    onSuccess={(url) => {
      console.log("Redirecionando para checkout:", url);
    }}
    onError={(error) => {
      setError(error);
    }}
  />
)}
```

### Botão em qualquer lugar

```typescript
function MinhaTelaDeAluno() {
  const [showTopup, setShowTopup] = useState(false);

  return (
    <>
      <button onClick={() => setShowTopup(true)}>
        Recarregar Horas
      </button>

      {showTopup && (
        <Modal onClose={() => setShowTopup(false)}>
          <TopupSelector
            onSuccess={(url) => window.location.href = url}
          />
        </Modal>
      )}
    </>
  );
}
```

## Testes locais

```bash
# 1. Aplicar migration
supabase db push

# 2. Testar criação de topup
supabase functions call confirm_topup_payment --data '{
  "topup_id": "uuid-aqui",
  "payment_id": "asaas-payment-id"
}'

# 3. Verificar horas creditadas
SELECT * FROM usage_ledger 
WHERE tipo = 'recarga' 
ORDER BY criada_em DESC LIMIT 5;

# 4. Verificar topup ativo
SELECT * FROM hour_topups 
WHERE aluno_id = 'user-id' 
AND status = 'ativa';

# 5. Expirar topups manuais (teste)
SELECT * FROM expire_old_topups();
```

## Segurança

✅ Validações:
- Quantidade deve ser múltiplo de 5
- Assinatura deve estar ativa
- Aluno autenticado (requireSessao)

✅ RLS:
- Aluno vê apenas seus topups
- Webhook usa service_role
- UPDATE restrito aos fields necessários

✅ Webhook:
- HMAC SHA-256 validado
- Idempotência via upsert
- Retry-safe (retorna 200 em erro)

## Pendências para Fase 3

- [ ] Admin UI para gerenciar preços
- [ ] Cupons/vouchers de desconto
- [ ] Histórico visual com gráficos
- [ ] Notificação push ao créditar horas
- [ ] Relatório mensal de gastos

## Documentação técnica

- `src/lib/billing/topups.ts` — Backend completo
- `src/app/aluno/topups/actions.ts` — Server Actions
- `src/components/aluno/TopupSelector.tsx` — UI
- `supabase/migrations/0006_fase23_hour_topups.sql` — Database

---

**Fase 2.3 implementada e pronta para testes! 🚀**
