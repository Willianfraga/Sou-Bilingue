-- Fase 3 — horas e créditos (03/10/2026). Plano e decisões: docs/fase3-horas.md.
-- Conta só conversa ativa, por minuto; extrato único (usage_ledger); renovação
-- mensal; horas extras e reposição entram no saldo; aluno não grava horas.

-- 1) Horas com casas decimais (minutos) ---------------------------------------
alter table public.subscriptions drop column if exists horas_restantes;
alter table public.subscriptions
  alter column horas_total type numeric(12, 4) using horas_total::numeric,
  alter column horas_utilizadas type numeric(12, 4) using horas_utilizadas::numeric;
alter table public.subscriptions
  add column horas_restantes numeric(12, 4) generated always as (greatest(horas_total - horas_utilizadas, 0)) stored;

-- 2) Extrato de horas -------------------------------------------------------------
alter table public.usage_ledger
  add column if not exists valido boolean not null default true,
  add column if not exists motivo text check (motivo is null or char_length(motivo) <= 500),
  add column if not exists criado_por uuid references public.profiles (id) on delete set null;
do $$ begin
  alter table public.usage_ledger add constraint usage_ledger_tipo_valido check (tipo in ('plano', 'uso', 'recarga', 'reposicao', 'ajuste'));
exception when duplicate_object then null; end $$;

-- Histórico antigo inflado (sessões que não fechavam): guardado, sem valor.
update public.usage_ledger
set valido = false, motivo = 'Contagem antiga inválida (sessões sem fechamento) — invalidada em 03/10/2026'
where valido and criada_em < '2026-10-04';

-- Cada sessão é cobrada uma vez; cada pagamento renova o ciclo uma vez.
create unique index if not exists usage_ledger_uso_por_sessao on public.usage_ledger (referencia_externa) where tipo = 'uso' and valido;
create unique index if not exists usage_ledger_plano_por_pagamento on public.usage_ledger (referencia_externa) where tipo = 'plano' and valido;
create index if not exists usage_ledger_aluno on public.usage_ledger (aluno_id, criada_em desc);

-- 3) Sessões abertas esquecidas: fecha sem cobrar (contagem antiga) ----------------
update public.usage_sessions
set ativo = false, encerrada_em = coalesce(last_activity_at, iniciada_em), atualizada_em = now()
where ativo;
create index if not exists usage_sessions_ativas on public.usage_sessions (aluno_id) where ativo;

-- 4) Segurança: aluno só lê horas e sessões; quem grava é o servidor ----------------
drop policy if exists "aluno_cria_ledger" on public.usage_ledger;
drop policy if exists "aluno_cria_sessoes" on public.usage_sessions;
drop policy if exists "aluno_atualiza_sessoes" on public.usage_sessions;

-- 5) Preço das horas extras (servidor é a fonte; nada vem do navegador) -------------
insert into public.billing_config (chave, valor, tipo, descricao)
values
  ('preco_recarga_por_hora', '9.90', 'number', 'Preço por hora extra (R$)'),
  ('pacotes_horas_extras', '5,10,20', 'text', 'Pacotes de horas extras oferecidos')
on conflict (chave) do nothing;

-- 6) Funções de horas (só o servidor executa) ---------------------------------------

