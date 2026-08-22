# Fase 2.4 — Dashboard de Consumo ✅

**Data de implementação:** 22 de agosto de 2026  
**Status:** Implementada (sem testes em banco real ainda)

## Resumo

A Fase 2.4 fornece **visibilidade completa** do consumo de horas com:

- Dashboard com resumo de horas
- Gráficos de tendência (últimos 7 dias)
- Histórico de sessões (tabela)
- Estatísticas gerais (lifetime)
- Histórico de recargas (topups)

## Arquitetura

### 1. **Backend** (`src/lib/billing/reports.ts`)

**Funções de dados:**

```typescript
// Consumo do mês atual
getConsumoMes(alunoId)
  ├─ Horas total/utilizadas/restantes
  ├─ Percentual de uso
  ├─ Sessões no mês
  ├─ Duração média
  └─ Primeira e última sessão

// Histórico de sessões
getHistoricoSessoes(alunoId, limit)
  ├─ ID, data, horário
  ├─ Duração em minutos
  └─ Tipo de sessão

// Histórico de topups
getHistoricoTopups(alunoId, limit)
  ├─ Horas compradas
  ├─ Valor pago
  ├─ Status
  └─ Data de criação/expiração

// Tendências (últimos 7 dias)
getTendencias(alunoId)
  ├─ Horas usadas por dia
  └─ Sessões por dia

// Estatísticas gerais
getEstatisticasGerais(alunoId)
  ├─ Total horas compradas
  ├─ Total horas usadas
  ├─ Total gasto
  ├─ Sessões lifetime
  └─ Dias como membro
```

### 2. **Server Actions** (`src/app/aluno/dashboard/actions.ts`)

```typescript
getConsumoMesAction()           // Consumo do mês
getHistoricoSessoesAction()     // Últimas sessões
getHistoricoTopupsAction()      // Últimas recargas
getTendenciasAction()           // Últimos 7 dias
getEstatisticasGeraisAction()   // Stats lifetime
getDashboardCompletAction()     // Tudo junto (ideal para carregamento inicial)
```

### 3. **Componentes UI**

#### **ConsumoDashboard** (`src/components/aluno/ConsumoDashboard.tsx`)

Grid com:
- 4 cards de estatísticas (horas, uso, sessões, gasto)
- Consumo do mês atual com barra de progresso
- Tabela de tendências (últimos 7 dias)
- Info box com dica

```
┌─────────────────────────────────────┐
│ Seu Consumo                         │
├─────────────────────────────────────┤
│ 12h compradas | 8h usadas | 3h usadas │
│ 42 sessões | R$ 198.00 investimento  │
├─────────────────────────────────────┤
│ MÊS ATUAL — Agosto                  │
│ 8h de 12h | 67% ▰▰▱                 │
│ Sessões: 5 | Média: 45min | Rest: 4h│
├─────────────────────────────────────┤
│ ÚLTIMOS 7 DIAS                      │
│ 22/08: 1h (1 sessão) ▰               │
│ 21/08: 2h (2 sessões) ▰▰             │
│ ...                                 │
└─────────────────────────────────────┘
```

#### **HistoricoSessoes** (`src/components/aluno/HistoricoSessoes.tsx`)

Tabela com:
- Data e horário
- Duração em minutos
- Tipo de sessão
- Horas consumidas

```
┌────────┬────────┬──────────┬─────────────┬───────┐
│ Data   │ Horário│ Duração  │ Tipo        │ Horas │
├────────┼────────┼──────────┼─────────────┼───────┤
│22/08   │ 14:30  │ 45min    │ Conversação │ 0.75h │
│21/08   │ 10:15  │ 60min    │ Conversação │ 1.00h │
│21/08   │ 15:45  │ 30min    │ Conversação │ 0.50h │
│...     │ ...    │ ...      │ ...         │ ...   │
└────────┴────────┴──────────┴─────────────┴───────┘
```

## Fluxos de dados

### Carregamento inicial

