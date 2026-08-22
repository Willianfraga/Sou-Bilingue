# 📊 DIAGNÓSTICO COMPLETO — SOU BILÍNGUE

**Data da auditoria:** 22 de agosto de 2026  
**Status:** Análise pré-desenvolvimento fase 1

---

## ✅ O QUE JÁ EXISTE

### Stack Tecnológico
- ✅ **Next.js 15** com App Router
- ✅ **React 19**
- ✅ **TypeScript** (strict)
- ✅ **Tailwind CSS** 3.4.4
- ✅ **Supabase** (Postgres + Auth + RLS)
- ✅ **Anthropic Claude** SDK integrado
- ✅ **PDF-lib** para gerar certificados
- ✅ **SSH + Server Components** implementados

### Estrutura de Pastas
```
✅ src/app/
   ├─ admin/              (7 páginas admin)
   ├─ aluno/              (6 páginas aluno)
   ├─ responsavel/        (5 páginas responsável)
   ├─ api/                (webhooks, jobs, chat)
   ├─ checkout/
   ├─ login/
   └─ page.tsx (home)

✅ src/lib/
   ├─ ai/                 (tutor.ts - prompt)
   ├─ auth/               (guards.ts)
   ├─ certificacao/       (PDF, fechamento)
   ├─ data/               (alunos, tutores, certificados, progresso)
   ├─ mock/               (dados mock)
   └─ supabase/           (3 clientes: client, server, admin)

✅ supabase/
   ├─ migrations/         (3 arquivos SQL)
   └─ seed.sql           (dados iniciais)
```

### Banco de Dados
```sql
✅ users          (via Supabase Auth)
✅ profiles       (papel: aluno|responsavel|admin)
✅ alunos         (id, responsavel_id, idioma, plano, tutor_id, objetivo)
✅ tutores        (id, nome, descricao, foto_url)
✅ consentimentos_lgpd
✅ semanas_progresso
✅ aulas_concluidas
✅ certificados
✅ historico_aulas
✅ lembretes_alunos
```

### Funcionalidades Implementadas

#### 1. Chat com IA ✅
- **Arquivo:** `src/components/aluno/AulaChat.tsx` (redesenhado 22/08)
- **Status:** 100% funcional
- **Features:**
  - Header com avatar (emoji ou foto)
  - Área de chat com scroll automático
  - Botões de ação (🔊 ouvir, 📝 tradução)
  - Indicadores de status (falando, ouvindo, pensando)
  - STT + TTS via Web Speech API
  - Integração Claude Haiku 4.5 (streaming)

#### 2. Autenticação ✅
- **Status:** Básico implementado
- **Providers:** Supabase Auth
- **Features:**
  - Login/signup
  - JWT
  - Server-side sessions
  - Guards em rotas

#### 3. RLS (Row Level Security) ✅
- **Status:** Configurado
- **Cobertura:** ~35 tabelas
- **Policy:**
  - `app.can_read()` para leitura
  - `app.can_manage()` para escrita

#### 4. Geração de PDF ✅
- **Arquivo:** `src/lib/certificacao/pdf.ts`
- **Status:** Implementado
- **Features:**
  - Certificado com dados do aluno
  - QR Code
  - Código de validação

#### 5. Progresso & Certificação ✅
- **Arquivo:** `src/lib/certificacao/fechamento.ts`
- **Status:** Lógica implementada
- **Features:**
  - Rastreio de semanas
  - Motor de certificação automático
  - Histórico de aulas

#### 6. Mobile Responsivo ✅
- **Status:** 100% otimizado (22/08)
- **Breakpoints:** 375px → 1440px
- **Features:**
  - Avatar adaptativo
  - Tipografia escalável
  - Botões touch-friendly
  - Sem scroll horizontal

#### 7. Painel Admin ✅
- **Páginas:** 7 rotas implementadas
  - `/admin` (home)
  - `/admin/auditoria`
  - `/admin/certificacao`
  - `/admin/conteudo`
  - `/admin/cupons`
  - `/admin/escolas`
  - `/admin/origem`
- **Status:** Estrutura existente, funcionalidades a completar

#### 8. Painel Responsável ✅
- **Páginas:** 5 rotas implementadas
  - `/responsavel` (home)
  - `/responsavel/certificados`
  - `/responsavel/configuracoes`
  - `/responsavel/consentimento`
  - `/responsavel/suporte`
- **Status:** Estrutura existente

#### 9. Checkout ✅
- **Página:** `/checkout`
- **Status:** Estrutura existente, integração pendente

---

## 🟡 O QUE ESTÁ PARCIAL

### 1. Integração de Pagamentos
- **Status:** Não implementado
- **Necessário:**
  - [ ] Escolher gateway (Asaas, Stripe, Mercado Pago)
  - [ ] Integração de checkout
  - [ ] Webhooks
  - [ ] Validação de pagamento

