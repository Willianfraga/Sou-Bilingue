-- Painel — Fase B: alunos e tutores (29 set 2026). Funções só para o
-- servidor (service role). Alertas são pistas para revisão humana, nunca
-- decisão automática. Detalhes: docs/admin-painel.md.
-- Bloqueio da conta anonimizada usa uma data distante, não "infinity": o
-- serviço de login (GoTrue) não lê "infinity" e passa a dar erro no usuário.

-- Lista de alunos com busca, filtros, paginação e alertas -----------------------
create or replace function public.admin_alunos(
  p_busca text default null,
  p_plano text default null,
  p_idioma text default null,
  p_situacao text default null,
  p_limite integer default 25,
  p_offset integer default 0
) returns jsonb
language sql stable security definer set search_path = public, auth as $$
with base as (
  select
    a.id,
    p.nome,
    u.email,
    a.idioma::text as idioma,
    a.criado_em,
    p.suspenso_em,
    (select s.status from subscriptions s where s.aluno_id = a.id order by s.criada_em desc limit 1) as status_assinatura,
    (select pl.nome from subscriptions s join planos pl on pl.id = s.plano_id where s.aluno_id = a.id order by s.criada_em desc limit 1) as plano,
    (select s.cancelamento_solicitado_em is not null from subscriptions s where s.aluno_id = a.id order by s.criada_em desc limit 1) as cancelando,
    (select case when s.horas_total > 0 then s.horas_utilizadas / s.horas_total end from subscriptions s where s.aluno_id = a.id and s.status = 'ativa' order by s.criada_em desc limit 1) as uso_do_plano,
    greatest(
      (select max(coalesce(us.last_activity_at, us.iniciada_em)) from usage_sessions us where us.aluno_id = a.id),
      (select max(m.criado_em) from mensagens m where m.aluno_id = a.id and m.papel = 'aluno')
    ) as ultimo_acesso,
    (select coalesce(sum(us.segundos_utilizados), 0) from usage_sessions us where us.aluno_id = a.id) as segundos_estudo,
    (select coalesce(sum(e.estimated_cost_usd), 0) from ai_usage_events e where e.aluno_id = a.id) as custo_usd,
    (select count(*) from ai_usage_events e where e.aluno_id = a.id and e.status = 'erro' and e.created_at >= now() - interval '7 days') as erros_7d,
    (select coalesce(sum(pg.valor), 0) from payments pg where pg.aluno_id = a.id and pg.status in ('pago', 'estornado'))
      + (select coalesce(sum(h.valor), 0) from hour_topups h where h.aluno_id = a.id and h.status = 'ativa')
      - (select coalesce(sum(r.valor), 0) from reembolsos r where r.aluno_id = a.id and r.status = 'REFUNDED') as receita
  from alunos a
  join profiles p on p.id = a.id
  left join auth.users u on u.id = a.id
  where (p_idioma is null or a.idioma::text = p_idioma)
    and (p_busca is null or p.nome ilike '%' || p_busca || '%' or u.email ilike '%' || p_busca || '%')
),
com_alertas as (
  select b.*,
    array_remove(array[
      case when b.status_assinatura = 'ativa' and (b.ultimo_acesso is null or b.ultimo_acesso < now() - interval '14 days') then 'sem_atividade_14d' end,
      case when b.uso_do_plano >= 0.9 then 'perto_do_limite' end,
      case when b.erros_7d >= 3 then 'falhas_ia' end,
      case when b.cancelando then 'cancelamento_agendado' end
    ], null) as alertas
  from base b
  where (p_plano is null or b.plano = p_plano)
),
filtrado as (
  select * from com_alertas c
  where p_situacao is null
    or (p_situacao = 'pagante' and c.status_assinatura = 'ativa' and not coalesce(c.cancelando, false))
    or (p_situacao = 'cancelando' and c.cancelando)
    or (p_situacao = 'sem_assinatura' and (c.status_assinatura is null or c.status_assinatura in ('cancelada', 'pendente')))
    or (p_situacao = 'suspenso' and c.suspenso_em is not null)
    or (p_situacao = 'alerta' and cardinality(c.alertas) > 0)
)
select jsonb_build_object(
  'total', (select count(*) from filtrado),
  'linhas', coalesce((select jsonb_agg(to_jsonb(f) order by f.criado_em desc) from (
    select * from filtrado order by criado_em desc limit least(greatest(p_limite, 1), 100) offset greatest(p_offset, 0)
  ) f), '[]'::jsonb)
);
$$;

