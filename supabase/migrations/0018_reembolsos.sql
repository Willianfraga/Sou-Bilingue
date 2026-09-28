-- Solicitações de reembolso e trilha de auditoria (27 set 2026).
-- Idempotente; só acrescenta tabelas. Política: docs/refund-policy.md.
-- Provedor: Asaas (POST /v3/payments/{id}/refund; webhooks PAYMENT_REFUNDED,
-- PAYMENT_PARTIALLY_REFUNDED, PAYMENT_REFUND_IN_PROGRESS, PAYMENT_REFUND_DENIED).

-- Correção: o checkout grava a assinatura como 'pendente' até o pagamento,
-- mas a restrição do banco (restaurado do backup) só aceitava ativa/pausada/
-- cancelada — nenhuma venda conseguia começar. Só amplia a lista.
alter table public.subscriptions drop constraint if exists subscriptions_status_check;
alter table public.subscriptions add constraint subscriptions_status_check
  check (status in ('ativa', 'pausada', 'cancelada', 'pendente'));

create table if not exists public.reembolsos (
  id uuid primary key default gen_random_uuid(),
  protocolo text not null unique,
  aluno_id uuid not null references public.alunos (id) on delete restrict,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  payment_id uuid references public.payments (id) on delete set null,
  asaas_payment_id text not null,
  valor numeric(10, 2) not null check (valor > 0),
  dentro_do_prazo boolean not null,
  prazo_final timestamptz not null,
  motivo text check (motivo is null or char_length(motivo) <= 80),
  comentario text check (comentario is null or char_length(comentario) <= 1000),
  status text not null check (status in (
    'REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PROCESSING', 'REFUNDED', 'FAILED'
  )),
  erro text check (erro is null or char_length(erro) <= 500),
  solicitado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Um pagamento nunca tem dois pedidos em aberto ou concluídos: só um novo
-- pedido depois de um negado ou falho.
create unique index if not exists reembolsos_um_ativo_por_pagamento
  on public.reembolsos (asaas_payment_id)
  where status not in ('REJECTED', 'FAILED');
create index if not exists reembolsos_aluno on public.reembolsos (aluno_id, solicitado_em desc);

alter table public.reembolsos enable row level security;

-- Aluno lê só os próprios pedidos; admin lê todos. Escrita só pelo servidor
-- (service role), que calcula prazo, valor e estado — nunca o navegador.
drop policy if exists "aluno le os proprios reembolsos e admin todos" on public.reembolsos;
create policy "aluno le os proprios reembolsos e admin todos"
  on public.reembolsos for select
  using (auth.uid() = aluno_id or app.is_admin());

-- Trilha de auditoria: só acrescenta (sem policy de update/delete).
create table if not exists public.reembolso_eventos (
  id bigint generated always as identity primary key,
  reembolso_id uuid not null references public.reembolsos (id) on delete restrict,
  tipo text not null check (char_length(tipo) <= 40),
  status_anterior text,
  status_novo text,
  ator text not null check (ator in ('aluno', 'admin', 'webhook', 'sistema')),
  ator_id uuid references public.profiles (id) on delete set null,
  observacao text check (observacao is null or char_length(observacao) <= 1000),
  criado_em timestamptz not null default now()
);
create index if not exists reembolso_eventos_por_pedido on public.reembolso_eventos (reembolso_id, criado_em);

alter table public.reembolso_eventos enable row level security;

drop policy if exists "admin le eventos de reembolso" on public.reembolso_eventos;
create policy "admin le eventos de reembolso"
  on public.reembolso_eventos for select using (app.is_admin());
