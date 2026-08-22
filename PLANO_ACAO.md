# 🚀 PLANO DE AÇÃO IMEDIATO — SOU BILÍNGUE

**Iniciado:** 22 de agosto de 2026  
**Objetivo:** Levar projeto de 40% para 100% funcional  
**Prazo MVP:** 14 dias  
**Prazo Completo:** 60 dias

---

## 📌 VISÃO GERAL

O projeto tem uma base sólida (chat, IA, auth, mobile). Faltam:

1. **Crítico (P0):** Pagamentos, controle de horas, planos
2. **Alto (P1):** Memória, dashboard admin, teste gratuito
3. **Importante (P2):** Gamificação, vocabulário, relatórios
4. **Melhorias (P3):** Design premium, automações

---

## 🎯 FASE 1: PAGAMENTOS & HORAS (Dias 1-3)

### 1.1 Setup Asaas

**Status:** ❌ Não iniciado  
**Responsável:** Claude Code  
**Tempo:** 4 horas

**Tarefas:**
```
[ ] Criar conta sandbox Asaas
[ ] Obter credenciais API
[ ] Armazenar em .env.local
[ ] Criar helper functions
[ ] Implementar checkout flow
```

**Arquivos a criar/modificar:**
- `src/lib/asaas/client.ts` (novo)
- `src/lib/asaas/webhook.ts` (novo)
- `src/app/checkout/page.tsx` (modificar)
- `src/app/api/webhooks/asaas.ts` (novo)

### 1.2 Subscriptions Table

**Status:** ❌ Não iniciado  
**Responsável:** Claude Code  
**Tempo:** 2 horas

**SQL Migration:**
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  plano TEXT NOT NULL, -- 'essencial' | 'fluencia' | 'premium'
  status TEXT NOT NULL DEFAULT 'ativa', -- 'ativa' | 'cancelada' | 'paused'
  horas_mensais INT NOT NULL,
  ciclo_inicio DATE NOT NULL,
  ciclo_fim DATE NOT NULL,
  asaas_subscription_id VARCHAR,
  criada_em TIMESTAMP DEFAULT now(),
  renovada_em TIMESTAMP,
  cancelada_em TIMESTAMP
);

CREATE INDEX idx_sub_aluno ON subscriptions(aluno_id);
CREATE INDEX idx_sub_status ON subscriptions(status);
```

### 1.3 Usage Sessions

**Status:** ❌ Não iniciado  
**Responsável:** Claude Code  
**Tempo:** 3 horas

**SQL Migration:**
```sql
CREATE TABLE usage_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES alunos(id),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  iniciada_em TIMESTAMP DEFAULT now(),
  encerrada_em TIMESTAMP,
  segundos_utilizados INT,
  billable BOOLEAN DEFAULT true,
  ativo BOOLEAN DEFAULT true
);

CREATE TABLE usage_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL,
  subscription_id UUID NOT NULL,
  tipo TEXT, -- 'uso' | 'recarga' | 'compensacao' | 'renovacao'
  segundos INT,
  descricao TEXT,
  criada_em TIMESTAMP DEFAULT now()
);
```

### 1.4 Implementar Checkout

**Status:** 🟡 Estrutura existe  
**Responsável:** Claude Code  
**Tempo:** 6 horas

**Fluxo:**
```
1. Usuário entra em /checkout
2. Seleciona plano (Essencial/Fluência/Premium)
3. Sistema calcula preço
4. Redireciona para Asaas checkout
5. Asaas processa pagamento
6. Retorna callback
7. Sistema cria subscription
8. Aluno pode acessar aulas
```

**Componentes:**
- `src/app/checkout/page.tsx` (atualizar)
- `src/components/PlanSelector.tsx` (novo)
- `src/lib/asaas/checkout.ts` (novo)

### 1.5 Webhooks Asaas

**Status:** ❌ Não existem  
**Responsável:** Claude Code  
**Tempo:** 4 horas

**Eventos:**
- `payment.confirmed` → liberar horas
- `payment.failed` → notificar
- `subscription.renewed` → renovar horas
- `subscription.canceled` → notificar

**Arquivo:** `src/app/api/webhooks/asaas/route.ts` (novo)

---

## 🎯 FASE 2: TESTE GRATUITO & R$9,90 (Dias 4-5)

### 2.1 Teste Gratuito (5 Minutos)

**Status:** ❌ Não implementado  
**Tempo:** 3 horas

**Lógica:**
```typescript
// Uma conta pode ter apenas 1 teste gratuito
if (user.first_trial_used) {
  redirect('/checkout');
}

