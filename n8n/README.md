# Workflows n8n — SouBilingue

Mesmo princípio do projeto "academia flow": o workflow é **orquestrador**, não
dono da regra de negócio. Quem decide se o certificado sai é
`src/lib/certificacao/fechamento.ts`, chamado pela rota — o n8n só aciona no
horário certo e registra o resultado. A rota é idempotente (checagem prévia +
`unique(aluno_id, mes_referencia)` no banco), então rodar duas vezes não
duplica certificado nenhum.

**Pré-requisito:** o app precisa estar hospedado num lugar que o n8n alcance
— hoje só roda em `localhost`, então este workflow fica pronto pra importar,
mas **inerte** até o deploy existir de verdade.

## Variáveis do n8n

Em **Settings → Variables** (ou nas variáveis de ambiente do container):

| Nome | Valor |
|---|---|
| `SB_BASE_URL` | URL da aplicação em produção, ex.: `https://soubilingue.com.br` |
| `SB_CRON_SECRET` | Igual ao `CRON_SECRET` do `.env.local`/`.env` de produção |

## Credenciais

Crie uma credencial do tipo **Header Auth**:

| Nome | Header | Valor |
|---|---|---|
| `SouBilingue Cron` | `Authorization` | `Bearer {{$env.SB_CRON_SECRET}}` |

## Workflows entregues

| # | Arquivo | O que faz | Gatilho |
|---|---|---|---|
| 01 | `wf01_fechamento_mensal.json` | Fecha o mês anterior: emite certificado pra quem bateu 100% da cota nas 4 semanas | Cron — dia 1, 04:00 |

Roda às 04h (uma hora depois do horário de cobrança do academia flow, 03h) só
pra não competir por recurso se os dois workflows um dia rodarem no mesmo
n8n. O nó "Calcular mês anterior" existe porque o job, sem `ano`/`mes`
explícitos, fecharia o mês **corrente** (que acabou de começar) — o workflow
sempre manda o mês que **terminou**.

## Jobs que existem mas ainda não têm workflow n8n

Nenhum, por enquanto — só existe essa rota de job hoje
(`POST /api/jobs/fechamento-mensal`). Quando o cadastro público e o pagamento
(Asaas) existirem, é esperado que apareçam workflows equivalentes aos 03/04/05
do academia flow (gerar cobrança, régua de vencimento) e um 06 pro webhook do
Asaas — mesmo padrão, chamando a rota da aplicação e deixando a decisão lá.

## Importando

1. n8n → **Import from File** → selecione `wf01_fechamento_mensal.json`.
2. Abra o nó "Fechar o mês" e escolha a credencial `SouBilingue Cron` (o
   import não leva credenciais).
3. Ative o workflow.

## Como saber se está funcionando

O nó "Registrar resultado" loga `emitidos`, `já tinham` e `não elegíveis` no
histórico de execuções do n8n. `emitidos = 0` todo mês não é sinal de erro por
si só — só significa que nenhum aluno bateu 100% da cota nas 4 semanas daquele
mês.
