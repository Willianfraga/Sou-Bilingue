-- Fase 0 (27 set 2026): completa o que a 0007 deixou de criar no banco
-- restaurado do backup e prepara o reprocessamento seguro de webhooks.
-- Idempotente: pode rodar mais de uma vez. Não apaga dados.

-- Sem esta tabela todo webhook do Asaas respondia 500 e nenhum pagamento
-- era confirmado. Só o service role acessa (RLS ligado, sem policy).
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  payload jsonb not null,
  status text not null default 'processando' check (status in ('processando', 'processado', 'erro')),
  process_error text,
  recebido_em timestamptz not null default now(),
  processado_em timestamptz,
  unique (provider, event_id)
);
alter table public.webhook_events enable row level security;

-- Reprocessamento: um evento que falhou (ou travou em "processando") pode
-- ser reclamado de novo pelo reenvio do Asaas, contando as tentativas.
alter table public.webhook_events
  add column if not exists tentativas smallint not null default 1,
  add column if not exists atualizado_em timestamptz not null default now();

-- Índice anti-duplicidade de recarga (também previsto na 0007).
create unique index if not exists hour_topups_asaas_payment_unique
  on public.hour_topups (asaas_payment_id) where asaas_payment_id is not null;

insert into public.billing_config (chave, valor, tipo, descricao) values
  ('heartbeat_sessao_segundos', '15', 'number', 'Intervalo do heartbeat da sessão ativa'),
  ('tolerancia_desconexao_segundos', '120', 'number', 'Tolerância antes do encerramento por desconexão')
on conflict (chave) do nothing;
