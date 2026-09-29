-- Painel — Fase C: custos, ferramentas, orçamento e financeiro (29 set 2026).
-- Regras (docs/admin-painel.md):
--  * dinheiro em numeric, sempre com moeda; conversão guarda taxa, data e fonte;
--  * estimado e confirmado nunca se misturam (coluna natureza);
--  * lançamento não é apagado: é cancelado com motivo (histórico mantido);
--  * escrita só pelo servidor (service role), leitura para financeiro/analista.

-- Fornecedores e ferramentas ---------------------------------------------------------
create table if not exists public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 2 and 80),
  categoria text not null,
  empresa text check (empresa is null or char_length(empresa) <= 80),
  plano_contratado text check (plano_contratado is null or char_length(plano_contratado) <= 80),
  tipo_cobranca text not null check (tipo_cobranca in ('fixo', 'variavel', 'misto', 'anual', 'avulso')),
  moeda text not null default 'BRL' check (moeda in ('BRL', 'USD', 'EUR')),
  valor_fixo_mensal numeric(12, 2) check (valor_fixo_mensal is null or valor_fixo_mensal >= 0),
  custo_variavel text check (custo_variavel is null or char_length(custo_variavel) <= 200), -- ex.: "US$ 1 por milhão de tokens"
  franquia text check (franquia is null or char_length(franquia) <= 200),
  unidade_consumo text check (unidade_consumo is null or char_length(unidade_consumo) <= 40),
  dia_vencimento integer check (dia_vencimento is null or dia_vencimento between 1 and 31),
  inicio_cobranca date,
  centro_custo text check (centro_custo is null or char_length(centro_custo) <= 60),
  responsavel text check (responsavel is null or char_length(responsavel) <= 80),
  status text not null default 'ativo' check (status in ('ativo', 'teste', 'cancelado')),
  link_painel text check (link_painel is null or link_painel ~ '^https://'),
  provedor_ia text check (provedor_ia is null or provedor_ia in ('anthropic', 'elevenlabs')),
  observacoes text check (observacoes is null or char_length(observacoes) <= 1000),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references public.profiles (id) on delete set null
);
alter table public.fornecedores enable row level security;
drop policy if exists "financeiro le fornecedores" on public.fornecedores;
create policy "financeiro le fornecedores" on public.fornecedores for select using (app.tem_funcao('financeiro') or app.tem_funcao('analista'));

-- Lançamentos de custo (faturas, estimativas, impostos, taxas manuais) -------------
create table if not exists public.lancamentos_custo (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid references public.fornecedores (id) on delete set null,
  categoria text not null,
  tipo_custo text not null check (tipo_custo in ('fixo', 'variavel')),
  descricao text not null check (char_length(descricao) between 2 and 200),
  competencia date not null check (extract(day from competencia) = 1), -- 1º dia do mês de referência
  valor_original numeric(14, 2) not null check (valor_original >= 0),
  moeda text not null check (moeda in ('BRL', 'USD', 'EUR')),
  taxa_cambio numeric(12, 6) not null check (taxa_cambio > 0), -- 1 para BRL
  data_cambio date not null,
  fonte_cambio text not null check (char_length(fonte_cambio) <= 120),
  valor_brl numeric(14, 2) not null check (valor_brl >= 0),
  natureza text not null check (natureza in ('estimado', 'confirmado')),
  origem text not null default 'manual' check (origem in ('manual', 'fatura', 'importacao_api')),
  comprovante text check (comprovante is null or comprovante ~ '^https://'),
  criado_por uuid references public.profiles (id) on delete set null,
  criado_em timestamptz not null default now(),
  cancelado_em timestamptz,
  cancelado_por uuid references public.profiles (id) on delete set null,
  motivo_cancelamento text check (motivo_cancelamento is null or char_length(motivo_cancelamento) <= 500)
);
create index if not exists lancamentos_competencia on public.lancamentos_custo (competencia) where cancelado_em is null;
create index if not exists lancamentos_fornecedor on public.lancamentos_custo (fornecedor_id, competencia);
alter table public.lancamentos_custo enable row level security;
drop policy if exists "financeiro le lancamentos" on public.lancamentos_custo;
create policy "financeiro le lancamentos" on public.lancamentos_custo for select using (app.tem_funcao('financeiro') or app.tem_funcao('analista'));