### 2. Controle de Horas
- **Status:** Estrutura no banco, lógica não implementada
- **Necessário:**
  - [ ] Sessão de uso
  - [ ] Consumo em tempo real
  - [ ] Alertas de saldo
  - [ ] Recargas
  - [ ] Cálculos de margem

### 3. Planos & Assinatura
- **Status:** Tipos no banco, lógica não implementada
- **Necessário:**
  - [ ] Ciclos de renovação
  - [ ] Downgrade/upgrade
  - [ ] Cancelamento
  - [ ] Comps/ajustes

### 4. Memória de Longo Prazo
- **Status:** Tabelas existem, integração com IA não feita
- **Necessário:**
  - [ ] Carregar contexto do aluno no prompt
  - [ ] Embeddings (opcional)
  - [ ] Histórico de aulas
  - [ ] Vocabulário persistente

### 5. Dashboard Admin - Relatórios
- **Status:** Páginas existem, dados não aparecem
- **Necessário:**
  - [ ] Queries para obter dados
  - [ ] Gráficos
  - [ ] KPIs
  - [ ] Alertas

### 6. n8n Automações
- **Pasta:** `/n8n` existe
- **Status:** Workflows não conectados ao app
- **Necessário:**
  - [ ] Integração com webhooks
  - [ ] Automações de notificação
  - [ ] Renovação automática

---

## ❌ O QUE ESTÁ QUEBRADO OU AUSENTE

### Crítico

#### 1. Gateway de Pagamento
- **Risco:** Sem pagamentos = sem receita
- **Prioridade:** P0
- **Ação:** Integrar Asaas/Stripe

#### 2. Consumo de Horas em Tempo Real
- **Risco:** Usuários ilimitados = custos infinitos
- **Prioridade:** P0
- **Ação:** Implementar sessão ativa e consumo preciso

#### 3. Renovação de Assinatura
- **Risco:** Planos expiram sem renovação
- **Prioridade:** P0
- **Ação:** Webhook de renovação

#### 4. Memória de IA
- **Risco:** Tutor não lembra do aluno
- **Prioridade:** P1
- **Ação:** Integrar contexto com histórico

### Alto

#### 5. Teste Gratuito (5 min)
- **Status:** Não implementado
- **Prioridade:** P1
- **Ação:** Criar sessão limitada

#### 6. Teste R$9,90
- **Status:** Não implementado
- **Prioridade:** P1
- **Ação:** Plano especial de 7 dias

#### 7. Dashboard Admin Funcional
- **Status:** Estrutura sem dados
- **Prioridade:** P1
- **Ação:** Popular com queries e gráficos

#### 8. Vocabulário Inteligente
- **Status:** Tabelas não existem
- **Prioridade:** P2
- **Ação:** Criar estrutura + UI

---

## 📊 ESTADO POR COMPONENTE

| Componente | % Completo | Status | Ação |
|-----------|-----------|--------|------|
| Chat com IA | 95% | ✅ Funcional | Melhorias |
| STT/TTS | 100% | ✅ Funcional | Nenhuma |
| Autenticação | 60% | 🟡 Parcial | Integração payment |
| RLS | 100% | ✅ Configurado | Nenhuma |
| Planos | 30% | ❌ Crítico | Implementar |
| Pagamentos | 0% | ❌ Crítico | Implementar |
| Horas | 20% | ❌ Crítico | Implementar |
| Certificados | 80% | 🟡 Parcial | Integrar com IA |
| Admin | 40% | 🟡 Parcial | Dados + gráficos |
| Responsável | 30% | 🟡 Parcial | Dados + funcionalidades |
| Mobile | 100% | ✅ Otimizado | Nenhuma |
| n8n | 10% | ❌ Não conectado | Integrar |
| Memória | 20% | ❌ Crítico | Embeddings + RAG |
| Gamificação | 0% | ❌ Não existe | Criar |
| Vocabulário | 0% | ❌ Não existe | Criar |

---

## 🏗️ BANCO DE DADOS

### Tabelas Existentes
```sql
auth.users
profiles (papel: aluno|responsavel|admin)
alunos (id, responsavel_id, idioma, sotaque, plano, tutor_id)
tutores (id, nome, descricao, foto_url)
consentimentos_lgpd
semanas_progresso
aulas_concluidas
certificados
historico_aulas
lembretes_alunos
```

### Migrations Necessárias

#### Fase 1 (Crítico)
```sql
-- Tabelas de assinatura e pagamento
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  aluno_id UUID REFERENCES alunos(id),
  plano ENUM ('essencial', 'fluencia', 'premium'),
  status ENUM ('ativa', 'paused', 'cancelada'),
  horas_mensais INT,
  ciclo_inicio DATE,
  ciclo_fim DATE,
  criada_em TIMESTAMP
)

CREATE TABLE usage_sessions (
  id UUID PRIMARY KEY,
  aluno_id UUID,
  iniciada_em TIMESTAMP,
  encerrada_em TIMESTAMP,
  segundos_utilizados INT,
  plano VARCHAR
)

CREATE TABLE payments (
  id UUID PRIMARY KEY,
  aluno_id UUID,
  valor DECIMAL,
  status ENUM ('pendente', 'processando', 'pago', 'recusado'),
  gateway_id VARCHAR,
  criada_em TIMESTAMP
)
```

