-- Reajuste de 27 set 2026: +R$ 9,90 em cada mensalidade, mesmas horas
-- (análise de custo em docs/CUSTOS_IA.md). O plano de teste não muda.
-- Assinaturas já ativas no Asaas mantêm o valor antigo — o Asaas cobra o
-- valor gravado na assinatura, não o desta tabela.
update public.planos set preco = 59.80  where nome = 'essencial';
update public.planos set preco = 109.80 where nome = 'fluencia';
update public.planos set preco = 169.80 where nome = 'premium';

-- 1ª mensalidade com 50% de desconto: vira uma cobrança avulsa no Asaas; a
-- assinatura recorrente (preço cheio, a partir do mês seguinte) só é criada
-- quando essa cobrança é paga — ver src/lib/billing/subscription.ts e o
-- webhook do Asaas.
alter table public.subscriptions
  add column if not exists asaas_primeira_cobranca_id text,
  add column if not exists valor_primeira_mensalidade numeric(10, 2);