-- Orçamento mensal por categoria ('total' = orçamento geral do mês) ------------------
create table if not exists public.orcamentos (
  competencia date not null check (extract(day from competencia) = 1),
  categoria text not null,
  valor_brl numeric(14, 2) not null check (valor_brl >= 0),
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references public.profiles (id) on delete set null,
  primary key (competencia, categoria)
);
alter table public.orcamentos enable row level security;
drop policy if exists "financeiro le orcamentos" on public.orcamentos;
create policy "financeiro le orcamentos" on public.orcamentos for select using (app.tem_funcao('financeiro') or app.tem_funcao('analista'));

-- Demonstrativo mensal (dados brutos; a regra estimado × confirmado fica no
-- servidor, em src/lib/financeiro/demonstrativo.ts) ---------------------------------
create or replace function public.admin_financeiro_mensal(p_de date, p_ate date) returns jsonb
language sql stable security definer set search_path = public as $$
with meses as (
  select generate_series(date_trunc('month', p_de::timestamp), date_trunc('month', p_ate::timestamp), interval '1 month')::date as mes
)
select coalesce(jsonb_agg(jsonb_build_object(
  'mes', m.mes,
  'receita_assinaturas', (select coalesce(sum(valor), 0) from payments where status in ('pago', 'estornado') and date_trunc('month', data_pagamento)::date = m.mes),
  'pagamentos_pagos', (select count(*) from payments where status in ('pago', 'estornado') and date_trunc('month', data_pagamento)::date = m.mes),
  'taxas_gateway', (select coalesce(sum(valor - valor_liquido), 0) from payments where status in ('pago', 'estornado') and valor_liquido is not null and date_trunc('month', data_pagamento)::date = m.mes),
  'pagamentos_sem_liquido', (select count(*) from payments where status in ('pago', 'estornado') and valor_liquido is null and date_trunc('month', data_pagamento)::date = m.mes),
  'receita_horas_extras', (select coalesce(sum(valor), 0) from hour_topups where status = 'ativa' and date_trunc('month', criada_em at time zone 'America/Sao_Paulo')::date = m.mes),
  'reembolsos', (select coalesce(sum(valor), 0) from reembolsos where status = 'REFUNDED' and date_trunc('month', atualizado_em at time zone 'America/Sao_Paulo')::date = m.mes),
  'ia_estimado_usd', (select coalesce(jsonb_object_agg(provider, c), '{}'::jsonb) from (
      select provider, sum(estimated_cost_usd) c from ai_usage_events
      where date_trunc('month', created_at at time zone 'America/Sao_Paulo')::date = m.mes group by provider) x),
  'lancamentos', (select coalesce(jsonb_agg(jsonb_build_object('fornecedor_id', fornecedor_id, 'categoria', categoria, 'tipo', tipo_custo, 'natureza', natureza, 'valor_brl', valor_brl)), '[]'::jsonb)
      from lancamentos_custo where competencia = m.mes and cancelado_em is null),
  'orcamento', (select coalesce(jsonb_object_agg(categoria, valor_brl), '{}'::jsonb) from orcamentos where competencia = m.mes),
  'pagantes', (select count(distinct aluno_id) from payments where status in ('pago', 'estornado') and date_trunc('month', data_pagamento)::date = m.mes),
  'ativos', (select count(distinct aluno_id) from (
      select aluno_id, iniciada_em as em from usage_sessions
      union all select aluno_id, criado_em from mensagens where papel = 'aluno') a
      where date_trunc('month', em at time zone 'America/Sao_Paulo')::date = m.mes)
) order by m.mes), '[]'::jsonb)
from meses m;
$$;

