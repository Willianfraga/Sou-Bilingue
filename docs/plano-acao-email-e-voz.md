# 📋 Plano de ação: e-mails com o nome do app e voz mais barata

*Criado em 07/10/2026.* Quem faz: **Você**, **Claude** ou os dois
(**Juntos**). Marque `[x]` quando concluir.

| | Plano A: e-mails do app | Plano B: voz mais barata |
|---|---|---|
| **Problema** | E-mails saem como "Supabase", em inglês, e são poucos por hora | A voz é 79% do custo de cada aula (~R$ 9,70/h no total) |
| **Solução** | Resend (grátis) + domínio soubilingue.com.br + textos em PT-BR | Google Text-to-Speech, com o ElevenLabs de reserva |
| **Custo** | R$ 0 (até 3.000 e-mails/mês, 100/dia) | 1 milhão de caracteres grátis/mês (~29 h de aula) e depois US$ 16–30 por milhão |
| **Tempo total** | ~1 hora, num dia | ~1 semana, com a escuta e a decisão no meio |
| **Risco** | Baixo: dá para voltar ao envio do Supabase em 1 clique | Baixo: a troca é por configuração, e o ElevenLabs continua de reserva |
| **Ordem** | **Primeiro**, porque é obrigatório antes de vender (checklist, item 3) | **Em paralelo**, decidido com o teste de gastos |

---

## Plano A: e-mails com o nome do Sou Bilíngue

**Objetivo:** o aluno recebe "Sou Bilíngue <nao-responda@soubilingue.com.br>",
em português, na caixa de entrada, em menos de 1 minuto.

### A1. Conta no Resend (Você, ~5 min)

- [ ] Criar a conta grátis em **resend.com**, com o e-mail da empresa
- [ ] Em **Domains → Add Domain**, digitar `soubilingue.com.br`, região
  "São Paulo" ou a mais próxima
- [ ] Deixar aberta a tela com os registros de DNS que o Resend mostrar

### A2. DNS na Hostinger (Juntos, ~10 min)

O domínio usa os servidores de nome da Hostinger (`dns-parking.com`).

- [ ] Hostinger → **Domínios → soubilingue.com.br → DNS / Nameservers**
- [ ] Adicionar os registros que o Resend pedir, normalmente estes:
  - [ ] **MX** de envio (`send`)
  - [ ] **TXT SPF** (`send`)
  - [ ] **TXT DKIM** (`resend._domainkey`)
  - [ ] **TXT DMARC** (`_dmarc`), recomendado
- [ ] Não mexer nos registros que já existem: os do site, `app.` e `www`
- [ ] No Resend, clicar em **Verify**. A propagação pode levar de minutos a
  algumas horas.

Como conferir: o domínio aparece **"Verified"** no Resend.

### A3. Ligar o Supabase ao Resend (Você, ~5 min, com o Claude guiando)

- [ ] Resend → **API Keys → Create**, com permissão "Sending access"
- [ ] Supabase → **Authentication → Emails → SMTP Settings → Enable custom SMTP**:
  - Sender email: `nao-responda@soubilingue.com.br`
  - Sender name: `Sou Bilíngue`
  - Host: `smtp.resend.com` · Port: `465`
  - Username: `resend` · Password: a chave criada acima (colar só lá, nunca
    na conversa)
- [ ] Supabase → **Authentication → Rate Limits**: subir o limite de e-mails
  por hora (ex.: 60)

### A4. Textos dos e-mails em português (Claude escreve, Você cola, ~15 min)

- [ ] O Claude prepara os modelos com a cor e o nome do app:
  - [ ] Confirmação de cadastro
  - [ ] Esqueci a senha
  - [ ] Troca de e-mail
  - [ ] Link mágico e convite (se usados)
- [ ] Você cola cada um em **Authentication → Emails → Templates**, com o
  assunto

### A5. Teste (Juntos, ~10 min)

- [ ] Cadastro novo com um e-mail de teste (Gmail e Yahoo)
- [ ] "Esqueci a senha" com uma conta existente
- [ ] Conferir em cada um:
  - [ ] o remetente é "Sou Bilíngue";
  - [ ] chegou na caixa de entrada, não no spam;
  - [ ] chegou em menos de 1 minuto;
  - [ ] o link funciona.
- [ ] Marcar o **item 3** em `docs/checklist-producao.md`

**Como voltar atrás:** desligar "Enable custom SMTP" no Supabase. O envio
volta para o padrão na hora.

---

## Plano B: voz da tutora mais barata, sem perder qualidade

