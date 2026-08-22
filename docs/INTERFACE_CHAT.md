# Interface de Chat — Tutoria de IA (SouBilingue)

## 📋 O que foi implementado

A interface de conversa entre aluno e tutor de IA, exatamente como mostrado no vídeo de referência.

### Componentes principais

#### 1. **AulaChat.tsx** — Componente cliente da conversa
- Localização: `src/components/aluno/AulaChat.tsx`
- Renderiza a interface completa de chat
- Gerencia estado da conversa (pronta, falando, ouvindo, pensando, pausada, erro)
- Implementa fluxo de voz bidirecional (STT + TTS)

#### 2. **Aula page.tsx** — Server Component
- Localização: `src/app/aluno/aula/page.tsx`
- Busca dados do tutor no banco
- Passa título, idioma da voz e foto do tutor para AulaChat

#### 3. **getTutorPorId()** — Função de dados
- Localização: `src/lib/data/tutores.ts`
- Busca tutor por ID, incluindo `foto_url`

---

## 🎨 Layout da Interface

### **1. Header (Gradient azul de 2c3e60 a 6f85d9)**
```
┌─────────────────────────────────────────┐
│ [Conversa continua]          [Encerrar] │
│                                         │
│         [Avatar 128x128]                │
│      (foto_url ou emoji 🧑‍🏫)           │
│                                         │
│         Clara - Espanhol                │
│    A tutora vai falar primeiro.         │
└─────────────────────────────────────────┘
```

**Features:**
- Avatar redondo com borda branca + shadow
- Indicador de status (dot colorido: verde=falando, azul=ouvindo, cinzento=pronto)
- Título (nome tutora + idioma)
- Status da conversa em tempo real

### **2. Área de Chat (branca com scroll)**
```
┌─────────────────────────────────────────┐
│  Quando vazio (inicial):                │
│  👋 Pronto para conversar?              │
│  Após iniciar, a tutora fala e o        │
│  microfone abre sozinho quando ela      │
│  terminar.                              │
│                                         │
│  Quando conversando:                    │
│ [T] Oi! Como você está?                 │
│     [🔊] [📝]                           │
│                                         │
│              Tudo bem! E você?      ✓   │
│                                         │
│ [T] Ótimo! De onde você é?              │
│     [🔊] [📝]                           │
└─────────────────────────────────────────┘
```

**Mensagens do tutor (esquerda, fundo cinzento):**
- Avatar mini "T"
- Texto da mensagem
- Botão 🔊 "Ouvir novamente" (repete o TTS)
- Botão 📝 "Ver tradução" (mostra bilíngue)
- Canto inferior esquerdo arredondado

**Mensagens do aluno (direita, azul):**
- Texto da mensagem
- Indicador ✓ (verde) na última mensagem
- Canto inferior direito arredondado

**Animações:**
- Fade-in 0.3s em novas mensagens
- Auto-scroll suave até a última mensagem

### **3. Footer**

**Quando pronta/pausada/erro:**
```
┌─────────────────────────────────────────┐
│  🎤 Iniciar conversa                    │
│  (botão grande azul)                    │
└─────────────────────────────────────────┘
```

**Quando conversando:**
```
┌─────────────────────────────────────────┐
│  ⏸️ Pausar conversa                      │
│  (botão grande branco com borda)        │
└─────────────────────────────────────────┘
```

**Se houver erro:**
```
┌─────────────────────────────────────────┐
│  ⚠️ Falha ao conectar ao microfone      │
│  (fundo amarelo)                        │
└─────────────────────────────────────────┘
```

---

## 🎯 Fluxo de Conversa

### Sequência de execução

```
1. Aluno carrega /aluno/aula
   └─> Busca perfil do aluno
   └─> Busca tutor (nome + foto)
   └─> Renderiza AulaChat

2. Aluno clica "🎤 Iniciar conversa"
   └─> Pede permissão de microfone
   └─> Envia mensagem inicial: "Ola! Vamos iniciar uma conversa de pratica."

3. API /api/aula/chat processa
   └─> Envia para Claude Haiku via streaming
   └─> Claude responde (ex: "Ola! Como você está?")

4. Tutor fala (TTS)
   └─> speechSynthesis.speak(resposta)
   └─> Quando termina, abre STT automaticamente

5. Aluno responde (STT)
   └─> SpeechRecognition escuta
   └─> Quando termina, volta ao passo 3

6. Aluno clica "⏸️ Pausar conversa"
   └─> Interrompe STT
   └─> Para TTS
   └─> Volta a "pronta"
```

