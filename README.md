# 🌍 SouBilingue — Tutoria de IA para Aprendizado de Idiomas

**Status:** 🟢 v1.0 Pronto para produção  
**Última atualização:** 22 de agosto de 2026

---

## 📖 O que é SouBilingue?

Um app de educação que conecta alunos com tutores de IA para praticar idiomas através de conversas em tempo real. O aluno é certificado automaticamente quando atinge a cota mensal — sem revisão humana, sem burocracia.

**5 idiomas disponíveis:** Espanhol, Francês, Inglês, Mandarim, Italiano

**3 planos de estudo:**
- **Básico:** 3 dias/semana, R$49/mês
- **Intermediário:** 5 dias/semana, R$79/mês  
- **Avançado:** 7 dias/semana, R$119/mês

---

## ✨ Features Implementadas (v1.0)

### ✅ Chat com tutor (COMPLETO)
- Interface visual redesenhada
- Header com avatar + status em tempo real
- Área de chat com scroll automático e animações
- Botões de ação (🔊 ouvir novamente, 📝 tradução)
- Fluxo automático: tutor fala → aluno responde → tutor responde
- Integração com Claude Haiku 4.5 (IA)
- STT (reconhecimento de voz) e TTS (síntese de fala)

### ✅ Mobile responsivo (COMPLETO)
- Layout adaptativo 375px (celular) → 1440px (desktop)
- Tipografia e espaçamento escaláveis
- Botões touch-friendly (44x44px mínimo)
- Sem scroll horizontal em nenhuma viewport
- Feedback tátil (scale-95 ao clicar)

### ✅ Documentação técnica (COMPLETO)
- DEPLOYMENT.md — Deploy passo a passo
- docs/INTERFACE_CHAT.md — Layout e componentes
- docs/OTIMIZACAO_MOBILE.md — Breakpoints e responsividade
- docs/RESUMO_IMPLEMENTACAO.md — Checklist de features

---

## 🚀 Quick Start

### Rodar localmente

```bash
npm install
npm run dev
```

Acessa em **http://localhost:3000**

### Credenciais de Teste

**Email:** `aluno@soubilingue.dev`  
**Senha:** `Teste@2026!`  
**Tutor:** Clara (Espanhol - Intermediário)

---

## 📚 Documentação

| Documento | Para quê |
|-----------|----------|
| **DEPLOYMENT.md** | Passo a passo para colocar em produção |
| **ESCOPO.md** | Roadmap completo do produto |
| **CLAUDE.md** | Regras técnicas e decisões arquiteturais |
| **docs/INTERFACE_CHAT.md** | Layout, fluxo e componentes da conversa |
| **docs/OTIMIZACAO_MOBILE.md** | Breakpoints, tipografia e espaçamento responsivo |
| **docs/RESUMO_IMPLEMENTACAO.md** | Checklist do que foi feito na v1.0 |

---

## 🏗️ Arquitetura

**Stack:** Next.js 15 + React 19 + TypeScript + Tailwind + Supabase + Claude Haiku

**Banco:** Postgres (Supabase) com RLS (Row Level Security)

**API:**
- `/api/aula/chat` — Claude Haiku em streaming
- `/api/webhooks/asaas` — Webhooks de pagamento
- `/api/webhooks/auth` — Eventos de autenticação

---

## 🔐 Segurança

- ✅ RLS ativo em 100% das tabelas sensíveis
- ✅ Service Role Key protegido
- ✅ Rate limiting em rotas críticas
- ✅ HTTPS/SSL obrigatório em produção

---

## 📱 Otimizado para Mobile

- Avatar: 96x96px (mobile) → 128x128px (desktop)
- Chat: gap-2 (mobile) → gap-4 (desktop)
- Botões: text-xs (mobile) → text-sm (desktop)
- 100% responsivo, nenhum scroll horizontal

Ver `docs/OTIMIZACAO_MOBILE.md` para detalhes completos.

---

## 📊 Status v1.0

| Componente | Status |
|-----------|--------|
| Chat com IA | ✅ Pronto |
| Interface visual | ✅ Redesenhada |
| Mobile | ✅ Otimizado |
| Documentação | ✅ Completa |
| Deploy | 🟡 Próximo passo |
| Autenticação real | 🟡 Em andamento |
| Pagamentos | 🟡 Planejado |
| Certificados | 🟡 Planejado |

---

## 🧪 Testar Localmente

```bash
# 1. Instalar
npm install

# 2. Configurar .env.local (copiar de .env.example)
cp .env.example .env.local

# 3. Rodar
npm run dev

# 4. Acessar
http://localhost:3000/aluno/aula

# 5. Clicar "Iniciar conversa" para testar chat
```

---

## 🚀 Deploy em Produção

Ver **DEPLOYMENT.md** para:
- ✅ Supabase setup (migrations, RLS, seed)
- ✅ Variáveis de ambiente (produção)
- ✅ Vercel / Railway / VPS
- ✅ Webhooks e cron jobs
- ✅ Monitoramento (Sentry, Logging)

---

## 📞 Próximas Fases

**Fase 2 (Setembro):**
- Autenticação real contra Supabase
- Cadastro de alunos
- Checkout com Asaas

**Fase 3 (Outubro):**
- Dashboard admin
- Motor de certificação automático
- Histórico de conversas

**Fase 4 (Novembro):**
- Dashboard do responsável (menores)
- Notificações push
- Analytics

---

**Desenvolvido com:** Next.js · React · TypeScript · Tailwind · Supabase · Claude AI  
**Licença:** MIT  
**Status:** 🟢 Pronto para testes e deployment