-- Ficha do aluno (sem texto de conversa: leitura auditada é na Fase D) ------------
create or replace function public.admin_aluno_detalhe(p_aluno uuid) returns jsonb
language sql stable security definer set search_path = public, auth as $$
select case when not exists (select 1 from alunos where id = p_aluno) then null else jsonb_build_object(
  'perfil', (select jsonb_build_object(
      'id', a.id, 'nome', p.nome, 'email', u.email, 'idioma', a.idioma, 'sotaque', a.sotaque, 'plano_certificacao', a.plano,
      'maior_de_idade', a.maior_de_idade, 'tutor', t.nome, 'tutor_id', a.tutor_id, 'criado_em', a.criado_em,
      'ultimo_login', u.last_sign_in_at, 'suspenso_em', p.suspenso_em, 'suspenso_motivo', p.suspenso_motivo,
      'responsavel', (select nome from profiles where id = a.responsavel_id))
    from alunos a join profiles p on p.id = a.id left join auth.users u on u.id = a.id left join tutores t on t.id = a.tutor_id
    where a.id = p_aluno),
  'entrevista', (select jsonb_build_object(
      'concluida_em', o.concluido_em,
      'nivel', o.respostas -> 'nivel',
      'objetivos', o.respostas -> 'objetivos',
      'temas', o.respostas -> 'temasConversa',
      'habilidades', o.respostas -> 'habilidadesPrioritarias',
      'dificuldades', o.respostas -> 'dificuldades',
      'disponibilidade', o.respostas -> 'disponibilidadeEstudo',
      'correcao', o.respostas -> 'preferenciaCorrecao')
    from aluno_onboarding o where o.aluno_id = p_aluno),
  'assinaturas', coalesce((select jsonb_agg(jsonb_build_object(
      'id', s.id, 'plano', pl.nome, 'preco', pl.preco, 'status', s.status, 'criada_em', s.criada_em,
      'horas_total', s.horas_total, 'horas_utilizadas', s.horas_utilizadas, 'proxima_renovacao', s.proxima_renovacao,
      'cancelamento_solicitado_em', s.cancelamento_solicitado_em, 'acesso_ate', s.acesso_ate, 'motivo_cancelamento', s.motivo_cancelamento,
      'asaas', s.asaas_subscription_id is not null) order by s.criada_em desc)
    from subscriptions s left join planos pl on pl.id = s.plano_id where s.aluno_id = p_aluno), '[]'::jsonb),
  'pagamentos', coalesce((select jsonb_agg(jsonb_build_object(
      'id', pg.id, 'valor', pg.valor, 'valor_liquido', pg.valor_liquido, 'status', pg.status, 'tipo', pg.tipo,
      'data_pagamento', pg.data_pagamento, 'criada_em', pg.criada_em) order by pg.criada_em desc)
    from payments pg where pg.aluno_id = p_aluno), '[]'::jsonb),
  'horas_extras', coalesce((select jsonb_agg(jsonb_build_object('horas', h.horas, 'valor', h.valor, 'status', h.status, 'criada_em', h.criada_em) order by h.criada_em desc)
    from hour_topups h where h.aluno_id = p_aluno), '[]'::jsonb),
  'reembolsos', coalesce((select jsonb_agg(jsonb_build_object('protocolo', r.protocolo, 'valor', r.valor, 'status', r.status, 'solicitado_em', r.solicitado_em) order by r.solicitado_em desc)
    from reembolsos r where r.aluno_id = p_aluno), '[]'::jsonb),
  'estudo', (select jsonb_build_object(
      'sessoes', count(*), 'segundos', coalesce(sum(segundos_utilizados), 0),
      'ultima', max(coalesce(last_activity_at, iniciada_em)))
    from usage_sessions where aluno_id = p_aluno),
  'metas', coalesce((select jsonb_agg(jsonb_build_object('ano', c.ano, 'mes', c.mes, 'semana', c.semana_numero, 'necessarios', c.dias_necessarios, 'cumpridos', c.dias_cumpridos) order by c.ano desc, c.mes desc, c.semana_numero desc)
    from (select * from cotas_semanais where aluno_id = p_aluno order by ano desc, mes desc, semana_numero desc limit 12) c), '[]'::jsonb),
  'certificados', (select count(*) from certificados where aluno_id = p_aluno),
  'consumo', (select jsonb_build_object(
      'custo_usd', coalesce(sum(estimated_cost_usd), 0),
      'custo_30d_usd', coalesce(sum(estimated_cost_usd) filter (where created_at >= now() - interval '30 days'), 0),
      'chamadas', count(*), 'erros', count(*) filter (where status = 'erro'),
      'tokens_entrada', coalesce(sum(input_tokens), 0), 'tokens_saida', coalesce(sum(output_tokens), 0),
      'caracteres_voz', coalesce(sum(characters), 0), 'segundos_transcritos', coalesce(sum(audio_seconds), 0))
    from ai_usage_events where aluno_id = p_aluno),
  'conversas', coalesce((select jsonb_agg(x order by x.ultima_mensagem_em desc) from (
      select c.id, t.nome as tutor, c.iniciada_em, c.ultima_mensagem_em,
        (select count(*) from mensagens m where m.conversa_id = c.id) as mensagens,
        (select count(*) from mensagens m where m.conversa_id = c.id and m.status = 'erro') as erros,
        (select coalesce(sum(e.estimated_cost_usd), 0) from ai_usage_events e where e.conversa_id = c.id) as custo_usd
      from conversas c left join tutores t on t.id = c.tutor_id
      where c.aluno_id = p_aluno order by c.ultima_mensagem_em desc limit 20) x), '[]'::jsonb)
) end;
$$;