-- Assinatura que dá acesso hoje (mesma regra de assinaturaDaAcesso no app).
create or replace function public.horas_assinatura_vigente(p_aluno uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select id from subscriptions
  where aluno_id = p_aluno and status = 'ativa'
    and (cancelamento_solicitado_em is null or acesso_ate >= (now() at time zone 'America/Sao_Paulo')::date)
  order by criada_em desc limit 1;
$$;

create or replace function public.horas_encerrar_sessao(p_sessao uuid, p_aluno uuid default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s usage_sessions%rowtype;
  v_fim timestamptz;
  v_minutos integer;
  v_ok integer;
  v_erros integer;
  v_cobrar boolean;
begin
  select * into s from usage_sessions where id = p_sessao for update;
  if not found or (p_aluno is not null and s.aluno_id <> p_aluno) then
    return jsonb_build_object('ok', false, 'erro', 'sessao_nao_encontrada');
  end if;
  if not s.ativo then
    return jsonb_build_object('ok', true, 'ja_encerrada', true);
  end if;

  v_fim := case when s.last_activity_at < now() - interval '2 minutes' then s.last_activity_at else now() end;
  v_minutos := round(coalesce(s.segundos_utilizados, 0) / 60.0);

  -- Falha técnica: a tutora não respondeu nenhuma vez e houve erro → não cobra.
  select count(*) filter (where status = 'ok'), count(*) filter (where status = 'erro')
    into v_ok, v_erros
  from ai_usage_events
  where aluno_id = s.aluno_id and service = 'llm' and origem = 'aula'
    and created_at >= s.iniciada_em and created_at <= v_fim + interval '1 minute';
  v_cobrar := v_minutos > 0 and not (v_ok = 0 and v_erros > 0);

  update usage_sessions set ativo = false, encerrada_em = v_fim, atualizada_em = now() where id = p_sessao;

  if v_minutos = 0 then
    return jsonb_build_object('ok', true, 'minutos', 0, 'cobrado', false);
  end if;

  insert into usage_ledger (aluno_id, subscription_id, tipo, segundos, descricao, referencia_externa, valido, motivo)
  values (
    s.aluno_id, s.subscription_id, 'uso',
    case when v_cobrar then -(v_minutos * 60) else 0 end,
    format('Aula de %s min', v_minutos),
    p_sessao::text, true,
    case when not v_cobrar then 'Não cobrada: falha técnica da tutora' end
  )
  on conflict do nothing;

  if v_cobrar and s.subscription_id is not null then
    update subscriptions set horas_utilizadas = horas_utilizadas + (v_minutos / 60.0), atualizada_em = now()
    where id = s.subscription_id;
  end if;

  return jsonb_build_object('ok', true, 'minutos', v_minutos, 'cobrado', v_cobrar);
end;
$$;

create or replace function public.horas_fechar_paradas() returns integer
language plpgsql security definer set search_path = public as $$
declare r record; n integer := 0;
begin
  for r in select id from usage_sessions where ativo and last_activity_at < now() - interval '2 minutes' loop
    perform horas_encerrar_sessao(r.id, null);
    n := n + 1;
  end loop;
  return n;
end;
$$;

create or replace function public.horas_iniciar_sessao(p_aluno uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_sub uuid;
  v_restantes numeric;
  v_existente uuid;
  v_nova uuid;
  r record;
begin
  v_sub := horas_assinatura_vigente(p_aluno);
  if v_sub is null then
    return jsonb_build_object('ok', false, 'erro', 'sem_assinatura');
  end if;

  -- Recarregou a página: continua a mesma sessão se ainda recebe sinal.
  select id into v_existente from usage_sessions
  where aluno_id = p_aluno and ativo and last_activity_at >= now() - interval '2 minutes'
  order by iniciada_em desc limit 1;

  for r in select id from usage_sessions where aluno_id = p_aluno and ativo and id is distinct from v_existente loop
    perform horas_encerrar_sessao(r.id, p_aluno);
  end loop;

  select horas_restantes into v_restantes from subscriptions where id = v_sub;
  if coalesce(v_restantes, 0) <= 0 then
    return jsonb_build_object('ok', false, 'erro', 'sem_horas');
  end if;

  if v_existente is not null then
    return jsonb_build_object('ok', true, 'sessao_id', v_existente, 'horas_restantes', v_restantes, 'continuada', true);
  end if;

  insert into usage_sessions (aluno_id, subscription_id, tipo, segundos_utilizados, ativo, last_activity_at)
  values (p_aluno, v_sub, 'conversa', 0, true, now())
  returning id into v_nova;
  return jsonb_build_object('ok', true, 'sessao_id', v_nova, 'horas_restantes', v_restantes);
end;
$$;

-- Sinal da aula: soma o tempo ativo informado, nunca mais que o tempo real
-- desde o último sinal (+2 s de folga) nem mais que 60 s por sinal.
create or replace function public.horas_sinal(p_aluno uuid, p_sessao uuid, p_segundos integer) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s usage_sessions%rowtype;
  v_inc integer;
  v_restantes numeric;
begin
  select * into s from usage_sessions where id = p_sessao and aluno_id = p_aluno for update;
  if not found or not s.ativo then
    return jsonb_build_object('ok', false, 'erro', 'sessao_encerrada');
  end if;
  v_inc := least(greatest(coalesce(p_segundos, 0), 0), 60, floor(extract(epoch from (now() - s.last_activity_at)) + 2)::integer);
  update usage_sessions
  set segundos_utilizados = segundos_utilizados + v_inc, last_activity_at = now(), atualizada_em = now()
  where id = p_sessao;
  select horas_restantes - ((s.segundos_utilizados + v_inc) / 3600.0) into v_restantes from subscriptions where id = s.subscription_id;
  return jsonb_build_object('ok', true, 'segundos', s.segundos_utilizados + v_inc, 'contados', v_inc,
    'horas_restantes', greatest(coalesce(v_restantes, 0), 0), 'esgotou', coalesce(v_restantes, 0) <= 0);
end;
$$;

-- Reposição manual (admin): soma horas ao ciclo atual, com motivo.
create or replace function public.horas_conceder(p_aluno uuid, p_horas numeric, p_motivo text, p_admin uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_sub uuid;
begin
  if p_horas is null or p_horas < 0.25 or p_horas > 100 then
    return jsonb_build_object('ok', false, 'erro', 'Horas entre 0,25 e 100.');
  end if;
  if char_length(coalesce(trim(p_motivo), '')) < 5 then
    return jsonb_build_object('ok', false, 'erro', 'Escreva o motivo (mínimo 5 caracteres).');
  end if;
  v_sub := horas_assinatura_vigente(p_aluno);
  if v_sub is null then
    return jsonb_build_object('ok', false, 'erro', 'O aluno não tem assinatura ativa.');
  end if;
  insert into usage_ledger (aluno_id, subscription_id, tipo, segundos, descricao, valido, motivo, criado_por)
  values (p_aluno, v_sub, 'reposicao', round(p_horas * 3600), format('Reposição de %s h', p_horas), true, left(trim(p_motivo), 500), p_admin);
  update subscriptions set horas_total = horas_total + p_horas, atualizada_em = now() where id = v_sub;
  return jsonb_build_object('ok', true);
end;
$$;

-- Novo ciclo (1º pagamento ou renovação mensal). Idempotente por pagamento.
-- Horas do plano não usadas expiram; horas extras e reposições não usadas
-- passam para o próximo ciclo.
create or replace function public.horas_renovar_ciclo(p_sub uuid, p_pagamento text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s subscriptions%rowtype;
  v_horas_plano numeric;
  v_extras numeric;
  v_sobra numeric;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  select * into s from subscriptions where id = p_sub for update;
  if not found then return jsonb_build_object('ok', false, 'erro', 'assinatura_nao_encontrada'); end if;
  if exists (select 1 from usage_ledger where tipo = 'plano' and valido and referencia_externa = 'ciclo:' || p_pagamento) then
    return jsonb_build_object('ok', true, 'ja_renovado', true);
  end if;
  select horas_mensais into v_horas_plano from planos where id = s.plano_id;

  select coalesce(sum(segundos), 0) / 3600.0 into v_extras from usage_ledger
  where subscription_id = p_sub and valido and tipo in ('recarga', 'reposicao') and criada_em >= coalesce(s.ciclo_inicio::timestamptz, s.criada_em);
  v_sobra := least(greatest(v_extras, 0), coalesce(s.horas_restantes, 0));

  insert into usage_ledger (aluno_id, subscription_id, tipo, segundos, descricao, referencia_externa, valido)
  values (s.aluno_id, p_sub, 'plano', round(coalesce(v_horas_plano, 0) * 3600), format('Horas do plano (%s h)', v_horas_plano), 'ciclo:' || p_pagamento, true);
  if v_sobra > 0 then
    insert into usage_ledger (aluno_id, subscription_id, tipo, segundos, descricao, valido, motivo)
    values (s.aluno_id, p_sub, 'ajuste', 0, format('Horas extras não usadas mantidas: %s h', round(v_sobra, 2)), true, 'Saldo de horas extras/reposições levado para o novo ciclo');
  end if;

  update subscriptions
  set horas_total = coalesce(v_horas_plano, 0) + v_sobra,
      horas_utilizadas = 0,
      ciclo_inicio = v_hoje,
      ciclo_fim = (v_hoje + interval '1 month')::date,
      proxima_renovacao = (v_hoje + interval '1 month')::date,
      renovada_em = now(),
      atualizada_em = now()
  where id = p_sub;
  return jsonb_build_object('ok', true, 'horas', coalesce(v_horas_plano, 0) + v_sobra);
end;
$$;

-- Horas extras pagas entram no saldo do ciclo (antes só iam para o extrato).
create or replace function public.process_topup_payment(p_topup_id uuid, p_payment_id character varying)
returns table(success boolean, message text)
language plpgsql security definer set search_path = public as $$
declare v_topup public.hour_topups%rowtype;
begin
  select * into v_topup from public.hour_topups where id = p_topup_id for update;
  if v_topup.id is null then return query select false, 'Topup não encontrado'::text; return; end if;
  if v_topup.status = 'ativa' or v_topup.asaas_payment_id is not null then return query select true, 'Topup já processado'::text; return; end if;
  -- O Asaas manda "pay_..." (texto); payment_id é uuid e antes quebrava aqui.
  update public.hour_topups set status = 'ativa', asaas_payment_id = p_payment_id where id = p_topup_id;
  insert into public.usage_ledger (aluno_id, subscription_id, tipo, segundos, descricao, referencia_externa, valido)
  values (v_topup.aluno_id, v_topup.subscription_id, 'recarga', v_topup.horas * 3600, 'Horas extras: ' || v_topup.horas || ' h (R$ ' || v_topup.valor || ')', p_topup_id::varchar, true);
  update public.subscriptions set horas_total = horas_total + v_topup.horas, atualizada_em = now() where id = v_topup.subscription_id;
  return query select true, 'Topup processado com sucesso'::text;
end;
$$;

revoke all on function public.horas_assinatura_vigente(uuid) from public, anon, authenticated;
revoke all on function public.horas_encerrar_sessao(uuid, uuid) from public, anon, authenticated;
revoke all on function public.horas_fechar_paradas() from public, anon, authenticated;
revoke all on function public.horas_iniciar_sessao(uuid) from public, anon, authenticated;
revoke all on function public.horas_sinal(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.horas_conceder(uuid, numeric, text, uuid) from public, anon, authenticated;
revoke all on function public.horas_renovar_ciclo(uuid, text) from public, anon, authenticated;
revoke all on function public.process_topup_payment(uuid, character varying) from public, anon, authenticated;
grant execute on function public.horas_encerrar_sessao(uuid, uuid), public.horas_fechar_paradas(), public.horas_iniciar_sessao(uuid),
  public.horas_sinal(uuid, uuid, integer), public.horas_conceder(uuid, numeric, text, uuid), public.horas_renovar_ciclo(uuid, text),
  public.process_topup_payment(uuid, character varying), public.horas_assinatura_vigente(uuid) to service_role;

-- 7) Fecha sessões paradas a cada 5 minutos -------------------------------------------
do $$
begin
  if exists (select 1 from cron.job where jobname = 'fechar-sessoes-paradas') then
    perform cron.unschedule('fechar-sessoes-paradas');
  end if;
  perform cron.schedule('fechar-sessoes-paradas', '*/5 * * * *', 'select public.horas_fechar_paradas()');
end $$;
