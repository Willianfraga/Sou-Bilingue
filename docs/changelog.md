# Histórico de mudanças

## 27 set 2026 — Fase 0 (auditoria e segurança) + preços

**Segurança**
- Senhas das 4 contas de teste trocadas (estavam no repositório público,
  incluindo um admin); script de seed passa a ler `TEST_ACCOUNTS_PASSWORD`.
- Next.js 15.5.23 → 15.5.26 (execução remota de código na otimização de imagens).
- Webhook do Asaas: liberado no middleware (antes nunca chegava), tabela
  `webhook_events` criada (faltava no banco restaurado), reprocessamento
  seguro, registro sem dados pessoais.
- Rotas de IA exigem plano ativo com horas; limite de requisições.
- **Incidente:** durante a auditoria, valores das variáveis secretas de
  produção foram exibidos na conversa de trabalho com o assistente. Não foram
  para o repositório. Ação: trocar Supabase secret, Anthropic, Asaas (chave e
  token de webhook), ElevenLabs, Tavus e `CRON_SECRET`.

**Produto**
- Preços +R$ 9,90 (Essencial R$ 59,80, Fluência R$ 109,80, Premium R$ 169,80),
  mesmas horas; 1ª mensalidade com 50% de desconto (implementado de verdade).
- Página de vendas lê os planos do banco (antes mostrava planos que não
  existiam no checkout); botões levam ao cadastro.
- Plano Essencial usa a voz gratuita do navegador; cache da IA corrigido.
- Aula começa com "Ok, estou pronto, vamos começar a aula."

## 27 set 2026 — entrevista de boas-vindas e prompt do professor

- `/boas-vindas` (15 perguntas), `buildStudentContext`, prompt v2
  (`docs/PROMPT_PROFESSOR.md`), ilustrações anime dos tutores, cadastro com
  confirmação de e-mail.
