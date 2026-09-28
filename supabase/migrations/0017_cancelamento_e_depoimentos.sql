-- Cancelamento pelo próprio aluno e depoimentos com autorização (27 set 2026).
-- Idempotente; só acrescenta colunas/tabela. Docs: docs/plans-and-credits.md
-- (cancelamento) e docs/sales-page.md (depoimentos).

-- Cancelamento: as próximas cobranças são canceladas no Asaas na hora; o
-- acesso continua até acesso_ate (fim do período já pago). O histórico
-- financeiro nunca é apagado.
alter table public.subscriptions
  add column if not exists cancelamento_solicitado_em timestamptz,
  add column if not exists motivo_cancelamento text
    check (motivo_cancelamento is null or char_length(motivo_cancelamento) <= 300),
  add column if not exists acesso_ate date;

-- Depoimentos enviados pelos alunos. Só aparecem na página de vendas depois
-- de: (1) o aluno autorizar a publicação e (2) o administrador aprovar.
-- A página de vendas lê pelo servidor (service role) só os campos públicos.
create table if not exists public.depoimentos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null unique references public.alunos (id) on delete cascade,
  nome_exibicao text not null check (char_length(nome_exibicao) between 2 and 60),
  contexto text not null default '' check (char_length(contexto) <= 80),
  texto text not null check (char_length(texto) between 20 and 500),
  autorizou_publicacao boolean not null check (autorizou_publicacao),
  autorizado_em timestamptz not null default now(),
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'recusado', 'retirado')),
  moderado_em timestamptz,
  moderado_por uuid references public.profiles (id) on delete set null,
  criado_em timestamptz not null default now()
);
alter table public.depoimentos enable row level security;

drop policy if exists "aluno envia o proprio depoimento" on public.depoimentos;
create policy "aluno envia o proprio depoimento"
  on public.depoimentos for insert
  with check (auth.uid() = aluno_id and autorizou_publicacao and status = 'pendente');

drop policy if exists "aluno le o proprio depoimento e admin le todos" on public.depoimentos;
create policy "aluno le o proprio depoimento e admin le todos"
  on public.depoimentos for select
  using (auth.uid() = aluno_id or app.is_admin());

-- Aluno pode retirar a autorização a qualquer momento (status 'retirado');
-- admin modera (aprovado/recusado).
drop policy if exists "aluno retira e admin modera depoimento" on public.depoimentos;
create policy "aluno retira e admin modera depoimento"
  on public.depoimentos for update
  using (auth.uid() = aluno_id or app.is_admin())
  with check (app.is_admin() or (auth.uid() = aluno_id and status = 'retirado'));
