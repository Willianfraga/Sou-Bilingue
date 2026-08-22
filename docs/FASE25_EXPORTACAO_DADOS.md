# Fase 2.5 — Exportação de Dados (PDF/CSV) ✅

**Data de implementação:** 22 de agosto de 2026  
**Status:** Implementada (build 100% sucesso)

## Resumo

A Fase 2.5 permite **exportar dados** em múltiplos formatos:

- **CSV** — Para análise em Excel/Sheets
- **PDF** — Para compartilhamento e impressão
- **Email** — Relatório automático (future)

## Arquitetura

### 1. **Gerador CSV** (`src/lib/export/csv-generator.ts`)

**Funções:**

```typescript
gerarCSVSessoes(sessoes)     // Histórico de sessões
gerarCSVTopups(topups)       // Histórico de recargas
gerarCSVResumo(resumo)       // Resumo mensal
baixarCSV(csv, nomeArquivo)  // Download no browser
```

**Formato CSV:**

```csv
Data,Horário,Duração (min),Tipo,Horas
22/08/2026,14:30,45,Conversação,0.75
21/08/2026,10:15,60,Conversação,1.00
```

### 2. **Gerador PDF** (`src/lib/export/pdf-generator.ts`)

**Funções:**

```typescript
gerarPDFDoElemento(elementoId, opcoes)  // Converte HTML → PDF
gerarPDFRelatorio(nomeAluno, periodo, dados)  // PDF customizado
gerarPDFTabela(titulo, nomeAluno, headers, rows)  // PDF tabular
```

**Bibliotecas:**
- `jspdf` — Geração de PDF
- `html2canvas` — Conversão HTML → Canvas

**PDF Customizado:**

```
┌──────────────────────────────────┐
│  Relatório de Consumo             │  ← Header
│  Sou Bilingue                     │
├──────────────────────────────────┤
│ Aluno: João Silva                │
│ Período: Agosto/2026             │
│ Gerado em: 22/08/2026            │
├──────────────────────────────────┤
│ Resumo                            │
│ • Horas Totais: 12h              │
│ • Horas Usadas: 8h               │
│ • Horas Restantes: 4h            │
│ • Percentual: 67%                │
│ ████████░░ 67%                   │  ← Barra visual
│ • Sessões: 5                     │
│ • Duração Média: 45min           │
│ Total Investido: R$ 198,00       │
└──────────────────────────────────┘
```

### 3. **Componente UI** (`src/components/aluno/BotoesExportacao.tsx`)

```
┌─ Exportar Dados ─────────────────┐
│                                  │
│  ┌──────────┐ ┌──────────┐      │
│  │📊 CSV    │ │📄 PDF    │      │
│  │Sessões   │ │Relatório │      │
│  └──────────┘ └──────────┘      │
│                                  │
│  ┌──────────┐                   │
│  │💡 Dica   │                   │
│  │Use CSV   │                   │
│  │em Excel  │                   │
│  └──────────┘                   │
│                                  │
└──────────────────────────────────┘
```

## Tipos de Exportação

### 1. CSV Sessões
**Incluí:**
- Data e horário
- Duração (minutos)
- Tipo de sessão
- Horas consumidas (2 casas decimais)

**Arquivo:** `sessoes-2026-08-22.csv`

### 2. CSV Topups
**Incluí:**
- Data de compra
- Horas adquiridas
- Valor pago
- Status (ativo, expirado)
- Data de expiração

**Arquivo:** `topups-2026-08-22.csv`

### 3. PDF Relatório
**Incluí:**
- Header com branding
- Informações do aluno
- Resumo de horas
- Barra de progresso visual
- Estatísticas gerais
- Footer com data

**Arquivo:** `Relatorio-João Silva-2026-08-22.pdf`

## Fluxo de Exportação

```
Clica "Exportar PDF"
  ↓
BotoesExportacao.tsx
  ↓
gerarPDFRelatorio() (jsPDF)
  ↓
Cria documento PDF
  ↓
pdf.save() → Download automático no browser
```

## Exemplos de Uso

### No dashboard

```typescript
<BotoesExportacao
  nomeAluno="João Silva"
  periodo="Agosto/2026"
  consumoData={{
    horas_total: 12,
    horas_usadas: 8,
    horas_restantes: 4,
    percentual_usado: 67,
    sessoes_total: 5,
    duracao_media: 45,
  }}
/>
```

### Exportar programaticamente

```typescript
import { gerarCSVSessoes, baixarCSV } from "@/lib/export/csv-generator";

const sessoes = [...]; // dados
const csv = gerarCSVSessoes(sessoes);
baixarCSV(csv, "minhas-sessoes.csv");
```

## Segurança

✅ Dados exportados = dados do aluno logado
✅ Validação de autenticação antes de exportar
✅ Sem dados financeiros sensíveis expostos
✅ Download local (não armazenado no servidor)

## Performance

✅ Geração no cliente (browser)
✅ Sem overhead de servidor
✅ Sem limite de tamanho de arquivo
✅ Download instantâneo

## Formatos CSV

### Escapar Valores
- Aspas duplas → `""`
- Quebras de linha → Encapsuladas em aspas
- Vírgulas → Encapsuladas em aspas

Exemplo:
```csv
"Sessão com ""pausa""",30,Conversa,"Texto com, vírgula"
```

## PDF Customização

**Cores padrão:**
- Primária: Blue (#3b82f6)
- Texto: Dark neutral (#171717)
- Barras: Green, Yellow, Red (por uso%)

**Páginas:**
- Automática se conteúdo > 1 página
- Nova página quando y > 270mm

## Próximas Fases

- [ ] Email automático com relatório mensal
- [ ] Agendamento de exportação
- [ ] Múltiplos formatos (Excel, JSON)
- [ ] Assinatura digital em PDF
- [ ] Exportação em lote (admin)

## Bibliotecas Instaladas

```bash
npm install jspdf html2canvas
```

---

**Fase 2.5 completa! 📥**
