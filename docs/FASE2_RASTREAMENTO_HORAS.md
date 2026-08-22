# Fase 2 — Rastreamento de Horas em Tempo Real ✅

**Data de implementação:** 22 de agosto de 2026  
**Status:** Implementada (sem testes em banco real ainda)

## Resumo

A Fase 2 implementa o **rastreamento em tempo real** de horas de conversação:
- Sessão inicia quando o aluno começa a conversar
- Contador rodando durante a conversa
- Sessão encerra automaticamente ou manual (botão)
- Horas são debitadas da assinatura
- Alertas em 90%, 75%, 50% de consumo
- Timeout automático (1 hora inativa)

## Arquitetura

### 1. **Camada Backend** (`src/lib/billing/sessions.ts`)

Core das operações de sessão:

```typescript
// Criar sessão
createUsageSession(alunoId, tipo)
  ├─ Verifica assinatura ativa
  ├─ Verifica horas disponíveis
  ├─ Detecta sessão duplicada
  └─ Insere em usage_sessions

// Encerrar sessão
endUsageSession(sessionId, alunoId)
  ├─ Calcula duração total
  ├─ Registra no ledger
  └─ Debita horas_utilizadas

// Queries
getActiveSession(alunoId)       // Sessão atual
getSessionElapsedTime()          // Tempo desde início
forceEndSessionByTimeout()       // Auto-timeout
getSessionHistory(alunoId)       // Histórico
```

**Funções Supabase:**
- `close_idle_sessions(max_idle_seconds)` — Encerra inativas
- `calculate_hours_used(segundos)` — Converte segundos → horas
- `get_session_alerts(aluno_id)` — Retorna alertas de consumo

**View:**
- `v_aluno_consumo_mes` — Consolidado: sessões + horas + período

### 2. **Server Actions** (`src/app/aluno/sessions/actions.ts`)

Interface entre frontend e backend:

```typescript
startSessionAction()             // RPC para iniciar
endSessionAction(sessionId)      // RPC para encerrar
getActiveSessionAction()         // Fetch sessão atual
getElapsedTimeAction(sessionId)  // Fetch tempo decorrido
getHistoryAction(limit)          // Fetch histórico
```

### 3. **Hook React** (`src/hooks/useUsageSession.ts`)

Gerencia estado da sessão no cliente:

```typescript
useUsageSession({
  autoStart: true,               // Auto-iniciar ao montar
  maxIdleSeconds: 3600,          // 1 hora
  onTimeWarning: (rem) => {},    // 15 min restantes
  onTimeAlertCritical: (rem) => {}, // < 5 min
  onSessionEnded: (horas) => {},
})

// Retorna:
{
  sessionId,
  isActive,
  elapsedTime,                   // em segundos
  elapsedTimeFormatted,          // "1m 23s"
  loading,
  error,
  startSession(),
  endSession(),
}
```

**Features:**
- Auto-start se houver sessão ativa no servidor
- Timer de 1s (não faz request a cada tick)
- Sync com servidor a cada 10s
- Cálculo de alertas (90%, 75%, 50%)
- Auto-encerrar por timeout

### 4. **Componentes** 

#### `HourUsageTracker` — Status de horas

```
┌─────────────────────┐
│ Horas de Conversação│
│ 8 de 12 disponíveis │
│                    8│
│ ▰▱▱▱ 33% usado      │
│ ✓ Começar Conversa  │
└─────────────────────┘
```

**Mostra:**
- Horas restantes (grande)
- Progresso visual (barra)
- Percentual usado
- Botão Começar/Encerrar
- Status de erro

#### `HourWarningAlert` — Notificação flutuante

Níveis:
- **warning** (amarelo) — 15 min restantes
- **critical** (vermelho) — < 5 min
- **exhausted** (vermelho escuro) — 0 horas

#### `AulaChatComHoras` — Integração com chat

Layout responsivo:
- **Desktop:** Tracker à esquerda (sticky), chat à direita
- **Mobile:** Tracker acima, chat abaixo

### 5. **Banco de Dados** (Migration `0005_fase2_usage_tracking.sql`)

**Tabelas existentes atualizadas:**
- `usage_sessions` — Adicionado `atualizada_em`
- Trigger de auto-update

**Novas funções:**
```sql
close_idle_sessions(3600)        -- Chamado pelo n8n
calculate_hours_used(segundos)   -- Converte unidades
get_session_alerts(aluno_id)     -- Alertas
```

**Nova view:**
```sql
v_aluno_consumo_mes              -- Consolidado mês
```

**Índices:**
- `idx_session_aluno_ativo` — Sessão ativa rápida
- `idx_ledger_aluno_data` — Histórico rápido

## Fluxo de uma sessão

