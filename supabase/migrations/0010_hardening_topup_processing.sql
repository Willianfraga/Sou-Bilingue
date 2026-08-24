-- Impede crédito duplicado quando o Asaas envia PAYMENT_CONFIRMED e depois
-- PAYMENT_RECEIVED para a mesma recarga.
create or replace function public.process_topup_payment(
  p_topup_id uuid,
  p_payment_id varchar
)
returns table (success boolean, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_topup public.hour_topups%rowtype;
begin
  select * into v_topup
  from public.hour_topups
  where id = p_topup_id
  for update;

  if v_topup.id is null then
    return query select false, 'Topup não encontrado'::text;
    return;
  end if;

  if v_topup.status = 'ativa' or v_topup.payment_id is not null then
    return query select true, 'Topup já processado'::text;
    return;
  end if;

  update public.hour_topups
  set status = 'ativa', payment_id = p_payment_id
  where id = p_topup_id;

  insert into public.usage_ledger (
    aluno_id, subscription_id, tipo, segundos, descricao, referencia_externa
  ) values (
    v_topup.aluno_id,
    v_topup.subscription_id,
    'recarga',
    v_topup.horas * 3600,
    'Recarga de ' || v_topup.horas || 'h (R$ ' || v_topup.valor || ')',
    p_topup_id::varchar
  );

  return query select true, 'Topup processado com sucesso'::text;
end;
$$;
