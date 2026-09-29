-- Métricas do painel (visão geral), 29 set 2026. Agregação no banco: uma
-- chamada devolve tudo e não sofre o limite de linhas da API. Só o servidor
-- (service role) executa. Dias contados no horário de Brasília.
-- Filtros opcionais: idioma, plano (nome), tutor (id). Com qualquer filtro,
-- o consumo do assistente de vendas (sem aluno) fica de fora.

create or replace function public.admin_metricas(
  p_de timestamptz,
  p_ate timestamptz,
  p_idioma text default null,
  p_plano text default null,
  p_tutor uuid default null
) returns jsonb
language sql stable security definer set search_path = public as $$
with
sem_filtro as (select (p_idioma is null and p_plano is null and p_tutor is null) as v),
alunos_f as (
  select a.id, a.idioma::text as idioma, a.criado_em from alunos a
  where (p_idioma is null or a.idioma::text = p_idioma)
    and (p_tutor is null or a.tutor_id = p_tutor)
    and (p_plano is null or exists (
      select 1 from subscriptions s join planos pl on pl.id = s.plano_id where s.aluno_id = a.id and pl.nome = p_plano))
),
dia_de as (select (p_de at time zone 'America/Sao_Paulo')::date as d),
dia_ate as (select (p_ate at time zone 'America/Sao_Paulo')::date as d),
atividade as (
  select aluno_id, iniciada_em as em from usage_sessions where aluno_id in (select id from alunos_f)
  union all
  select aluno_id, criado_em from mensagens where papel = 'aluno' and aluno_id in (select id from alunos_f)
),
ia as (
  select * from ai_usage_events e
  where e.created_at >= p_de and e.created_at < p_ate
    and (p_tutor is null or e.tutor_id = p_tutor)
    and ((e.aluno_id is null and (select v from sem_filtro)) or e.aluno_id in (select id from alunos_f))
),
pag as (
  select p.* from payments p where p.aluno_id in (select id from alunos_f)
),
pagantes as (
  select distinct s.aluno_id from subscriptions s
  where s.aluno_id in (select id from alunos_f) and s.status = 'ativa'
    and (s.cancelamento_solicitado_em is null or s.acesso_ate >= (now() at time zone 'America/Sao_Paulo')::date)
),
novos as (select id from alunos_f where criado_em >= p_de and criado_em < p_ate)
select jsonb_build_object(
  'usuarios', jsonb_build_object(
    'total_alunos', (select count(*) from alunos_f),
    'novos', (select count(*) from novos),
    'novos_ativados', (select count(*) from novos n where exists (select 1 from atividade t where t.aluno_id = n.id and t.em < p_ate)),
    'novos_pagantes', (select count(*) from novos n where exists (select 1 from pag p where p.aluno_id = n.id and p.status in ('pago', 'estornado'))),
    'ativos_periodo', (select count(distinct aluno_id) from atividade where em >= p_de and em < p_ate),
    'ativos_hoje', (select count(distinct aluno_id) from atividade where (em at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date),
    'ativos_7d', (select count(distinct aluno_id) from atividade where em >= now() - interval '7 days'),
    'ativos_30d', (select count(distinct aluno_id) from atividade where em >= now() - interval '30 days'),
    'pagantes', (select count(*) from pagantes),
    'cancelamentos', (select count(*) from subscriptions s where s.aluno_id in (select id from alunos_f) and s.cancelamento_solicitado_em >= p_de and s.cancelamento_solicitado_em < p_ate)
  ),
  'aprendizagem', jsonb_build_object(
    'sessoes', (select count(*) from usage_sessions u where u.aluno_id in (select id from alunos_f) and u.iniciada_em >= p_de and u.iniciada_em < p_ate),
    'segundos', (select coalesce(sum(u.segundos_utilizados), 0) from usage_sessions u where u.aluno_id in (select id from alunos_f) and u.iniciada_em >= p_de and u.iniciada_em < p_ate),
    'certificados', (select count(*) from certificados c where c.aluno_id in (select id from alunos_f) and c.emitido_em >= p_de and c.emitido_em < p_ate),
    'idiomas', (select coalesce(jsonb_object_agg(idioma, n), '{}'::jsonb) from (
      select a.idioma, count(*) n from alunos_f a
      where exists (select 1 from atividade t where t.aluno_id = a.id and t.em >= p_de and t.em < p_ate)
      group by a.idioma) x)
  ),
  'ia', jsonb_build_object(
    'conversas', (select count(*) from conversas c where c.aluno_id in (select id from alunos_f) and (p_tutor is null or c.tutor_id = p_tutor) and c.iniciada_em >= p_de and c.iniciada_em < p_ate),
    'mensagens_aluno', (select count(*) from mensagens m join conversas c on c.id = m.conversa_id where m.papel = 'aluno' and m.aluno_id in (select id from alunos_f) and (p_tutor is null or c.tutor_id = p_tutor) and m.criado_em >= p_de and m.criado_em < p_ate),
    'mensagens_tutor', (select count(*) from mensagens m join conversas c on c.id = m.conversa_id where m.papel = 'tutor' and m.status = 'ok' and m.aluno_id in (select id from alunos_f) and (p_tutor is null or c.tutor_id = p_tutor) and m.criado_em >= p_de and m.criado_em < p_ate),
    'chamadas', (select count(*) from ia),
    'chamadas_erro', (select count(*) from ia where status = 'erro'),
    'latencia_media_ms', (select round(avg(latencia_ms)) from ia where service = 'llm' and status = 'ok' and latencia_ms is not null),
    'tokens_entrada', (select coalesce(sum(input_tokens), 0) from ia),
    'tokens_saida', (select coalesce(sum(output_tokens), 0) from ia),
    'tokens_cache', (select coalesce(sum(cache_creation_input_tokens + cache_read_input_tokens), 0) from ia),
    'caracteres_voz', (select coalesce(sum(characters), 0) from ia where service = 'tts'),
    'segundos_transcritos', (select coalesce(sum(audio_seconds), 0) from ia where service = 'stt'),
    'custo_usd', (select coalesce(sum(estimated_cost_usd), 0) from ia),
    'alunos_com_consumo', (select count(distinct aluno_id) from ia where aluno_id is not null),
    'por_servico', (select coalesce(jsonb_object_agg(service, jsonb_build_object('chamadas', n, 'erros', e, 'custo_usd', c)), '{}'::jsonb) from (
      select service, count(*) n, count(*) filter (where status = 'erro') e, coalesce(sum(estimated_cost_usd), 0) c from ia group by service) x),
    'por_origem', (select coalesce(jsonb_object_agg(origem, jsonb_build_object('chamadas', n, 'custo_usd', c)), '{}'::jsonb) from (
      select origem, count(*) n, coalesce(sum(estimated_cost_usd), 0) c from ia group by origem) x),
    'por_modelo', (select coalesce(jsonb_agg(jsonb_build_object('provedor', provider, 'modelo', model, 'chamadas', n, 'erros', e, 'custo_usd', c) order by c desc), '[]'::jsonb) from (
      select provider, model, count(*) n, count(*) filter (where status = 'erro') e, coalesce(sum(estimated_cost_usd), 0) c from ia group by provider, model) x),
    'por_tutor', (select coalesce(jsonb_agg(jsonb_build_object('tutor_id', x.tutor_id, 'nome', t.nome, 'chamadas', n, 'custo_usd', c) order by c desc), '[]'::jsonb) from (
      select tutor_id, count(*) n, coalesce(sum(estimated_cost_usd), 0) c from ia where tutor_id is not null group by tutor_id) x
      left join tutores t on t.id = x.tutor_id)
  ),
  'financeiro', jsonb_build_object(
    'receita_assinaturas', (select coalesce(sum(valor), 0) from pag where status in ('pago', 'estornado') and data_pagamento >= (select d from dia_de) and data_pagamento < (select d from dia_ate)),
    'pagamentos_pagos', (select count(*) from pag where status in ('pago', 'estornado') and data_pagamento >= (select d from dia_de) and data_pagamento < (select d from dia_ate)),
    'receita_liquida_informada', (select coalesce(sum(valor_liquido), 0) from pag where status in ('pago', 'estornado') and valor_liquido is not null and data_pagamento >= (select d from dia_de) and data_pagamento < (select d from dia_ate)),
    'bruto_com_liquido', (select coalesce(sum(valor), 0) from pag where status in ('pago', 'estornado') and valor_liquido is not null and data_pagamento >= (select d from dia_de) and data_pagamento < (select d from dia_ate)),
    'pagamentos_sem_liquido', (select count(*) from pag where status in ('pago', 'estornado') and valor_liquido is null and data_pagamento >= (select d from dia_de) and data_pagamento < (select d from dia_ate)),
    'receita_horas_extras', (select coalesce(sum(h.valor), 0) from hour_topups h where h.aluno_id in (select id from alunos_f) and h.status = 'ativa' and h.criada_em >= p_de and h.criada_em < p_ate),
    'horas_extras_vendidas', (select count(*) from hour_topups h where h.aluno_id in (select id from alunos_f) and h.status = 'ativa' and h.criada_em >= p_de and h.criada_em < p_ate),
    'reembolsado', (select coalesce(sum(r.valor), 0) from reembolsos r where r.aluno_id in (select id from alunos_f) and r.status = 'REFUNDED' and r.atualizado_em >= p_de and r.atualizado_em < p_ate),
    'pagamentos_por_status', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) from (
      select status, count(*) n from pag where criada_em >= p_de and criada_em < p_ate group by status) x),
    'mrr', (select coalesce(sum(pl.preco), 0) from subscriptions s join planos pl on pl.id = s.plano_id
      where s.aluno_id in (select id from alunos_f) and s.status = 'ativa' and s.cancelamento_solicitado_em is null),
    'assinaturas_ativas', (select count(*) from subscriptions s where s.aluno_id in (select id from alunos_f) and s.status = 'ativa' and s.cancelamento_solicitado_em is null),
    'assinaturas_novas', (select count(*) from subscriptions s where s.aluno_id in (select id from alunos_f)
      and (select min(p.data_pagamento) from pag p where p.subscription_id = s.id and p.status in ('pago', 'estornado')) >= (select d from dia_de)
      and (select min(p.data_pagamento) from pag p where p.subscription_id = s.id and p.status in ('pago', 'estornado')) < (select d from dia_ate))
  )
);
$$;