-- Margem por plano e por idioma no período (receita confirmada × custo de IA
-- estimado dos alunos daquele plano/idioma) --------------------------------------------
create or replace function public.admin_margens(p_de timestamptz, p_ate timestamptz) returns jsonb
language sql stable security definer set search_path = public as $$
with plano_do_aluno as (
  select distinct on (s.aluno_id) s.aluno_id, pl.nome as plano
  from subscriptions s join planos pl on pl.id = s.plano_id
  where s.criada_em < p_ate
  order by s.aluno_id, s.criada_em desc
),
receita as (
  select p.aluno_id, sum(p.valor) v from payments p
  where p.status in ('pago', 'estornado')
    and p.data_pagamento >= (p_de at time zone 'America/Sao_Paulo')::date and p.data_pagamento < (p_ate at time zone 'America/Sao_Paulo')::date
  group by p.aluno_id
),
custo as (
  select e.aluno_id, sum(e.estimated_cost_usd) c from ai_usage_events e
  where e.aluno_id is not null and e.created_at >= p_de and e.created_at < p_ate group by e.aluno_id
),
base as (
  select a.id, a.idioma::text as idioma, coalesce(pa.plano, 'sem_plano') as plano, coalesce(r.v, 0) as receita, coalesce(c.c, 0) as custo_usd
  from alunos a left join plano_do_aluno pa on pa.aluno_id = a.id left join receita r on r.aluno_id = a.id left join custo c on c.aluno_id = a.id
  where r.v is not null or c.c is not null
)
select jsonb_build_object(
  'por_plano', coalesce((select jsonb_agg(jsonb_build_object('chave', plano, 'alunos', n, 'pagantes', pg, 'receita', rec, 'custo_usd', cu) order by rec desc) from (
      select plano, count(*) n, count(*) filter (where receita > 0) pg, sum(receita) rec, sum(custo_usd) cu from base group by plano) x), '[]'::jsonb),
  'por_idioma', coalesce((select jsonb_agg(jsonb_build_object('chave', idioma, 'alunos', n, 'pagantes', pg, 'receita', rec, 'custo_usd', cu) order by rec desc) from (
      select idioma, count(*) n, count(*) filter (where receita > 0) pg, sum(receita) rec, sum(custo_usd) cu from base group by idioma) x), '[]'::jsonb),
  'assistente_vendas_usd', (select coalesce(sum(estimated_cost_usd), 0) from ai_usage_events where origem = 'assistente_vendas' and created_at >= p_de and created_at < p_ate)
);
$$;

