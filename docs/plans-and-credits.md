# Planos, assinatura e cancelamento

Planos pagos: tabela `planos` (preço, horas/mês). Regras comerciais em
`src/lib/billing/planos.ts`; custos em `docs/CUSTOS_IA.md`.

## Caminho até a primeira aula (27 set 2026)

```
Página de vendas (plano escolhido) → /cadastro (conta) → /checkout (plano já marcado)
  → página do Asaas → webhook confirma → /boas-vindas (entrevista) → /aluno/aula
```

- O cadastro já cria o aluno com valores iniciais (`garantirAluno`, em
  `src/lib/auth/profile.ts`): inglês, professora Clara, faixa "básico".
- A entrevista de boas-vindas confirma idioma e objetivos (e atualiza
  `alunos.idioma`); o professor é trocado na tela da aula.
- Quando o pagamento é confirmado, o webhook grava a faixa de certificação do
  plano pago (`planoDaCertificacao`: Essencial → básico, Fluência →
  intermediário, Premium → avançado).
- As 5 etapas antigas (`/cadastro/onboarding/*`) redirecionam para o checkout
  (`next.config.mjs`); os arquivos ficaram no repositório — apagar a regra de
  redirecionamento as reativa.

## Cancelamento pelo aluno

Onde: **/assinatura** (menu "Minha assinatura" e Meu perfil → Assinatura).
Fica fora de `/aluno` para funcionar mesmo antes da entrevista.

Política (27 set 2026 — revisar com jurídico):

| Situação | O que acontece |
|---|---|
| Assinatura ativa | A recorrente é removida no Asaas (`DELETE /v3/subscriptions/{id}`, doc oficial): nenhuma cobrança nova. O acesso continua até `acesso_ate` = o mais tarde entre o fim do ciclo, um mês após o último pagamento confirmado e hoje. |
| 1ª mensalidade ainda não paga | A cobrança pendente é removida (`DELETE /v3/payments/{id}`) e a assinatura fica `cancelada`. |
| Já cancelada | Nada se repete (idempotente). |

- Motivo opcional (lista fixa); confirmação por caixa de seleção.
- Histórico financeiro nunca é apagado (`payments` fica como está).
- Depois de `acesso_ate`, `getActiveSubscription` deixa de devolver a
  assinatura — a aula e as rotas de IA passam a pedir um plano.
- Reembolso **não** é automático no cancelamento (ver fluxo de reembolso,
  quando implementado).

Código: `src/lib/billing/cancelamento.ts` (operação),
`src/lib/billing/regras-cancelamento.ts` (regras puras), `src/app/assinatura/`.
Migration: 0017. Testes: `test/cancelamento.test.mjs`,
`test/integracao.cancelamento.test.mjs`.
