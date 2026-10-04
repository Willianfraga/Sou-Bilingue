# Fase 3 — horas e créditos (plano aprovado em 03/10/2026)

## Decisões do dono

- **Contagem:** só o tempo de **conversa ativa**, arredondado **por minuto**.
  É o mesmo critério do relógio da aula: para na pausa, no encerrar e quando
  o aluno sai.
- **Limite semanal:** não há.
- **Horas extras:** R$ 9,90 por hora, em pacotes de 5, 10 e 20 horas, sem
  "promoção" e com texto honesto. O preço fica no banco (`billing_config`).
- **Histórico antigo:** fica guardado, mas marcado como **inválido**, e não
  desconta nada.

## Problemas encontrados (antes da Fase 3)

1. **Contava tempo de relógio desde a abertura da página**, incluindo pausas
   e o tempo antes de iniciar.
2. **Sessões não fechavam quando o aluno saía:** houve sessões de 4 h e de
   44 h, e o extrato somava 60 h.
3. **Arredondava cada sessão para cima em horas cheias:** 2 minutos contavam
   1 hora.
4. **O desconto no saldo quebrava:** `session.subscription` não existia na
   consulta. O saldo nunca diminuía ("0 de 30 h").
5. **Horas eram números inteiros no banco:** `horas_total` e
   `horas_utilizadas` não aceitavam minutos.
6. **Não havia renovação mensal:** `renewSubscription` nunca era chamada.
7. **Horas extras compradas não entravam no saldo:** só gravavam no extrato.
8. **A compra de horas extras era inacessível e quebrada:**
   - não havia tela para comprar;
   - o seletor tinha textos enganosos ("melhor valor", "maior economia");
   - a ação usava `auth.admin` com o cliente de sessão, o que não funciona.
9. **Segurança:** o aluno podia **inserir** no extrato (`usage_ledger`) e
   **alterar** as próprias sessões (`usage_sessions`).
10. **Destino errado sem horas:** o bloqueio por falta de horas mandava para
    `/aluno/dashboard`, uma página antiga.

## Desenho

### Banco (migration 0025)

- **Horas com casas decimais:** `horas_total` e `horas_utilizadas` passam a
  `numeric(10,2)`, e `horas_restantes` continua calculada a partir delas.
- **Extrato (`usage_ledger`):**
  - novas colunas `valido`, `motivo` e `criado_por`;
  - tipos permitidos: `plano`, `uso`, `recarga`, `reposicao`, `ajuste`;
  - os lançamentos antigos ficam com `valido = false`.
- **Sessões:** as que estavam abertas são fechadas. O aluno perde a
  permissão de gravar no extrato e de alterar sessões.
- **Funções** (só o servidor executa):

  | Função | O que faz |
  |---|---|
  | `horas_iniciar_sessao` | Fecha sessões paradas do aluno, exige saldo e cria a sessão |
  | `horas_sinal` | Soma o tempo ativo informado, limitado pelo relógio do servidor (no máximo o tempo desde o último sinal + 2 s, até 60 s por sinal) e avisa se o saldo acabou |
  | `horas_encerrar_sessao` | Arredonda para o minuto mais próximo e desconta do saldo, registrando no extrato. É idempotente. Se a tutora falhou na sessão inteira, não cobra |
  | `horas_fechar_paradas` | Encerra sessões sem sinal há mais de 2 minutos (pg_cron a cada 5 minutos) |
  | `horas_conceder` | Reposição manual pelo admin, com motivo e auditoria |
  | `horas_renovar_ciclo` | Renovação mensal pelo pagamento recorrente, sem repetir para o mesmo pagamento. Zera o uso e devolve as horas do plano. Horas **extras e reposições não usadas passam para o ciclo seguinte**; horas do plano não usadas expiram |
  | `process_topup_payment` | Passa a somar as horas extras ao saldo do ciclo |

### App

- **Aula:** a sessão começa quando a conversa começa (e não ao abrir a
  página).
  - Envia um sinal a cada 30 s com o tempo ativo.
  - Encerra ao pausar ou encerrar.
  - Ao sair da página, encerra com `sendBeacon`.
  - Se o saldo acabar, pausa e avisa.
- **Webhook:** o pagamento recorrente confirmado renova o ciclo. O 1º
  pagamento define as horas do plano.
- **Minhas horas:** saldo, extrato (só lançamentos válidos) e compra de horas
  extras.
- **Admin:** extrato na ficha do aluno e botão "Conceder reposição" (função
  geral ou suporte).
- **Bloqueio por falta de horas:** passa a mandar para `/aluno/horas`.

## Limitações conhecidas

- **O tempo ativo vem do navegador.** O servidor só impede que passe do tempo
  real, e por isso um aluno mal-intencionado poderia informar menos tempo.
  O custo real (IA) continua registrado à parte no painel, então dá para
  comparar.

## Estado da implementação (03/10/2026)

**Pronto no código (testado localmente: 272 testes unitários e build ok):**

- `supabase/migrations/0025_horas_creditos.sql`: tudo do desenho acima.
  - A chave do preço é `preco_recarga_por_hora` (a mesma que o código já lia).
  - Corrige `process_topup_payment`, que gravava o id do Asaas ("pay_…")
    numa coluna uuid e falharia em toda compra. Agora grava em
    `asaas_payment_id`.
  - Aula de 0 minuto não gera lançamento no extrato.
- **Contagem na aula:**
  - `src/hooks/useSessaoDeAula.ts`: abre a sessão quando a conversa começa,
    manda sinal a cada 30 s, encerra depois de 60 s de pausa, ao sair da
    página (`sendBeacon` → `/api/aula/sessao`) e quando o saldo acaba.
  - `src/lib/billing/sessoes-de-aula.ts` chama as funções do banco.
  - `src/app/aluno/sessions/actions.ts` traz as ações.
  - Saíram `src/lib/billing/sessions.ts` e `src/hooks/useUsageSession.ts`
    (contagem antiga).
- **Minhas horas** (`/aluno/horas`): saldo em h/min, data de renovação,
  compra de 5/10/20 h a R$ 9,90/h e extrato.
  - `src/lib/billing/topups.ts` usa o cliente admin.
  - Saíram `TopupSelector`, com textos enganosos, e a ação pública
    `confirmTopupPaymentAction`. Era uma brecha: qualquer aluno podia
    chamá-la. Agora a confirmação vem só do webhook.
- **Webhook:** o pagamento confirmado chama `horas_renovar_ciclo`, tanto na
  1ª mensalidade quanto em cada renovação.
- **Admin:** a ficha do aluno mostra o extrato e tem o formulário "Conceder
  reposição" (função geral ou suporte, com motivo e auditoria).
- **Sem horas:** o aluno vai para `/aluno/horas`.
- **Testes:**
  - `test/horas.test.mjs` (unitário);
  - `test/integracao.horas.test.mjs` (banco real), que só roda depois da
    migration.

**Falta:**

1. Aplicar a migration 0025 no banco.
   - Foi bloqueada pela permissão automática: precisa do dono.
2. `npm run test:integracao`.
3. Publicar (o código depende da migration, então aplicar ANTES do deploy).