-- Alertas de custo (pistas para revisão humana). p_taxa = câmbio USD→BRL. -------------
create or replace function public.admin_alertas_custos(p_taxa numeric) returns jsonb
language sql stable security definer set search_path = public as $$
with hoje as (select (now() at time zone 'America/Sao_Paulo')::date as d),
por_dia as (
  select (created_at at time zone 'America/Sao_Paulo')::date as dia, sum(estimated_cost_usd) c
  from ai_usage_events where created_at >= now() - interval '9 days' group by 1
),
dia_atual as (select coalesce((select c from por_dia where dia = (select d from hoje)), 0) as c),
media_7 as (select coalesce(sum(c), 0) / 7 as c from por_dia where dia >= (select d from hoje) - 7 and dia < (select d from hoje)),
mes_atual as (
  select coalesce(sum(estimated_cost_usd), 0) c from ai_usage_events
  where date_trunc('month', created_at at time zone 'America/Sao_Paulo') = date_trunc('month', now() at time zone 'America/Sao_Paulo')
),
mes_anterior as (
  select coalesce(sum(estimated_cost_usd), 0) c from ai_usage_events
  where date_trunc('month', created_at at time zone 'America/Sao_Paulo') = date_trunc('month', (now() at time zone 'America/Sao_Paulo') - interval '1 month')
),
dias_mes as (
  select extract(day from (now() at time zone 'America/Sao_Paulo'))::numeric as passados,
         extract(day from (date_trunc('month', now() at time zone 'America/Sao_Paulo') + interval '1 month - 1 day'))::numeric as total
),
caros as (
  select a.id, p.nome, sum(e.estimated_cost_usd) * p_taxa as custo_brl, pl.preco
  from ai_usage_events e
  join alunos a on a.id = e.aluno_id join profiles p on p.id = a.id
  join lateral (select s.plano_id from subscriptions s where s.aluno_id = a.id and s.status = 'ativa' order by s.criada_em desc limit 1) s on true
  join planos pl on pl.id = s.plano_id
  where e.created_at >= now() - interval '30 days'
  group by a.id, p.nome, pl.preco
  having sum(e.estimated_cost_usd) * p_taxa > pl.preco * 0.5
),
falhas as (
  select provider, count(*) n, count(*) filter (where status = 'erro') e from ai_usage_events
  where created_at >= now() - interval '24 hours' group by provider
  having count(*) >= 10 and count(*) filter (where status = 'erro')::numeric / count(*) >= 0.2
),
sem_receita as (
  select e.aluno_id, sum(e.estimated_cost_usd) c from ai_usage_events e
  where e.aluno_id is not null and e.created_at >= now() - interval '30 days'
    and not exists (select 1 from payments p where p.aluno_id = e.aluno_id and p.status = 'pago')
    and not exists (select 1 from hour_topups h where h.aluno_id = e.aluno_id and h.status = 'ativa')
  group by e.aluno_id
)
select coalesce(jsonb_agg(a), '[]'::jsonb) from (
  select jsonb_build_object('tipo', 'gasto_diario', 'nivel', 'atencao', 'titulo', 'Gasto de IA hoje acima do normal',
    'detalhe', format('Hoje: US$ %s; média dos 7 dias anteriores: US$ %s por dia.', round((select c from dia_atual), 2), round((select c from media_7), 2))) a
  where (select c from dia_atual) > greatest(2 * (select c from media_7), 0.5)
  union all
  select jsonb_build_object('tipo', 'projecao_mensal', 'nivel', 'atencao', 'titulo', 'Custo de IA do mês projetado bem acima do mês anterior',
    'detalhe', format('Projeção: US$ %s; mês anterior: US$ %s.', round((select c from mes_atual) / (select passados from dias_mes) * (select total from dias_mes), 2), round((select c from mes_anterior), 2)))
  where (select c from mes_anterior) >= 1
    and (select c from mes_atual) / (select passados from dias_mes) * (select total from dias_mes) > 1.5 * (select c from mes_anterior)
  union all
  select jsonb_build_object('tipo', 'custo_por_aluno', 'nivel', 'critico', 'titulo', format('%s aluno(s) com custo de IA acima de 50%% do plano', (select count(*) from caros)),
    'detalhe', (select string_agg(format('%s: R$ %s em 30 dias (plano R$ %s)', nome, round(custo_brl, 2), preco), '; ') from (select * from caros order by custo_brl desc limit 5) x))
  where exists (select 1 from caros) and p_taxa > 0
  union all
  select jsonb_build_object('tipo', 'falhas_fornecedor', 'nivel', 'critico', 'titulo', format('Falhas recorrentes em %s', provider),
    'detalhe', format('%s de %s chamadas com erro nas últimas 24 horas.', e, n)) from falhas
  union all
  select jsonb_build_object('tipo', 'consumo_sem_receita', 'nivel', 'atencao', 'titulo', format('%s aluno(s) consumindo IA sem pagamento confirmado', (select count(*) from sem_receita)),
    'detalhe', format('US$ %s em 30 dias. Podem ser contas de teste ou assinaturas criadas manualmente.', round((select sum(c) from sem_receita), 2)))
  where exists (select 1 from sem_receita)
) alertas;
$$;