**Objetivo:** baixar o custo da hora de aula de ~R$ 9,70 para ~R$ 5,40–7,90,
**só se** a voz nova for aprovada no ouvido.

**Regra de ouro:** a decisão é sua, depois de ouvir. A voz do navegador foi
reprovada por soar robotizada. Por isso a comparação é com o ElevenLabs,
não com ela.

### B1. Conta no Google Cloud (Você, ~15 min, com o Claude guiando)

- [ ] Criar o projeto **"sou-bilingue"** em console.cloud.google.com
- [ ] Ativar o faturamento com cartão. Não cobra dentro da cota grátis.
- [ ] Criar o **alerta de orçamento**: Billing → Budgets, US$ 10/mês, aviso
  em 50% e 90%
- [ ] Ativar a API **Cloud Text-to-Speech**
- [ ] Criar uma **chave de API** restrita **só** ao Text-to-Speech
- [ ] Colocar no `.env.local` como `GOOGLE_TTS_API_KEY=...`, sem colar na
  conversa

### B2. Amostras para ouvir (Claude, ~1 h)

- [ ] O Claude gera a **mesma frase** de cada tutor, no idioma e sotaque
  dele, em 3 versões:
  1. ElevenLabs (a de hoje)
  2. Google **Chirp 3 HD** (mais natural, ~R$ 7,90/h)
  3. Google **Neural2/WaveNet** (mais barata, ~R$ 5,40/h)
- [ ] Uma página simples para ouvir lado a lado, com os nomes escondidos
  (teste "às cegas")
- [ ] Testar também uma frase longa e uma com nome próprio em português,
  porque o aluno às vezes mistura os idiomas

### B3. Decisão (Você)

- [ ] Ouvir as amostras e escolher uma das opções:
  - [ ] **Chirp 3 HD** para todos;
  - [ ] **Neural2** para todos;
  - [ ] **misto**: Chirp 3 HD no Fluência e no Premium, Neural2 no
    Essencial e no Teste;
  - [ ] **manter o ElevenLabs** (o plano B para aqui e a margem é resolvida
    pelo preço ou pelas horas; ver o item 9b da checklist).

### B4. Implementação (Claude, ~1 dia)

- [ ] Banco: permitir `google` como fornecedor no registro de custos
  (`ai_usage_events`) e cadastrar o preço em `precos_ia`.
  - É uma migration pequena; **você aplica no SQL Editor**, como a 0025.
- [ ] App:
  - [ ] a voz passa a escolher o fornecedor por configuração
    (`TTS_FORNECEDOR=google`);
  - [ ] cada tutor ganha a voz Google equivalente.
- [ ] **Reserva automática:** se o Google falhar, a tutora fala pelo
  ElevenLabs. A voz do navegador só entra se os dois falharem.
- [ ] O custo de cada fala continua registrado, e o painel Custos separa
  Google e ElevenLabs.
- [ ] Testes automáticos, build, e você clica em **Deploy**

**Como voltar atrás:** trocar `TTS_FORNECEDOR` para `elevenlabs` no Coolify
e fazer um deploy. Não precisa mexer em código.

### B5. Acompanhamento (Claude, 1–2 semanas)

- [ ] Medir durante o teste de gastos com as 4 contas:
  - [ ] o custo real por hora, antes × depois;
  - [ ] as falhas da voz e quantas vezes a reserva foi usada;
  - [ ] a opinião das 4 pessoas sobre a voz.
- [ ] Refazer a tabela de margens, no item 9b da checklist e em
  `docs/CUSTOS_IA.md`

### B6. Segundo passo opcional: economizar no Claude (Claude)

O Claude é 20% do custo. Hoje cada resposta reenvia ~3 mil tokens.

- [ ] Mandar só as últimas mensagens da conversa e um resumo curto do resto.
  Estimativa: 20 a 30% a menos na parte do Claude.
- [ ] Comparar a qualidade das respostas antes e depois, com a mesma
  conversa de teste
- [ ] Só publicar se a tutora continuar lembrando o contexto da aula

---

## Resumo da ordem

| Quando | O quê | Quem |
|---|---|---|
| Hoje / amanhã | A1 → A5 (e-mails prontos) | Juntos |
| Mesma semana | B1 (conta Google) + B2 (amostras) | Você + Claude |
| Depois de ouvir | B3 (decisão) → B4 (implementar) | Você → Claude |
| 1–2 semanas | B5 (medir) + item 9b da checklist (planos) | Claude + Você |
| Depois | B6 (economia no Claude) | Claude |
