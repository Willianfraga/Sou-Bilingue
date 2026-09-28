# Segurança de pagamentos e dados

Provedor: **Asaas** (checkout hospedado — o app nunca vê cartão, CVV nem
dados bancários). Decisão de 27 set 2026: manter o Asaas (a Kiwify foi
avaliada; trocar seria mudança estrutural).

## Como um pagamento libera acesso

```
Checkout (/checkout) ──> cobrança no Asaas ──> aluno paga na página do Asaas
                                                     │
                     POST /api/webhooks/asaas <──────┘  (token do Asaas)
                                │
      registra em webhook_events (resumo, sem dados pessoais)
                                │
      1ª mensalidade paga ──> subscriptions.status = 'ativa'
                          └─> cria a assinatura recorrente (preço cheio, mês seguinte)
```

- **Acesso só depois do webhook.** O retorno do navegador (`?pagamento=sucesso`)
  não libera nada.
- **Preço vem do banco** (`planos`), nunca do navegador. Desconto da 1ª
  mensalidade calculado no servidor (`src/lib/billing/planos.ts`).
- **Autenticidade:** header `asaas-access-token` comparado em tempo constante
  com `ASAAS_WEBHOOK_TOKEN` (`validateWebhookSignature`). O Asaas não assina o
  corpo com HMAC; o token é o mecanismo oficial dele.
- **Idempotência:** `webhook_events (provider, event_id)` único; pagamentos por
  `payments.asaas_payment_id` (upsert); recarga pela função
  `process_topup_payment` + índice único; a recorrente só é criada se
  `asaas_subscription_id` ainda estiver vazio; a 1ª mensalidade confere o id da
  cobrança registrada.
- **Reprocessamento seguro:** reenvio de um evento que falhou (status `erro`,
  ou `processando` há mais de 5 min) é reclamado de forma atômica e processado
  de novo; `tentativas` conta as vezes. Evento `processado` nunca repete.

### Reprocessar um webhook manualmente

1. No painel do Asaas → Integrações → Webhooks → fila, reenvie o evento.
2. Confira em `webhook_events` (`status`, `tentativas`, `process_error`).
3. Nunca apague a linha para "forçar" — o reenvio já é seguro.

## Medidas aplicadas (Fase 0, 27 set 2026)

| Medida | Onde |
|---|---|
| Rotas de IA exigem plano ativo com horas (402 sem plano) | `src/lib/billing/acesso.ts` |
| Limite de requisições (IA por aluno; cadastro e senha por IP) | `src/lib/seguranca/limite.ts` |
| Webhook liberado no middleware (antes era redirecionado ao login) | `src/middleware.ts` |
| Evento guardado sem nome/e-mail/CPF do comprador | `resumoDoEvento` no webhook |
| Log de falha só com mensagem, sem objeto de erro | webhook |
| Next.js 15.5.26 (falha crítica de execução remota na otimização de imagens) | `package.json` |
| Contas de teste sem senha no repositório (público) | `scripts/seed-usuarios-teste.mjs` |
| RLS: cada aluno só lê os próprios dados; escrita financeira só pelo servidor | migrations |

## Limitações conhecidas

- Limite de requisições em memória: zera ao reiniciar e não é compartilhado
  entre instâncias. Se escalar, mover para banco/Redis.
- PostCSS embutido no Next 15 tem alerta alto; só processa o CSS do próprio
  projeto no build. Correção exige Next 16 (versão maior) — não aplicada
  automaticamente.
- Produção ainda aponta para o **Asaas sandbox** — nenhuma cobrança real
  acontece até trocar `ASAAS_API_URL`/`ASAAS_API_KEY` para produção.

## Retenção de dados

- `webhook_events`: guarda só ids, tipo, valor e status — mantido como trilha
  de auditoria financeira.
- `payments`, `subscriptions`, `hour_topups`: nunca apagados em cancelamento,
  reembolso ou chargeback — o status muda, o histórico fica.

## Checklist antes de vender de verdade

- [ ] Trocar todas as chaves que foram expostas (ver `docs/changelog.md`, 27 set).
- [ ] `ASAAS_API_URL` e `ASAAS_API_KEY` de produção no Coolify.
- [ ] Webhook do Asaas apontando para `https://app.soubilingue.com.br/api/webhooks/asaas`
      com o token igual a `ASAAS_WEBHOOK_TOKEN`.
- [ ] Um pagamento real de ponta a ponta (valor mínimo) antes da divulgação.
