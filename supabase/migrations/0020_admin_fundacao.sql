-- Painel administrativo — Fase A (fundação), 29 set 2026. Idempotente.
-- Plano e decisões: docs/admin-painel.md.

-- 1) Funções administrativas -------------------------------------------------
-- profiles.papel = 'admin' continua sendo quem entra no painel; a função diz
-- o que cada admin vê. 'geral' vê tudo.
create table if not exists public.admin_funcoes (
  admin_id uuid primary key references public.profiles (id) on delete cascade,
  funcoes text[] not null default '{geral}',
  atribuido_por uuid references public.profiles (id) on delete set null,
  atualizado_em timestamptz not null default now(),
  constraint admin_funcoes_validas check (
    cardinality(funcoes) > 0
    and funcoes <@ array['geral', 'financeiro', 'suporte', 'pedagogico', 'moderador', 'analista']::text[]
  )
);
alter table public.admin_funcoes enable row level security;
drop policy if exists "admin le funcoes" on public.admin_funcoes;
create policy "admin le funcoes" on public.admin_funcoes for select using (app.is_admin());

-- Admins que já existem entram como administrador geral.
insert into public.admin_funcoes (admin_id, funcoes)
select id, '{geral}' from public.profiles where papel = 'admin'
on conflict (admin_id) do nothing;

create or replace function app.tem_funcao(f text) returns boolean
language sql stable security definer set search_path = public as $$
  select app.is_admin() and exists (
    select 1 from public.admin_funcoes
    where admin_id = auth.uid() and ('geral' = any (funcoes) or f = any (funcoes))
  );
$$;

-- 2) Auditoria administrativa (só acréscimo) -----------------------------------
create table if not exists public.admin_auditoria (
  id bigint generated always as identity primary key,
  admin_id uuid references public.profiles (id) on delete set null,
  acao text not null check (char_length(acao) <= 60),
  entidade text not null check (char_length(entidade) <= 40),
  entidade_id text check (entidade_id is null or char_length(entidade_id) <= 80),
  antes jsonb,
  depois jsonb,
  motivo text check (motivo is null or char_length(motivo) <= 1000),
  resultado text not null check (resultado in ('ok', 'erro', 'negado')),
  ip text check (ip is null or char_length(ip) <= 64),
  criado_em timestamptz not null default now()
);
create index if not exists admin_auditoria_data on public.admin_auditoria (criado_em desc);
create index if not exists admin_auditoria_entidade on public.admin_auditoria (entidade, entidade_id, criado_em desc);
alter table public.admin_auditoria enable row level security;
drop policy if exists "admin le auditoria" on public.admin_auditoria;
create policy "admin le auditoria" on public.admin_auditoria for select using (app.tem_funcao('analista'));
-- Sem policy de insert/update/delete: grava só o servidor (service role).

-- 3) Preços de IA com histórico ---------------------------------------------------
create table if not exists public.precos_ia (
  id bigint generated always as identity primary key,
  provedor text not null check (char_length(provedor) <= 40),
  modelo text not null check (char_length(modelo) <= 80), -- prefixo: "claude-haiku-4-5" vale para "claude-haiku-4-5-20251001"
  unidade text not null check (unidade in (
    'mtok_entrada', 'mtok_saida', 'mtok_cache_escrita', 'mtok_cache_leitura', 'mil_caracteres', 'hora_audio'
  )),
  preco numeric(14, 6) not null check (preco >= 0),
  moeda text not null default 'USD' check (moeda ~ '^[A-Z]{3}$'),
  vigente_desde timestamptz not null default now(),
  fonte text not null check (char_length(fonte) <= 200),
  criado_por uuid references public.profiles (id) on delete set null,
  criado_em timestamptz not null default now()
);
create index if not exists precos_ia_busca on public.precos_ia (provedor, modelo, unidade, vigente_desde desc);
alter table public.precos_ia enable row level security;
drop policy if exists "admin le precos" on public.precos_ia;
create policy "admin le precos" on public.precos_ia for select using (app.is_admin());

insert into public.precos_ia (provedor, modelo, unidade, preco, fonte, vigente_desde)
select * from (values
  ('anthropic', 'claude-haiku-4-5', 'mtok_entrada', 1.00, 'Tabela pública da Anthropic (Haiku 4.5)', timestamptz '2025-10-01'),
  ('anthropic', 'claude-haiku-4-5', 'mtok_saida', 5.00, 'Tabela pública da Anthropic (Haiku 4.5)', timestamptz '2025-10-01'),
  ('anthropic', 'claude-haiku-4-5', 'mtok_cache_escrita', 1.25, 'Tabela pública da Anthropic (Haiku 4.5, cache 5 min)', timestamptz '2025-10-01'),
  ('anthropic', 'claude-haiku-4-5', 'mtok_cache_leitura', 0.10, 'Tabela pública da Anthropic (Haiku 4.5)', timestamptz '2025-10-01'),
  ('elevenlabs', 'eleven_flash_v2_5', 'mil_caracteres', 0.05, 'Estimativa (docs/CUSTOS_IA.md) — confirmar no plano contratado', timestamptz '2025-10-01'),
  ('elevenlabs', 'scribe_v2', 'hora_audio', 0.22, 'Estimativa (docs/CUSTOS_IA.md) — confirmar no plano contratado', timestamptz '2025-10-01')
) as v (provedor, modelo, unidade, preco, fonte, vigente_desde)
where not exists (select 1 from public.precos_ia);