```
ConsumoDashboard monta
  ├─ getDashboardCompletAction() [1 request, 5 operações paralelas]
  │  ├─ getConsumoMes()
  │  ├─ getHistoricoSessoes(10)
  │  ├─ getHistoricoTopups(5)
  │  ├─ getTendencias()
  │  └─ getEstatisticasGerais()
  └─ setState() para cada seção
```

**Performance:** 1 request de servidor → 5 queries paralelas → 1 setState por componente

### Recarregamento

```
useEffect → loadData() → Promise.all([...])
```

Sem dependências especificadas = carrega 1x no mount

## Exemplos de uso

### No layout de aluno

```typescript
// app/aluno/dashboard/page.tsx
import { ConsumoDashboard } from "@/components/aluno/ConsumoDashboard";
import { HistoricoSessoes } from "@/components/aluno/HistoricoSessoes";

export default function DashboardPage() {
  return (
    <div className="space-y-12">
      <ConsumoDashboard />
      <HistoricoSessoes />
    </div>
  );
}
```

### Dados individuais

```typescript
import { getConsumoMesAction } from "@/app/aluno/dashboard/actions";

// Em um componente
const { consumo } = await getConsumoMesAction();
```

## Integração com Hour Topups

O dashboard mostra:
1. Horas compradas via subscriptions + topups
2. Histórico de recargas (quando, quanto, valor)
3. Total investido (sum de topups)

Exemplo:
- Subscription: 12h compradas
- Topup 1: 5h por R$ 49.50
- Topup 2: 10h por R$ 99.00
- **Total:** 27h | **Investimento:** R$ 248.50

## Banco de dados

**Queries executadas:**

```sql
-- Consumo mês
SELECT * FROM subscriptions WHERE aluno_id = $1 AND status = 'ativa';
SELECT * FROM usage_sessions 
WHERE aluno_id = $1 AND ativo = false 
AND encerrada_em BETWEEN ciclo_inicio AND ciclo_fim;

-- Histórico
SELECT * FROM usage_sessions 
WHERE aluno_id = $1 AND ativo = false 
ORDER BY encerrada_em DESC LIMIT 30;

-- Tendências
SELECT * FROM usage_sessions 
WHERE aluno_id = $1 AND ativo = false 
AND encerrada_em >= (now() - interval '7 days');

-- Stats
SELECT SUM(horas) FROM hour_topups WHERE aluno_id = $1;
```

**Índices utilizados:**
- `idx_session_aluno_ativo`
- `idx_session_data`
- `idx_topup_aluno`

## Responsividade

**Desktop (≥ md):**
- Cards: 4 colunas
- Tabela: cheia
- Gráficos: 100% width

**Mobile (< md):**
- Cards: 2 colunas
- Tabela: scroll horizontal
- Gráficos: barras verticais compactas

## Tratamento de erro

Se um endpoint falhar:
- Componente mostra "Carregando..."
- Se esperar > 5s, mostra "Erro ao carregar"
- Retry manual com botão "Tentar novamente" (não implementado em v1)

## Performance

**Otimizações:**

✅ Queries paralelas via `Promise.all()`
✅ Índices em usage_sessions
✅ View consolidada (v_aluno_consumo_mes)
✅ Limit em históricos (padrão 30/10)
✅ Cálculos no backend (não no browser)

## Testes locais

```bash
# 1. Criar dados de teste
INSERT INTO usage_sessions 
VALUES (...);

# 2. Chamar action
const res = await getConsumoMesAction();

# 3. Verificar dados
console.log(res.data.consumo);
console.log(res.data.stats);
console.log(res.data.tendencias);
```

## Pendências para v2

- [ ] Exportar como PDF
- [ ] Gráficos interativos (Chart.js)
- [ ] Filtros por período
- [ ] Comparação mês a mês
- [ ] Alertas de milestone (1000h, 100 sessões)
- [ ] Integração com notificações push

## Documentação técnica

- `src/lib/billing/reports.ts` — Backend completo
- `src/app/aluno/dashboard/actions.ts` — Server Actions
- `src/components/aluno/ConsumoDashboard.tsx` — Dashboard UI
- `src/components/aluno/HistoricoSessoes.tsx` — Histórico UI

---

**Fase 2.4 implementada e pronta para testes! 🚀**
