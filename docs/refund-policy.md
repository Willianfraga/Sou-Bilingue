# Política de cancelamento e reembolso

> **Recomendação:** revisão jurídica antes de vender de verdade. O texto dos
> termos (`/termos#cancelamento`) e as mensagens do app seguem o CDC art. 49
> (direito de arrependimento em compra fora do estabelecimento), mas não
> substituem a análise de um advogado.

Provedor de pagamento: **Asaas**. O pedido original citava "Kiwify", mas o
dono decidiu manter o Asaas (27 set 2026).

## Duas ações separadas

| Ação | O que faz | Devolve dinheiro? |
|---|---|---|
| **Cancelar renovação** | Remove a assinatura recorrente no Asaas. As próximas cobranças param na hora, e o acesso segue até o fim do período pago. | Não |
| **Solicitar reembolso** | Pede o estorno do pagamento já feito. | Sim, se dentro do prazo ou se o pedido for aprovado |

As duas ficam em **Minha assinatura** (`/assinatura`), com botões e formulários
separados. Essa página fica fora de `/aluno` e funciona mesmo antes da
entrevista.

## Cálculo dos 7 dias

- O prazo começa na **data de confirmação do 1º pagamento** da assinatura
  (`payments.data_pagamento`, gravada pelo webhook na primeira confirmação).
  Reenvios do webhook não empurram essa data.
- Ele vale até as **23:59:59.999, horário de Brasília**, do **7º dia corrido**
  depois dessa data. Exemplo: pago em 10/09, o prazo vai até 17/09 às 23:59:59.
- O fuso é `America/Sao_Paulo`, que desde 2019 fica fixo em UTC−3.
- O cálculo é feito só no servidor
  (`src/lib/billing/regras-reembolso.ts` → `fimDoPrazo`, `dentroDoPrazo`).
  Nenhum dado de data, valor ou status vindo do navegador é usado.

## Dentro do prazo

1. O aluno informa o motivo se quiser, pode deixar um comentário, confirma a
   senha e marca a confirmação.
2. O app mostra o valor integral antes do envio.
3. O servidor cria o pedido (`REQUESTED`) com um **protocolo**
   `RB-AAAAMMDD-XXXXXX` e cancela a renovação.
4. O servidor chama `POST /v3/payments/{id}/refund` no Asaas. O pedido fica
   `PROCESSING` ou, se o Asaas recusar, `FAILED` com o erro.
5. O acesso **só termina** quando o Asaas confirma o estorno (webhook
   `PAYMENT_REFUNDED`). Nesse momento:
   - o pagamento vira `estornado`;
   - a assinatura vira `cancelada` com `acesso_ate` = hoje;
   - a recorrência é removida de novo por segurança.

## Depois do prazo

- Cancelar a renovação continua disponível a qualquer momento. O acesso
  segue até o fim do período pago.
- O pedido de reembolso **exige um motivo** da lista e fica `UNDER_REVIEW`.
  **Nada é estornado automaticamente.**
- Motivos que indicam uma hipótese legal aparecem com o selo "prioridade" no
  admin:
  - cobrança indevida ou duplicada;
  - não reconheço a compra;
  - problemas técnicos.
- O app nunca diz que "nenhum reembolso é possível": os direitos legais
  continuam valendo.

## Estados

**Reembolso** (tabela `reembolsos`):

| Estado | Significado |
|---|---|
| *(sem linha)* | `NOT_REQUESTED` |
| `REQUESTED` | Pedido dentro do prazo registrado; vai para o Asaas em seguida |
| `UNDER_REVIEW` | Fora do prazo; aguarda o admin |
| `APPROVED` | Admin aprovou; o estorno é enviado em seguida |
| `REJECTED` | Admin negou (final) |
| `PROCESSING` | Enviado ao Asaas; aguarda confirmação |
| `REFUNDED` | Asaas confirmou (final) — **só o webhook marca isto** |
| `FAILED` | O Asaas recusou; o admin pode reprocessar ou negar |

Regras de transição (`podeMudar`):
- um estado nunca volta para trás;
- evento repetido ou fora de ordem é ignorado e fica registrado como
  `evento_ignorado`;
- depois de `PROCESSING`, só o Asaas decide o resultado (`REFUNDED` ou
  `FAILED`), e o admin não pode mais negar.

**Cancelamento** (colunas de `subscriptions`):

| Estado pedido | Como aparece no banco |
|---|---|
| `ACTIVE` | `status='ativa'` e `cancelamento_solicitado_em` nulo |
| `CANCELLATION_REQUESTED` / `SCHEDULED_TO_CANCEL` | `status='ativa'`, `cancelamento_solicitado_em` preenchido, acesso até `acesso_ate` |
| `CANCELLED` | `status='cancelada'` (assinatura pendente cancelada, ou reembolso confirmado) |
| `CANCELLATION_FAILED` | O Asaas falhou: nada muda no banco, o aluno vê um erro e pode tentar de novo |