-- Métricas por tutor no período ------------------------------------------------------
create or replace function public.admin_tutores_metricas(p_de timestamptz, p_ate timestamptz) returns jsonb
language sql stable security definer set search_path = public as $$
select coalesce(jsonb_agg(jsonb_build_object(
  'id', t.id, 'nome', t.nome, 'descricao', t.descricao, 'foto_url', t.foto_url, 'faixa_etaria', t.faixa_etaria,
  'genero', t.genero, 'status', t.status, 'atualizado_em', t.atualizado_em,
  'atualizado_por', (select nome from profiles where id = t.atualizado_por),
  'alunos_atuais', (select count(*) from alunos a where a.tutor_id = t.id),
  'alunos_atendidos', (select count(distinct c.aluno_id) from conversas c where c.tutor_id = t.id and c.ultima_mensagem_em >= p_de and c.iniciada_em < p_ate),
  'conversas', (select count(*) from conversas c where c.tutor_id = t.id and c.iniciada_em >= p_de and c.iniciada_em < p_ate),
  'mensagens', (select count(*) from mensagens m join conversas c on c.id = m.conversa_id where c.tutor_id = t.id and m.criado_em >= p_de and m.criado_em < p_ate),
  'chamadas', (select count(*) from ai_usage_events e where e.tutor_id = t.id and e.created_at >= p_de and e.created_at < p_ate),
  'erros', (select count(*) from ai_usage_events e where e.tutor_id = t.id and e.status = 'erro' and e.created_at >= p_de and e.created_at < p_ate),
  'latencia_media_ms', (select round(avg(e.latencia_ms)) from ai_usage_events e where e.tutor_id = t.id and e.service = 'llm' and e.status = 'ok' and e.created_at >= p_de and e.created_at < p_ate),
  'tokens_entrada', (select coalesce(sum(e.input_tokens), 0) from ai_usage_events e where e.tutor_id = t.id and e.created_at >= p_de and e.created_at < p_ate),
  'tokens_saida', (select coalesce(sum(e.output_tokens), 0) from ai_usage_events e where e.tutor_id = t.id and e.created_at >= p_de and e.created_at < p_ate),
  'custo_usd', (select coalesce(sum(e.estimated_cost_usd), 0) from ai_usage_events e where e.tutor_id = t.id and e.created_at >= p_de and e.created_at < p_ate)
) order by t.nome), '[]'::jsonb)
from tutores t;
$$;

-- Anonimização (pedido de exclusão, LGPD) -------------------------------------------
-- Apagar o aluno apagaria em cascata pagamentos e consumo (registros que a lei
-- manda guardar). Aqui removemos o que identifica a pessoa e mantemos os
-- registros financeiros sem identificação. Irreversível. Recusa se ainda
-- houver renovação ativa (cancelar antes, para não seguir cobrando).
create or replace function public.admin_anonimizar_aluno(p_aluno uuid) returns jsonb
language plpgsql security definer set search_path = public, auth as $$
declare
  v_email text := 'anonimizado+' || replace(p_aluno::text, '-', '') || '@soubilingue.invalid';
begin
  if not exists (select 1 from alunos where id = p_aluno) then
    return jsonb_build_object('ok', false, 'erro', 'Aluno não encontrado.');
  end if;
  if exists (select 1 from subscriptions where aluno_id = p_aluno and status = 'ativa' and cancelamento_solicitado_em is null) then
    return jsonb_build_object('ok', false, 'erro', 'O aluno ainda tem renovação ativa. Cancele a renovação antes de anonimizar.');
  end if;

  update profiles set nome = 'Aluno anonimizado', suspenso_em = coalesce(suspenso_em, now()), suspenso_motivo = 'Dados anonimizados (LGPD)' where id = p_aluno;
  update alunos set objetivo_pessoal = '' where id = p_aluno;
  delete from aluno_onboarding where aluno_id = p_aluno;
  delete from student_memories where aluno_id = p_aluno;
  delete from depoimentos where aluno_id = p_aluno;
  update mensagens set texto = null, texto_apagado_em = now() where aluno_id = p_aluno and texto is not null;
  update usage_sessions set ip_address = null, user_agent = null where aluno_id = p_aluno;
  update reembolsos set comentario = null where aluno_id = p_aluno;

  update auth.users set email = v_email, phone = null, raw_user_meta_data = '{}'::jsonb, banned_until = '2999-12-31 00:00:00+00' where id = p_aluno;
  delete from auth.identities where user_id = p_aluno;
  delete from auth.sessions where user_id = p_aluno;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.admin_alunos(text, text, text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.admin_aluno_detalhe(uuid) from public, anon, authenticated;
revoke all on function public.admin_tutores_metricas(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.admin_anonimizar_aluno(uuid) from public, anon, authenticated;
grant execute on function public.admin_alunos(text, text, text, text, integer, integer) to service_role;
grant execute on function public.admin_aluno_detalhe(uuid) to service_role;
grant execute on function public.admin_tutores_metricas(timestamptz, timestamptz) to service_role;
grant execute on function public.admin_anonimizar_aluno(uuid) to service_role;
