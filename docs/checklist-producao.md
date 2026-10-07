# ✅ Checklist para colocar o Sou Bilíngue em produção

Marque `[x]` quando concluir. Quem faz: **Você**, **Claude**, ou os dois
(**Juntos**). "Como conferir" diz o que prova que ficou certo.

*Criado em 06/10/2026.*

---

## 🔴 Fase 1: obrigatório antes do 1º cliente pagante

### 1. Trocar as chaves que vazaram (Você)

Os valores das variáveis de produção apareceram numa conversa em setembro, e
a senha do banco apareceu num print. Para cada item: gerar a chave nova,
colocar no Coolify e no `.env.local` e apagar a antiga.

- [ ] Supabase: chave secreta (`SUPABASE_SERVICE_ROLE_KEY`)
- [ ] Supabase: senha do banco (Settings → Database → Reset password)
- [ ] Asaas: chave da API e token do webhook
- [ ] ElevenLabs: chave da API
- [ ] Anthropic: chave da API (já existe uma nova, de 29/09; apagar as antigas que ainda existirem)
- [ ] Coolify: `COOLIFY_API_TOKEN`
- [ ] Supabase: `SUPABASE_ACCESS_TOKEN`
- [ ] Depois da troca, fazer **um** deploy

Como conferir: o Claude roda `npm run saude` e testa login, aula e voz em
produção.

### 2. Pagamentos de verdade, no Asaas de produção (Juntos)

- [ ] Criar e verificar a conta de produção no Asaas (documentos e conta bancária)
- [ ] Trocar `ASAAS_API_KEY` e `ASAAS_API_URL` para produção no Coolify
- [ ] Cadastrar no Asaas o webhook de produção apontando para `/api/webhooks/asaas`, com o token novo
- [ ] **Compra-teste real, de valor baixo**, com o seu cartão ou Pix:
  - [ ] o plano ativa sozinho;
  - [ ] as horas do plano aparecem em "Minhas horas";
  - [ ] o pagamento aparece em Admin → Financeiro;
  - [ ] comprar 5 horas extras faz as horas entrarem no saldo;
  - [ ] pedir o reembolso faz o dinheiro voltar e o acesso ser encerrado.

Como conferir: tudo marcado acima, e `webhook_events` sem eventos com
"erro".

### 3. E-mails de cadastro e senha (Juntos)

Passo a passo detalhado: `docs/plano-acao-email-e-voz.md` (Plano A).

O envio padrão do Supabase manda poucos e-mails por hora. Com vários
cadastros, a confirmação e o "esqueci a senha" param de chegar.

- [ ] Criar conta num serviço de envio (Resend ou Brevo, que têm plano gratuito)
- [ ] Configurar o domínio `soubilingue.com.br` no serviço (SPF/DKIM no DNS)
- [ ] Supabase → Authentication → SMTP: colocar os dados do serviço
- [ ] Ajustar o remetente e o texto dos e-mails em português

Como conferir: cadastro novo e "esqueci a senha" chegam na caixa de
entrada, não no spam, em até 1 minuto.

### 4. Parte legal (Você + advogado)

- [ ] Revisão dos **Termos de uso**
- [ ] Revisão da **Política de privacidade**, incluindo:
  - [ ] o texto das conversas fica guardado por 90 dias;
  - [ ] menores de idade e consentimento do responsável;
  - [ ] uso de IA (Anthropic e ElevenLabs) no tratamento dos dados.
- [ ] Revisão da **Política de reembolso**: 7 dias (`docs/refund-policy.md`)
- [ ] Preencher em Admin os dados da empresa: CNPJ, razão social, endereço, e-mail e telefone
- [ ] Página `/contato` mostrando esses dados (exigência do Código do Consumidor para venda online)

Como conferir: as páginas `/termos`, `/privacidade`, `/reembolso` e
`/contato` estão revisadas e sem "em breve".

### 5. Saldo das IAs, para a tutora não parar (Você)

- [ ] Anthropic: ativar a **recarga automática** (Console → Billing), com um limite mensal
- [ ] ElevenLabs: conferir se o plano cobre o volume esperado de voz e transcrição
- [ ] Anotar os limites de gasto mensais em Admin → Custos (ferramentas)

Como conferir: `npm run saude` sem alerta de crédito.

---

## 🟡 Fase 2: primeiras semanas

### 6. Servidor estável (Você + Claude)

- [ ] Decidir: aumentar a memória da VPS **ou** manter desligados os serviços que não são do Sou Bilíngue
- [ ] Regra: publicar **fora do horário de aula** e um deploy por vez

Como conferir: dois deploys seguidos sem o site cair.