## Eventos do Asaas tratados

| Evento | Efeito no pedido |
|---|---|
| `PAYMENT_REFUND_IN_PROGRESS` | `PROCESSING` |
| `PAYMENT_REFUNDED` | `REFUNDED` + encerra o acesso |
| `PAYMENT_PARTIALLY_REFUNDED` | `REFUNDED` (o valor exato fica no Asaas) |
| `PAYMENT_REFUND_DENIED` | `FAILED` |

- Um estorno feito **direto no painel do Asaas**, sem pedido no app, cria um
  registro automático com o comentário "Estorno feito diretamente no painel
  do Asaas", para que o histórico fique completo.
- Um evento de cobrança que não é deste app é ignorado.
- `PAYMENT_CHARGEBACK_*` (contestação no cartão) **ainda não é tratado**
  automaticamente: acompanhe pelo painel do Asaas.

## Procedimento administrativo (`/admin/reembolsos`)

- O admin vê todos os pedidos com:
  - aluno, protocolo e valor;
  - dentro ou fora do prazo, com a data-limite;
  - motivo e comentário;
  - erro, se houver;
  - histórico completo.
- As ações disponíveis são **Aprovar e estornar**, **Negar**, **Reprocessar**
  (quando houve falha) e **Só anotar**.
- Toda ação exige um texto de justificativa ou observação. Ela é gravada em
  `reembolso_eventos` com o admin (da sessão), a data e o texto.
- A trilha **só cresce**: não há policy de update/delete, e o app nunca altera
  eventos anteriores.
- Aprove um pedido fora do prazo só quando houver uma hipótese legal:
  - duplicidade ou cobrança indevida (confira no extrato do Asaas);
  - falha na prestação do serviço;
  - descumprimento da oferta.

## Segurança

- Tudo roda no servidor:
  - o `aluno_id` vem sempre da sessão;
  - o valor e o pagamento vêm do banco;
  - o formulário só envia motivo, comentário, confirmação e senha.
- **Reautenticação:** o reembolso imediato pede a senha de novo. Ela é
  conferida num cliente descartável, sem mexer na sessão atual.
- **Rate limit:** 5 pedidos a cada 10 minutos por aluno.
- **Idempotência:** existe um pedido por pagamento. O índice único
  `reembolsos_um_ativo_por_pagamento` segura cliques duplos, e pedir de novo
  devolve o mesmo protocolo. Uma trava otimista no `update`
  (`.eq("status", anterior)`) impede duas decisões simultâneas.
- **RLS:**
  - o aluno só **lê** os próprios pedidos e não grava nada;
  - a auditoria é visível só para o admin.
- **Sem dados de cartão.** Os erros do Asaas são gravados só como mensagem,
  limitada a 500 caracteres.
- Os registros financeiros (`payments`, `reembolsos`, `reembolso_eventos`)
  nunca são apagados. `reembolsos.aluno_id` usa `on delete restrict`, por
  obrigação legal de guarda (LGPD art. 16).
- E-mail de confirmação: **não enviado**, porque o app não tem serviço de
  e-mail configurado. O protocolo aparece na tela e em Minha assinatura.

## Variáveis de ambiente

Nenhuma nova. Usa as que já existem: `ASAAS_API_KEY`, `ASAAS_API_URL` e
`ASAAS_WEBHOOK_TOKEN` (ver `docs/payment-security.md`). No painel do Asaas, o
webhook precisa ter os eventos de **estorno** marcados, além dos de
pagamento.

## Testes

- `test/reembolso.test.mjs` (unitário):
  - prazo dentro, exatamente no limite, 1 ms depois e depois;
  - fuso de Brasília e virada de mês e de ano;
  - motivo opcional ou obrigatório;
  - duplicidade aceita para análise;
  - estados que não regridem, evento repetido;
  - solicitado × reembolsado;
  - ações usam só o id da sessão;
  - botões separados;
  - admin exige papel e justificativa;
  - política presente nos 4 lugares.
- `test/integracao.reembolso.test.mjs` (banco real + Asaas falso local):
  - fluxo completo dentro do prazo;
  - pedido repetido;
  - webhook repetido e fora de ordem;
  - fora do prazo com duplicidade → análise → aprovação auditada;
  - admin não nega depois de enviado;
  - falha do Asaas → `FAILED` → reprocessar;
  - estorno feito no painel;
  - RLS (outro aluno não lê, aluno não grava nem altera, auditoria só admin).
- `test/e2e.webhook.test.js`: evento de estorno de uma cobrança de fora do app
  é aceito sem criar pedido.
- Isolamento entre alunos: as ações usam `sessao.userId`, e a integração cobre
  que o aluno B não lê nem altera os pedidos do A.