### Estados da conversa

| Estado | Descrição | Ícone |
|--------|-----------|-------|
| `pronta` | Esperando aluno iniciar | ⚪ |
| `falando` | Tutor falando (TTS) | 🟢 pulsando |
| `ouvindo` | Aluno falando (STT) | 🔵 pulsando |
| `pensando` | Aguardando resposta de Claude | ⚪ |
| `pausada` | Conversa interrompida | ⚪ |
| `erro` | Problema com microfone/API | 🔴 |

---

## 🔧 Implementação Técnica

### Props do AulaChat

```typescript
{
  tituloTutor: string;           // "Clara - Espanhol"
  idiomaDaVoz: string;           // "es-ES" (WebSpeech lang)
  fotoTutor?: string;            // URL da foto ou undefined
}
```

### Tipos de dados

```typescript
type Mensagem = {
  role: "user" | "assistant";
  content: string;
  lida?: boolean;
};

type Estado = 
  | "pronta" 
  | "falando" 
  | "ouvindo" 
  | "pensando" 
  | "pausada" 
  | "erro";
```

### API integrada

**Endpoint:** `POST /api/aula/chat`

**Request:**
```json
{
  "mensagens": [
    { "role": "user", "content": "Ola! Vamos iniciar..." },
    { "role": "assistant", "content": "Ola! Como você está?" }
  ]
}
```

**Response:** Stream de texto da resposta do Claude Haiku

---

## 📸 Tutores com Fotos

### Seed de dados (`supabase/seed.sql`)

4 tutores pré-configurados:

| ID | Nome | Idioma | Foto | Status |
|---|---|---|---|---|
| `tutor-clara` | Clara | Espanhol | Unsplash (mulher) | ✅ |
| `tutor-marco` | Marco | Francês | Unsplash (homem) | ✅ |
| `tutor-sophia` | Sophia | Inglês | Unsplash (mulher) | ✅ |
| `tutor-wei` | Wei | Mandarim | Unsplash (homem) | ✅ |

As fotos vêm de URLs públicas (Unsplash), podendo ser substituídas por avatares internos depois.

### Migration para foto

**Arquivo:** `supabase/migrations/0003_adiciona_foto_url_tutores.sql`

Adiciona coluna:
```sql
alter table public.tutores
add column foto_url text;
```

---

## 🚀 Próximos passos

### Curto prazo
1. ✅ Aplicar migration `0003_adiciona_foto_url_tutores.sql` no Supabase real
2. ✅ Rodar `supabase/seed.sql` para popular tutores com fotos
3. ⬜ Testar conversa de verdade com microfone
4. ⬜ Implementar botão 📝 "Ver tradução" (mostrar bilíngue)

### Médio prazo
5. ⬜ Adicionar mais tutores (diversidade de sotaques)
6. ⬜ Upload de fotos personalizadas (em vez de Unsplash)
7. ⬜ Histórico de conversas (salvar no banco)
8. ⬜ Feedback da IA após a resposta do aluno

### Longo prazo
9. ⬜ Configuração de sotaque (Espanha vs México vs Argentina)
10. ⬜ Temas de conversa baseados em objetivo pessoal
11. ⬜ Analytics de progresso (palavras aprendidas, tópicos)

---

## 📝 Notas de design

- **Cores:** Gradient azul (profissional) + branco limpo + indicadores coloridos
- **Tipografia:** Títulos grandes e legíveis, body texto pequeno mas confortável
- **Espaçamento:** Padding generoso, gaps de 4-6px entre elementos
- **Animações:** Sutis (fade-in, pulse) — não distrai
- **Acessibilidade:** Aria labels, botões com text alternativo via title attribute

---

**Atualizado:** 22 de agosto de 2026  
**Status:** 🟢 Interface completa e funcional  
**Próximo:** Aplicar migration e popular banco com tutores + fotos