```
ALUNO ACESSA /aluno/aula
  ↓
AulaChatComHoras monta
  ├─ Fetch assinatura ativa
  └─ Renderiza HourUsageTracker
  ↓
useUsageSession auto-start (autoStart=true)
  ├─ Busca sessão ativa no servidor
  ├─ Se existir: carrega e começa timer
  ├─ Se não existir: aguarda clique
  └─ Timer roda a cada 1s (local)
  ↓
Aluno clica "Começar Conversação"
  → startSessionAction()
    ├─ Valida autenticação ✓
    ├─ Busca subscription ativa ✓
    ├─ Verifica horas_restantes > 0 ✓
    ├─ Detecta sessão duplicada ✓
    └─ INSERT em usage_sessions ✓
  ↓
Hook recebe sessionId
  ├─ Marca isActive = true
  └─ Inicia timer de 1s
  ↓
[Aluno conversa por 45 minutos]
  ↓
Timer checa eventos:
  - A cada 1s: elapsedTime++
  - A cada 10s: sync com servidor via getElapsedTimeAction()
  - Ao atingir 15 min: onTimeWarning() → mostra alerta
  - Ao atingir 1h: forceEndSessionByTimeout() → encerra
  ↓
Aluno clica "Encerrar"
  → endSessionAction(sessionId)
    ├─ Calcula duração total
    ├─ UPDATE usage_sessions (ativo=false)
    ├─ INSERT em usage_ledger (tipo: 'uso')
    ├─ UPDATE subscriptions (horas_utilizadas++)
    └─ Retorna horasConsumidas
  ↓
Hook recebe resultado
  ├─ Marca isActive = false
  ├─ Limpa timer
  └─ onSessionEnded() → feedback
  ↓
HourUsageTracker atualiza
  └─ Busca nova subscription
    ├─ Mostra horas_restantes (reduzidas)
    └─ Oferece novo "Começar"
```

## Exemplos de uso

### No AulaChat

```typescript
<AulaChatComHoras
  tituloTutor="Maria — Inglês Conversacional"
  idiomaDaVoz="en-US"
  fotoTutor={fotoUrl}
  alunoId={userId}
  horasRestantes={8}
  horasTotal={12}
/>
```

### Hook direto (controle fino)

```typescript
function MeuComponente() {
  const {
    isActive,
    elapsedTimeFormatted,
    startSession,
    endSession,
  } = useUsageSession({
    autoStart: false,  // Controle manual
    maxIdleSeconds: 1800,  // 30 min
    onTimeWarning: (remaining) => {
      console.log(`15 min restantes: ${remaining}s`);
    },
  });

  return (
    <>
      {isActive ? (
        <>
          <p>Tempo: {elapsedTimeFormatted}</p>
          <button onClick={() => endSession()}>Encerrar</button>
        </>
      ) : (
        <button onClick={() => startSession()}>Começar</button>
      )}
    </>
  );
}
```

## Integração com N8N (Fase 2.5)

**Workflow necessário:**
1. **Trigger:** Executar a cada 15 minutos
2. **Query:** `SELECT close_idle_sessions(3600)`
3. **Log:** Registrar quantas sessões foram encerradas

## Alertas

### Níveis implementados

| Nível | Trigger | Cor | Ação |
|-------|---------|-----|------|
| warning | 15 min restantes | 🟡 Amarelo | Sugerir recarga |
| critical | < 5 min | 🔴 Vermelho | Alerta urgente |
| exhausted | 0 horas | 🔴 Escuro | Bloquear chat |

### Customizável

```typescript
onTimeWarning={(remaining) => {
  // Lógica customizada — ex: enviar notificação via Firebase
  sendNotification({
    title: "Atenção: Horas acabando",
    body: `Você tem ${remaining / 60} minutos restantes`,
  });
}}
```

## Performance

**Otimizações:**
- ✅ Timer local (não faz request a cada 1s)
- ✅ Sync com servidor só a cada 10s
- ✅ Índices em usage_sessions para queries rápidas
- ✅ View consolidada para dashboard (sem N+1)

**Limite de carga:**
- 1 sessão ativa por aluno (validação duplicada)
- Query de histórico limitada (padrão: 10 registros)
- Sessões auto-encerram após 1h inativa

## Erros e fallbacks

| Erro | Tratamento |
|------|------------|
| Sem assinatura ativa | Retorna error, bloqueia sessão |
| 0 horas disponíveis | Retorna error, oferece recarga |
| Sessão já ativa | Retorna error, carrega sessão existente |
| Timeout de sync | Usa último tempo conhecido + offset |
| Navegador fecha | Session fica "ativa" até timeout (1h) |

## Próximos passos

### Fase 2.1 — Notificações push
- [ ] Firebase Cloud Messaging
- [ ] Alerta quando faltam 15 min
- [ ] Alerta crítico < 5 min

### Fase 2.2 — Dashboard de consumo
- [ ] Gráfico de horas por semana
- [ ] Histórico de sessões (tabela)
- [ ] Médias de duração

### Fase 2.3 — Recargas (Hour Topups)
- [ ] Novo tipo de cobrança via Asaas
- [ ] Link de checkout separado
- [ ] Creditar horas_restantes

### Fase 2.4 — Relatórios
- [ ] PDF de consumo mensal
- [ ] Exportar histórico

## Testes locais (quando houver Supabase real)

```bash
# 1. Aplicar migration
supabase db push

# 2. Criar assinatura de teste
INSERT INTO subscriptions (...) VALUES (...);

# 3. Acessar /aluno/aula
npm run dev

# 4. Clicar "Começar Conversação"
# 5. Verificar criação em usage_sessions
# 6. Esperar 30s, clicar "Encerrar"
# 7. Verificar:
#    - usage_sessions.encerrada_em preenchido
#    - usage_ledger com entry de "uso"
#    - subscriptions.horas_utilizadas incrementado
```

## Documentação técnica

- `src/lib/billing/sessions.ts` — Lógica de backend
- `src/hooks/useUsageSession.ts` — Hook React
- `src/components/aluno/HourUsageTracker.tsx` — UI tracker
- `src/components/aluno/HourWarningAlert.tsx` — UI alerta

---

**Fase 2 implementada e pronta para testes! 🚀**