// Marcar como usado
const hasUsed = await db.markTrialUsed(userId);

// Criar sessão com limite
createSession({
  duration: 300, // 5 min em segundos
  type: 'trial_free',
  expiresAt: now + 5min
});
```

### 2.2 Teste R$9,90 (7 dias / 5 horas)

**Status:** ❌ Não implementado  
**Tempo:** 3 horas

**Lógica:**
- Plano especial
- Duração: 7 dias
- Horas: 5h
- Preço: R$9,90
- Não renova automaticamente

---

## 🎯 FASE 3: MEMÓRIA DE LONGO PRAZO (Dias 6-7)

### 3.1 Tabelas de Memória

```sql
CREATE TABLE student_memories (
  id UUID PRIMARY KEY,
  aluno_id UUID NOT NULL,
  tipo TEXT, -- 'info_pessoal' | 'erros' | 'vocabulario' | 'preferencias'
  conteudo TEXT,
  relevancia INT DEFAULT 100,
  criada_em TIMESTAMP,
  atualizada_em TIMESTAMP
);
```

### 3.2 Integração com IA

**Sistema de prompt:**
```typescript
// Ao iniciar sessão, carregar memória
const memoria = await getStudentMemory(studentId);

// Injetar no prompt
const systemPrompt = `
${basePrompt}

## Memória do aluno:
${memoria.map(m => `- ${m.conteudo}`).join('\n')}
`;
```

---

## 🎯 FASE 4: DASHBOARD ADMIN (Dias 8-10)

### 4.1 Cards Principais

```typescript
// USUARIOS
Total: 142
Ativos: 98
Novos esta semana: 23

// ASSINATURAS
Essencial: 45
Fluência: 32
Premium: 21
Teste: 42

// FATURAMENTO
MRR: R$ 8.940
Receita semana: R$ 2.280
Receita mês: R$ 8.940
```

### 4.2 Gráficos

```
1. Crescimento de usuários (linha)
2. Faturamento (barra)
3. Distribuição de planos (pizza)
4. Consumo de horas (barra)
5. Margens por plano (barra)
```

---

## 📋 CHECKLIST FASE 1 (PRIORITÁRIO)

### Dia 1: Asaas Setup
- [ ] Criar conta Asaas
- [ ] Obter credenciais
- [ ] Documentar no .env
- [ ] Criar `src/lib/asaas/client.ts`
- [ ] Testar conexão

### Dia 2: Banco de Dados
- [ ] Criar migrations
- [ ] Aplicar no Supabase
- [ ] Testar conexão
- [ ] RLS policies

### Dia 3: Checkout
- [ ] Implementar `src/app/checkout/page.tsx`
- [ ] Integrar Asaas
- [ ] Testar fluxo
- [ ] Tratamento de erros

### Dia 4: Horas
- [ ] Implementar consumo em tempo real
- [ ] Criar alertas
- [ ] Testar timeout
- [ ] Validar precisão

### Dia 5: Testes
- [ ] Teste E2E do fluxo completo
- [ ] Teste de pagamento sandbox
- [ ] Teste de renovação
- [ ] Teste mobile

---

## 🎯 PRÓXIMO PASSO IMEDIATO

**AGORA:** Iniciar FASE 1  
**Ação 1:** Setup Asaas  
**Ação 2:** Criar migrations  
**Ação 3:** Implementar checkout  

**Tempo estimado:** 5-7 dias para MVP  

---

**Plano criado:** 22 de agosto de 2026  
**Status:** Pronto para execução  
**Próximo update:** Fim do dia (Ação 1-2 concluídas)