### 7. Backup do banco (Juntos)

- [ ] Confirmar se o plano do Supabase faz backup diário (Database → Backups)
- [ ] Testar **uma** restauração num projeto separado

Como conferir: o backup restaurado abre com os alunos e as assinaturas.

### 8. Vigilância automática (Claude)

- [ ] Agendar o `npm run saude` para rodar todo dia
- [ ] Definir para onde vai o aviso de problema (e-mail ou WhatsApp)

Como conferir: chega um relatório diário, ou um aviso quando algo quebrar.

### 9. Conta de custo por hora (Juntos)

- [ ] Depois de 10 alunos ativos, ver em Admin → Custos o custo real de 1 hora de aula (IA + voz)
- [ ] Comparar com o preço por hora de cada plano e decidir se precisa de ajuste

Como conferir: margem positiva em todos os planos.

### 9b. Revisar os planos com o custo real da turma piloto (Juntos)

Para reduzir o custo da voz (Google TTS com o ElevenLabs de reserva), ver
`docs/plano-acao-email-e-voz.md` (Plano B).

A conta de agosto (`docs/CUSTOS_IA.md`) é a referência: ~R$ 7,81/h com a
voz ElevenLabs e ~R$ 1,37/h com a voz do navegador.

| Plano | Preço | Horas | Por hora | Voz | Situação (conta de agosto) |
|---|---|---|---|---|---|
| Teste 7 dias | R$ 9,90 | 5 h | R$ 1,98 | ElevenLabs | Custa até ~R$ 39 |
| Essencial | R$ 59,80 | 12 h | R$ 4,98 | Navegador | ✅ Lucro de ~R$ 43 |
| Fluência ⭐ | R$ 109,80 | 20 h | R$ 5,49 | ElevenLabs | ❌ Prejuízo acima de ~70% de uso |
| Premium | R$ 169,80 | 30 h | R$ 5,66 | ElevenLabs | ❌ Prejuízo acima de ~70% de uso |
| Horas extras | R$ 9,90/h | 5/10/20 h | R$ 9,90 | A do plano | ⚠️ ~R$ 2/h com ElevenLabs |

- [ ] Depois de 1 a 2 semanas de turma piloto, o Claude tira do Admin → Custos:
  - [ ] o custo real por hora (com cache e a contagem nova por conversa ativa);
  - [ ] a média de horas usadas por aluno em cada plano.
- [ ] Refazer a tabela acima com os números reais, incluindo a taxa do Asaas e os impostos
- [ ] Decidir sobre o **Fluência** e o **Premium**, se ainda derem prejuízo:
  - [ ] a) menos horas pelo mesmo preço (ex.: 15 h e 22 h); ou
  - [ ] b) preço maior; ou
  - [ ] c) voz premium em parte das horas e, depois, a do navegador.
- [ ] Decidir sobre o **Teste 7 dias**: 2 a 3 horas, ou a voz do navegador
- [ ] Conferir se as **horas extras** dão margem depois das taxas
- [ ] Atualizar `docs/CUSTOS_IA.md`, a página de vendas e a tabela `planos`, e avisar os assinantes atuais antes de qualquer mudança de preço

Como conferir: todos os planos com margem positiva mesmo com uso alto
(80% das horas).

### 10. Estorno e contestação (Claude)

- [ ] Tratar a contestação no cartão (chargeback) no webhook do Asaas
- [ ] Mostrar as contestações em Admin → Financeiro

Como conferir: um teste no sandbox marca a contestação e corta o acesso.

---

## 🟢 Fase 3: lançamento seguro

- [ ] **Turma piloto:** 5 a 10 alunos conhecidos usando por 2 semanas
- [ ] Recolher a opinião deles e corrigir o que aparecer
- [ ] **Canal de suporte** definido (WhatsApp ou e-mail), com prazo de resposta
- [ ] Combinar a rotina: testar → um deploy → conferir o site
- [ ] Só então anunciar e abrir as vendas

---

## ✔️ Já feito

- [x] Domínio com HTTPS: app., raiz e www de soubilingue.com.br
- [x] Banco novo restaurado, com RLS em todas as tabelas
- [x] Reembolso de 7 dias pelo app + `/admin/reembolsos`
- [x] Painel admin: visão geral, alunos, tutores, custos, financeiro e assinaturas, com auditoria
- [x] Assistente de dúvidas na página de vendas
- [x] Horas por conversa ativa, extrato, horas extras e renovação mensal (Fase 3)
- [x] Health check `npm run saude` e agente de manutenção
- [x] Testes automáticos: 272 unitários + 51 de integração
