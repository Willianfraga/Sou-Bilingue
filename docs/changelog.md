# Histórico de mudanças

## 27 set 2026 — assistente de dúvidas, política de reembolso e contato

- Assistente com IA da página de vendas até o checkout (`docs/assistente-vendas.md`): responde só com dados reais (planos do banco, FAQ, fatos do produto, políticas), faz perguntas para entender o visitante, convite proativo, liga/desliga no admin, limites por IP e teto diário. Nada da conversa é gravado.
- Página pública `/reembolso` com a política e a base legal (CDC e Decreto 7.962/2013).
- Página `/contato` com canais, horário e dados da empresa preenchidos no admin (vazio = "em breve").
- Fatos do produto (professores, passos, benefícios, comparação) movidos para `src/lib/vendas/produto.ts`, usados pela página e pelo assistente.
- Migration 0019 (aplicada): eventos `assistente_aberto` e `assistente_pergunta` no funil.

## 27 set 2026 — reembolso (7 dias) separado do cancelamento

- **Correção urgente:** o banco recusava assinatura `pendente`, então nenhum
  checkout conseguia começar (restrição `subscriptions_status_check`
  restaurada do backup). Corrigido na migration 0018.
- Pedido de reembolso em `/assinatura`, separado de "Cancelar renovação":
  - dentro dos 7 dias: integral, sem motivo, com senha e protocolo; estorno
    enviado ao Asaas;
  - depois dos 7 dias: motivo obrigatório e análise do admin.
- Estados `REQUESTED` → `UNDER_REVIEW` / `APPROVED` / `REJECTED` →
  `PROCESSING` → `REFUNDED` / `FAILED`. "Reembolsado" só é marcado pelo
  webhook do Asaas.
- Webhook:
  - trata os eventos de estorno;
  - evento repetido ou fora de ordem não regride o estado;
  - um reenvio de confirmação não reativa um pagamento estornado nem muda a
    data do 1º pagamento (que é o início do prazo).
- `/admin/reembolsos`: aprovar, negar, reprocessar e anotar, sempre com
  justificativa, numa trilha só de acréscimo (`reembolso_eventos`).
- Política exibida na página de vendas (FAQ e "Sem surpresas"), no checkout,
  nos termos (`/termos#cancelamento`) e em Minha assinatura.
- Tabelas `reembolsos` e `reembolso_eventos` (migration 0018, aplicada).
- Detalhes em `docs/refund-policy.md`.

## 27 set 2026 — cancelamento pelo app, depoimentos, vídeo e caminho curto

- Cancelamento pelo próprio aluno em `/assinatura` (migration 0017); corrigida
  a chamada de cancelamento do Asaas (era PUT com status inválido; agora
  DELETE, conforme a documentação oficial).
- Depoimentos enviados pelos alunos com autorização e aprovados no admin.
- Espaço para vídeo de aula real (YouTube/Vimeo, carregado só no clique).
- Caminho curto: cadastro → checkout; as 5 etapas antigas redirecionam.
- Cupom de desconto na URL retirado.
- Botões de chamada para ação maiores.

## 27 set 2026 — nova página de vendas

- Redesenho completo (`docs/sales-page.md`): topo escuro futurista com a
  professora virtual, demonstração de conversa, como funciona interativo,
  comparação, planos do banco, FAQ e botão fixo no celular.
- Removidas promessas falsas da página antiga ("7 dias grátis", "Sem cartão",
  "Cancele quando quiser", "Método comprovado"); links "#" do rodapé
  substituídos por `/termos` e `/privacidade` (preliminares).
- Área `/admin/pagina-de-vendas` e tabela `pagina_vendas` (migration 0016).
- Métricas do funil sem dados pessoais (`eventos_funil`); compra só conta
  pelo webhook. Parâmetros de campanha preservados até o checkout, que abre
  com o plano escolhido.
- Build com um processo só (`next.config.mjs`) por causa da pouca memória.

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