-- 4) Conversas e mensagens (texto guardado por 90 dias) ---------------------------
-- Decisão do dono (29 set 2026). Sem policy: só o servidor lê e grava, e toda
-- leitura pelo painel fica em admin_auditoria. Política: /privacidade.
create table if not exists public.conversas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  tutor_id uuid references public.tutores (id) on delete set null,
  idioma text check (idioma is null or char_length(idioma) <= 20),
  iniciada_em timestamptz not null default now(),
  ultima_mensagem_em timestamptz not null default now()
);
create index if not exists conversas_aluno on public.conversas (aluno_id, ultima_mensagem_em desc);
create index if not exists conversas_data on public.conversas (ultima_mensagem_em desc);
alter table public.conversas enable row level security;

create table if not exists public.mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.conversas (id) on delete cascade,
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  papel text not null check (papel in ('aluno', 'tutor')),
  texto text check (texto is null or char_length(texto) <= 8000),
  texto_apagado_em timestamptz,
  status text not null default 'ok' check (status in ('ok', 'erro')),
  erro text check (erro is null or char_length(erro) <= 300),
  modelo text check (modelo is null or char_length(modelo) <= 80),
  versao_prompt integer,
  latencia_ms integer check (latencia_ms is null or latencia_ms >= 0),
  criado_em timestamptz not null default now()
);
create index if not exists mensagens_conversa on public.mensagens (conversa_id, criado_em);
create index if not exists mensagens_aluno on public.mensagens (aluno_id, criado_em desc);
create index if not exists mensagens_com_texto on public.mensagens (criado_em) where texto is not null;
alter table public.mensagens enable row level security;

-- Retenção: apaga o TEXTO (mantém data, tokens, custo e status) após N dias.
create or replace function app.apagar_textos_antigos(dias integer default 90) returns integer
language sql security definer set search_path = public as $$
  with apagadas as (
    update public.mensagens set texto = null, texto_apagado_em = now()
    where texto is not null and criado_em < now() - make_interval(days => dias)
    returning 1
  )
  select count(*)::integer from apagadas;
$$;
revoke all on function app.apagar_textos_antigos(integer) from public, anon, authenticated;

-- 5) Consumo de IA: contexto, falhas e origem do preço ------------------------------
alter table public.ai_usage_events
  add column if not exists tutor_id uuid references public.tutores (id) on delete set null,
  add column if not exists conversa_id uuid references public.conversas (id) on delete set null,
  add column if not exists mensagem_id uuid references public.mensagens (id) on delete set null,
  add column if not exists latencia_ms integer,
  add column if not exists status text not null default 'ok',
  add column if not exists erro text,
  add column if not exists origem text not null default 'aula',
  add column if not exists custo_origem text not null default 'estimado',
  add column if not exists preco_referencia jsonb;
alter table public.ai_usage_events alter column aluno_id drop not null; -- assistente de vendas: visitante anônimo
do $$ begin
  alter table public.ai_usage_events add constraint ai_usage_status_valido check (status in ('ok', 'erro'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.ai_usage_events add constraint ai_usage_origem_valida check (origem in ('aula', 'assistente_vendas', 'admin_teste'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.ai_usage_events add constraint ai_usage_custo_origem_valido check (custo_origem in ('estimado', 'confirmado'));
exception when duplicate_object then null; end $$;
create index if not exists ai_usage_data on public.ai_usage_events (created_at desc);
create index if not exists ai_usage_aluno on public.ai_usage_events (aluno_id, created_at desc);
create index if not exists ai_usage_tutor on public.ai_usage_events (tutor_id, created_at desc);
create index if not exists ai_usage_conversa on public.ai_usage_events (conversa_id);

-- Correção de segurança: o aluno conseguia inserir consumo de IA falso direto
-- pela API do banco. Agora só o servidor (service role) grava.
drop policy if exists "aluno registra o proprio consumo de ia" on public.ai_usage_events;

-- 6) Pagamentos: valor líquido confirmado pelo Asaas (netValue) ---------------------
alter table public.payments
  add column if not exists valor_liquido numeric(10, 2),
  add column if not exists moeda text not null default 'BRL';

-- 7) Tutores: ciclo de vida e autoria ---------------------------------------------
alter table public.tutores
  add column if not exists status text not null default 'ativo',
  add column if not exists atualizado_em timestamptz,
  add column if not exists atualizado_por uuid references public.profiles (id) on delete set null;
do $$ begin
  alter table public.tutores add constraint tutores_status_valido check (status in ('rascunho', 'teste', 'ativo', 'pausado', 'arquivado'));
exception when duplicate_object then null; end $$;
update public.tutores set status = case when ativo then 'ativo' else 'pausado' end where atualizado_em is null;

-- 8) Suspensão de conta ----------------------------------------------------------
alter table public.profiles
  add column if not exists suspenso_em timestamptz,
  add column if not exists suspenso_motivo text check (suspenso_motivo is null or char_length(suspenso_motivo) <= 500);