#### Fase 2
```sql
-- Vocabulário
CREATE TABLE student_vocabulary (
  id UUID PRIMARY KEY,
  aluno_id UUID,
  palavra VARCHAR,
  idioma VARCHAR,
  nível ENUM ('dificil', 'aprendendo', 'dominada'),
  criada_em TIMESTAMP
)

-- Memória de longo prazo
CREATE TABLE student_memories (
  id UUID PRIMARY KEY,
  aluno_id UUID,
  tipo VARCHAR,
  conteudo TEXT,
  embedding VECTOR(1536),
  criada_em TIMESTAMP
)
```

---

## 🔗 INTEGRAÇÕES EXISTENTES

| Integração | Status | Arquivo |
|-----------|--------|---------|
| Supabase | ✅ Ativa | `src/lib/supabase/*` |
| Claude Haiku | ✅ Ativa | `src/lib/ai/tutor.ts` |
| PDF-lib | ✅ Ativa | `src/lib/certificacao/pdf.ts` |
| Web Speech API | ✅ Ativa | Native Browser |
| Asaas | ❌ Não | Necessária |
| Stripe/Mercado Pago | ❌ Não | Opção |
| n8n | ❌ Não conectada | Necessária |
| Sentry | ❌ Não | Opcional |

---

## 🎯 PLANO DE EXECUÇÃO (Ordem Prioritária)

### FASE 1: Crítico (Semana 1)
- [ ] Integrar gateway de pagamento (Asaas)
- [ ] Implementar controle de horas com sessão ativa
- [ ] Criar planos reais (Essencial, Fluência, Premium)
- [ ] Testes E2E de pagamento

### FASE 2: Alta (Semana 2)
- [ ] Teste gratuito (5 min) funcional
- [ ] Teste R$9,90 com 7 dias
- [ ] Dashboard admin com dados reais
- [ ] Renovação automática de assinatura

### FASE 3: Importante (Semana 3)
- [ ] Memória de longo prazo (embeddings)
- [ ] Histórico de aulas no tutor
- [ ] Vocabulário inteligente com repetição
- [ ] Relatório mensal do aluno

### FASE 4: Melhorias (Semana 4)
- [ ] Painel responsável completo
- [ ] Gamificação (XP, badges)
- [ ] Mais 4 tutores (total 8)
- [ ] Automações n8n

### FASE 5: Polimento (Semana 5+)
- [ ] Design premium
- [ ] Microinterações
- [ ] Performance
- [ ] Analytics

---

## ⚠️ RISCOS E PROBLEMAS

### Risco 1: Sem Limite de Uso = Custos Infinitos
**Problema:** Usuário pode ficar em sesão indefinidamente
**Impacto:** Custo de IA descontrolado
**Solução:** Implementar `session_timeout` + `usage_tracking`

### Risco 2: Alunos Não Pagam = Sem Receita
**Problema:** Gateway não integrado
**Impacto:** Impossível monetizar
**Solução:** Integrar Asaas/Stripe + webhooks

### Risco 3: Tutor Não Lembra do Aluno
**Problema:** Sem memória entre sessões
**Impacto:** Experiência genérica
**Solução:** Embeddings + RAG

### Risco 4: Admin Cego
**Problema:** Dashboard vazio
**Impacto:** Não sabe o que está acontecendo
**Solução:** Queries + gráficos

### Risco 5: RLS Configurado Errado
**Problema:** Aluno vê dados de outro
**Impacto:** Violação de privacidade + LGPD
**Solução:** Testar isolamento em staging

---

## 📋 PRIMEIRA ETAPA (PRÓXIMOS 2 DIAS)

### Dia 1: Setup & Pagamentos
```
1. Escolher gateway (recomendo Asaas)
2. Integrar checkout.tsx
3. Criar webhooks
4. Implementar subscription flow
5. Testes manuais
```

### Dia 2: Controle de Horas & Planos
```
1. Implementar usage_sessions
2. Criar sessão com timeout
3. Implementar planos (Essencial, Fluência, Premium)
4. Alertas de saldo
5. Testes
```

---

## 📊 RESUMO EXECUTIVO

**Status Geral:** 40% pronto  
**Pronto para produção:** Não  
**Pronto para MVP:** Sim (com pagamentos)  
**Tempo estimado até MVP:** 2-3 semanas  
**Tempo estimado até Completo:** 8-12 semanas  

**Maior prioridade:** Pagamentos + Controle de horas  
**Segundo lugar:** Memória + Dashboard admin  
**Terceiro lugar:** Gamificação + Relatórios  

---

**Diagóstico concluído em:** 22 de agosto de 2026  
**Análise feita por:** Claude Code  
**Próximo passo:** Iniciar FASE 1