-- Resumo de assinaturas e receitas ----------------------------------------------------
create or replace function public.admin_assinaturas_resumo() returns jsonb
language sql stable security definer set search_path = public as $$
select jsonb_build_object(
  'planos', coalesce((select jsonb_agg(jsonb_build_object('nome', pl.nome, 'preco', pl.preco, 'horas', pl.horas_mensais, 'ativo', pl.ativo,
      'assinantes', (select count(*) from subscriptions s where s.plano_id = pl.id and s.status = 'ativa' and s.cancelamento_solicitado_em is null),
      'cancelando', (select count(*) from subscriptions s where s.plano_id = pl.id and s.status = 'ativa' and s.cancelamento_solicitado_em is not null)) order by pl.ordem)
    from planos pl), '[]'::jsonb),
  'status', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from subscriptions group by status) x), '{}'::jsonb),
  'cancelando', (select count(*) from subscriptions where status = 'ativa' and cancelamento_solicitado_em is not null),
  'cancelamentos_90d', (select count(*) from subscriptions where cancelamento_solicitado_em >= now() - interval '90 days'),
  'motivos_cancelamento', coalesce((select jsonb_object_agg(motivo, n) from (
      select coalesce(motivo_cancelamento, 'Não informado') motivo, count(*) n from subscriptions where cancelamento_solicitado_em is not null group by 1) x), '{}'::jsonb),
  'motivos_reembolso', coalesce((select jsonb_object_agg(motivo, n) from (
      select coalesce(motivo, 'Não informado') motivo, count(*) n from reembolsos group by 1) x), '{}'::jsonb),
  'pagamentos_90d', coalesce((select jsonb_object_agg(status, jsonb_build_object('quantidade', n, 'valor', v)) from (
      select status, count(*) n, sum(valor) v from payments where criada_em >= now() - interval '90 days' group by status) x), '{}'::jsonb),
  'pendentes_antigas', (select count(*) from subscriptions where status = 'pendente' and criada_em < now() - interval '3 days'),
  'receita_90d', (select coalesce(sum(valor), 0) from payments where status in ('pago', 'estornado') and data_pagamento >= (now() - interval '90 days')::date),
  'liquido_90d', (select coalesce(sum(valor_liquido), 0) from payments where status in ('pago', 'estornado') and valor_liquido is not null and data_pagamento >= (now() - interval '90 days')::date),
  'bruto_com_liquido_90d', (select coalesce(sum(valor), 0) from payments where status in ('pago', 'estornado') and valor_liquido is not null and data_pagamento >= (now() - interval '90 days')::date),
  'pagamentos_pagos_90d', (select count(*) from payments where status in ('pago', 'estornado') and data_pagamento >= (now() - interval '90 days')::date),
  'reembolsado_90d', (select coalesce(sum(valor), 0) from reembolsos where status = 'REFUNDED' and atualizado_em >= now() - interval '90 days'),
  'horas_extras_90d', (select coalesce(sum(valor), 0) from hour_topups where status = 'ativa' and criada_em >= now() - interval '90 days'),
  'pagantes', (select count(distinct aluno_id) from subscriptions where status = 'ativa' and (cancelamento_solicitado_em is null or acesso_ate >= current_date)),
  'mrr', (select coalesce(sum(pl.preco), 0) from subscriptions s join planos pl on pl.id = s.plano_id where s.status = 'ativa' and s.cancelamento_solicitado_em is null),
  'cupons', (select count(*) from cupons)
);
$$;

revoke all on function public.admin_financeiro_mensal(date, date) from public, anon, authenticated;
revoke all on function public.admin_margens(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.admin_alertas_custos(numeric) from public, anon, authenticated;
revoke all on function public.admin_assinaturas_resumo() from public, anon, authenticated;
grant execute on function public.admin_financeiro_mensal(date, date) to service_role;
grant execute on function public.admin_margens(timestamptz, timestamptz) to service_role;
grant execute on function public.admin_alertas_custos(numeric) to service_role;
grant execute on function public.admin_assinaturas_resumo() to service_role;
