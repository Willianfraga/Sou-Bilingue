-- Página de vendas editável e eventos do funil (27 set 2026).
-- Idempotente; não altera dados existentes. Docs: docs/sales-page.md.

-- Conteúdo da página de vendas: uma única linha (id = 1), em jsonb validado
-- pelo servidor (src/lib/vendas/conteudo.ts). Qualquer visitante lê; só
-- administrador grava.
create table if not exists public.pagina_vendas (
  id smallint primary key default 1 check (id = 1),
  conteudo jsonb not null default '{}'::jsonb
    check (jsonb_typeof(conteudo) = 'object' and pg_column_size(conteudo) < 65536),
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references public.profiles (id) on delete set null
);
alter table public.pagina_vendas enable row level security;

drop policy if exists "pagina de vendas e publica" on public.pagina_vendas;
create policy "pagina de vendas e publica"
  on public.pagina_vendas for select using (true);

drop policy if exists "admin cria conteudo da pagina de vendas" on public.pagina_vendas;
create policy "admin cria conteudo da pagina de vendas"
  on public.pagina_vendas for insert with check (app.is_admin());

drop policy if exists "admin edita conteudo da pagina de vendas" on public.pagina_vendas;
create policy "admin edita conteudo da pagina de vendas"
  on public.pagina_vendas for update using (app.is_admin()) with check (app.is_admin());

-- Eventos do funil de vendas. Sem dados pessoais: sessão anônima gerada no
-- navegador, página, plano e parâmetros de campanha. Gravação só pelo
-- servidor (service role em /api/eventos e no webhook); leitura só admin.
create table if not exists public.eventos_funil (
  id bigint generated always as identity primary key,
  nome text not null check (nome in (
    'pagina_vista', 'cta_principal', 'como_funciona', 'planos_vistos',
    'plano_selecionado', 'cupom_na_url', 'ida_ao_checkout', 'compra_confirmada'
  )),
  sessao text check (sessao is null or char_length(sessao) <= 64),
  pagina text check (pagina is null or char_length(pagina) <= 120),
  plano text check (plano is null or char_length(plano) <= 40),
  utm_source text, utm_medium text, utm_campaign text, utm_term text, utm_content text,
  src text, sck text, cupom text,
  -- preenchido só em compra_confirmada (vem do webhook, não do navegador)
  aluno_id uuid references public.profiles (id) on delete set null,
  criado_em timestamptz not null default now()
);
create index if not exists eventos_funil_nome_data on public.eventos_funil (nome, criado_em desc);
alter table public.eventos_funil enable row level security;

drop policy if exists "admin le eventos do funil" on public.eventos_funil;
create policy "admin le eventos do funil"
  on public.eventos_funil for select using (app.is_admin());