-- Série diária (gráficos): receita, custo de IA, alunos ativos e mensagens.
create or replace function public.admin_serie_diaria(
  p_de timestamptz,
  p_ate timestamptz,
  p_idioma text default null,
  p_plano text default null,
  p_tutor uuid default null
) returns jsonb
language sql stable security definer set search_path = public as $$
with
sem_filtro as (select (p_idioma is null and p_plano is null and p_tutor is null) as v),
alunos_f as (
  select a.id from alunos a
  where (p_idioma is null or a.idioma::text = p_idioma)
    and (p_tutor is null or a.tutor_id = p_tutor)
    and (p_plano is null or exists (
      select 1 from subscriptions s join planos pl on pl.id = s.plano_id where s.aluno_id = a.id and pl.nome = p_plano))
),
dias as (
  select generate_series((p_de at time zone 'America/Sao_Paulo')::date, ((p_ate - interval '1 microsecond') at time zone 'America/Sao_Paulo')::date, interval '1 day')::date as dia
),
receita as (
  select data_pagamento as dia, sum(valor) v from payments
  where aluno_id in (select id from alunos_f) and status in ('pago', 'estornado') group by 1
  union all
  select (criada_em at time zone 'America/Sao_Paulo')::date, sum(valor) from hour_topups
  where aluno_id in (select id from alunos_f) and status = 'ativa' group by 1
),
custo as (
  select (created_at at time zone 'America/Sao_Paulo')::date as dia, sum(estimated_cost_usd) c, count(*) filter (where status = 'erro') e from ai_usage_events e
  where created_at >= p_de and created_at < p_ate and (p_tutor is null or e.tutor_id = p_tutor)
    and ((e.aluno_id is null and (select v from sem_filtro)) or e.aluno_id in (select id from alunos_f))
  group by 1
),
atividade as (
  select (iniciada_em at time zone 'America/Sao_Paulo')::date as dia, aluno_id from usage_sessions where aluno_id in (select id from alunos_f) and iniciada_em >= p_de and iniciada_em < p_ate
  union all
  select (criado_em at time zone 'America/Sao_Paulo')::date, aluno_id from mensagens where papel = 'aluno' and aluno_id in (select id from alunos_f) and criado_em >= p_de and criado_em < p_ate
)
select coalesce(jsonb_agg(jsonb_build_object(
  'dia', d.dia,
  'receita', coalesce((select sum(v) from receita r where r.dia = d.dia), 0),
  'custo_usd', coalesce((select c from custo c where c.dia = d.dia), 0),
  'erros_ia', coalesce((select e from custo c where c.dia = d.dia), 0),
  'ativos', (select count(distinct aluno_id) from atividade a where a.dia = d.dia)
) order by d.dia), '[]'::jsonb)
from dias d;
$$;

revoke all on function public.admin_metricas(timestamptz, timestamptz, text, text, uuid) from public, anon, authenticated;
revoke all on function public.admin_serie_diaria(timestamptz, timestamptz, text, text, uuid) from public, anon, authenticated;
grant execute on function public.admin_metricas(timestamptz, timestamptz, text, text, uuid) to service_role;
grant execute on function public.admin_serie_diaria(timestamptz, timestamptz, text, text, uuid) to service_role;
