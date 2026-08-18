-- SouBilingue — schema inicial
-- Espelha os tipos de src/lib/types.ts. Ainda não rodou contra nenhum projeto
-- Supabase real (nenhum foi criado até 17 ago 2026) — primeira execução real
-- é o próximo passo. Projeto Supabase É SEPARADO do "academia flow"
-- (CLAUDE.md decisão 15) — nunca aplicar isso no projeto do academia flow.

-- ============================================================================
-- 1. Tipos enumerados — espelham os union types de src/lib/types.ts
-- ============================================================================

create type public.papel_usuario as enum ('aluno', 'responsavel', 'admin');

create type public.plano as enum ('basico', 'intermediario', 'avancado');

create type public.idioma as enum ('espanhol', 'frances', 'ingles', 'mandarim', 'italiano');

create type public.status_assinatura as enum ('ativa', 'atrasada', 'cancelada');

create type public.status_conteudo as enum ('publicado', 'em_curadoria');

create type public.status_prospeccao as enum ('contatada', 'negociando', 'fechada');

-- ============================================================================
-- 2. Identidade — profiles espelha auth.users; alunos/responsáveis por role
-- ============================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  papel public.papel_usuario not null,
  nome text not null,
  criado_em timestamptz not null default now()
);

comment on table public.profiles is
  'Um registro por conta de login — aluno, responsável ou criador (admin).';

-- Elenco diverso de tutores de IA (§ 03) — tabela pequena, seed abaixo.
create table public.tutores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text not null
);

-- alunos.id === profiles.id (1:1). responsavel_id é nulo se o aluno é maior
-- de idade — cadastro autossuficiente (§ 02: gate por idade via consentimento).
create table public.alunos (
  id uuid primary key references public.profiles (id) on delete cascade,
  responsavel_id uuid references public.profiles (id) on delete restrict,
  maior_de_idade boolean not null,
  idioma public.idioma not null,
  sotaque text not null,
  plano public.plano not null,
  tutor_id uuid not null references public.tutores (id),
  objetivo_pessoal text not null default '',
  criado_em timestamptz not null default now(),
  constraint responsavel_obrigatorio_se_menor
    check (maior_de_idade or responsavel_id is not null)
);

comment on table public.alunos is
  'Perfil do aluno (§ 03, § 04). responsavel_id nulo só quando maior_de_idade.';

-- § 02: consentimento LGPD (Art. 14) obrigatório antes de liberar o cadastro
-- do menor — sem isso a linha em alunos não deveria existir com maior_de_idade
-- falso (a aplicação valida isso antes do insert; o banco não força by design
-- porque o consentimento pode ser revogado depois sem apagar o histórico).
create table public.consentimentos_lgpd (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  responsavel_id uuid not null references public.profiles (id),
  consentido_em timestamptz not null default now(),
  revogado_em timestamptz
);

-- ============================================================================
-- 3. Motor de cota semanal e certificação (§ 05)
-- ============================================================================

-- Uma linha por semana do mês corrente do aluno. § 05: cota não acumula —
-- toda semana zera e recomeça; diasNecessarios vem do plano na criação da
-- linha (não recalcula se o aluno trocar de plano no meio do mês).
create table public.cotas_semanais (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  ano int not null,
  mes int not null check (mes between 1 and 12),
  semana_numero int not null check (semana_numero between 1 and 4),
  dias_necessarios int not null,
  dias_cumpridos int not null default 0,
  atualizado_em timestamptz not null default now(),
  unique (aluno_id, ano, mes, semana_numero)
);

-- Uma linha por aula realizada — o que incrementa dias_cumpridos da semana
-- corrente. nota_qualidade decide sozinha se conta (§ 04: validação sempre
-- automática, nenhum plano tem revisão humana).
create table public.aulas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  realizada_em timestamptz not null default now(),
  nota_qualidade numeric(5, 2) not null,
  contou_para_cota boolean not null
);

create table public.regras_certificacao (
  plano public.plano primary key,
  nota_minima numeric(5, 2) not null
);

-- § 05: um certificado por mês conquistado, nunca por aula/semana.
-- codigo_verificacao é o que /verificar/[codigo] confere publicamente.
create table public.certificados (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete restrict,
  mes_referencia date not null, -- sempre dia 1 do mês, ex. 2026-07-01
  idioma public.idioma not null,
  plano public.plano not null,
  codigo_verificacao text not null unique,
  emitido_em timestamptz not null default now(),
  unique (aluno_id, mes_referencia)
);

comment on table public.certificados is
  'on delete restrict — certificado é histórico, nunca some com o aluno (mesma regra de invoices/payments do academia flow).';

-- ============================================================================
-- 4. Aquisição — cupom, origem, funil (§ 12)
-- ============================================================================

create table public.cupons (
  id uuid primary key default gen_random_uuid(),
  nome_escola text not null,
  codigo text not null unique,
  desconto_percentual int not null check (desconto_percentual between 1 and 100),
  criado_em timestamptz not null default now()
);

comment on table public.cupons is
  'Válido só na primeira mensalidade (§ 12) — a regra de "só 1x" fica na aplicação, não no banco.';

-- Um registro por aluno cadastrado — de qual QR/escola/cupom ele veio.
create table public.cadastros_origem (
  aluno_id uuid primary key references public.alunos (id) on delete cascade,
  cupom_id uuid references public.cupons (id),
  escola_origem text not null,
  cadastrado_em timestamptz not null default now()
);

-- ============================================================================
-- 5. Cobrança (visão — Asaas é a fonte da verdade, mesmo padrão do academia
--    flow: banco espelha o que o webhook confirma, nunca decide sozinho)
-- ============================================================================

create table public.assinaturas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete restrict,
  plano public.plano not null,
  status public.status_assinatura not null default 'ativa',
  proxima_cobranca date,
  asaas_subscription_id text unique,
  criado_em timestamptz not null default now()
);

-- ============================================================================
-- 6. Operação do criador — CMS e prospecção (§ 03)
-- ============================================================================

create table public.conteudo_por_nivel (
  idioma public.idioma not null,
  nivel text not null,
  status public.status_conteudo not null default 'em_curadoria',
  atualizado_em timestamptz not null default now(),
  primary key (idioma, nivel)
);

create table public.parcerias_escolas (
  id uuid primary key default gen_random_uuid(),
  nome_escola text not null,
  status public.status_prospeccao not null default 'contatada',
  atualizado_em timestamptz not null default now()
);

-- ============================================================================
-- 7. Funções auxiliares de RLS (mesmo espírito do app.can_read/can_manage do
--    academia flow, adaptado — aqui não tem academy_id, a fronteira é o
--    vínculo aluno/responsável/admin)
-- ============================================================================

create schema if not exists app;

create or replace function app.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and papel = 'admin'
  );
$$;

-- Aluno vê o próprio dado; responsável vê o do aluno vinculado; admin vê tudo.
create or replace function app.pode_ver_aluno(p_aluno_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() = p_aluno_id
    or exists (
      select 1 from public.alunos
      where id = p_aluno_id and responsavel_id = auth.uid()
    )
    or app.is_admin();
$$;

-- ============================================================================
-- 8. RLS — habilitar em toda tabela com dado de aluno/responsável
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.alunos enable row level security;
alter table public.consentimentos_lgpd enable row level security;
alter table public.cotas_semanais enable row level security;
alter table public.aulas enable row level security;
alter table public.certificados enable row level security;
alter table public.assinaturas enable row level security;
alter table public.cadastros_origem enable row level security;
alter table public.cupons enable row level security;
alter table public.conteudo_por_nivel enable row level security;
alter table public.regras_certificacao enable row level security;
alter table public.parcerias_escolas enable row level security;
alter table public.tutores enable row level security;

create policy "usuário lê o próprio profile, admin lê todos"
  on public.profiles for select
  using (id = auth.uid() or app.is_admin());

create policy "aluno/responsável/admin leem o aluno certo"
  on public.alunos for select
  using (app.pode_ver_aluno(id));

create policy "aluno/responsável/admin leem o consentimento do aluno certo"
  on public.consentimentos_lgpd for select
  using (app.pode_ver_aluno(aluno_id));

create policy "aluno/responsável/admin leem a cota do aluno certo"
  on public.cotas_semanais for select
  using (app.pode_ver_aluno(aluno_id));

create policy "aluno/responsável/admin leem as aulas do aluno certo"
  on public.aulas for select
  using (app.pode_ver_aluno(aluno_id));

create policy "aluno/responsável/admin leem os certificados do aluno certo"
  on public.certificados for select
  using (app.pode_ver_aluno(aluno_id));

create policy "aluno/responsável/admin leem a assinatura do aluno certo"
  on public.assinaturas for select
  using (app.pode_ver_aluno(aluno_id));

create policy "só admin lê origem de cadastro"
  on public.cadastros_origem for select
  using (app.is_admin());

create policy "só admin opera cupom, conteúdo, regra e parceria"
  on public.cupons for select using (app.is_admin());

create policy "conteúdo por nível só pra admin"
  on public.conteudo_por_nivel for select using (app.is_admin());

create policy "regra de certificação só pra admin"
  on public.regras_certificacao for select using (app.is_admin());

create policy "parceria com escola só pra admin"
  on public.parcerias_escolas for select using (app.is_admin());

create policy "tutores são públicos pra qualquer usuário autenticado"
  on public.tutores for select
  using (auth.uid() is not null);

-- Nenhuma policy de insert/update/delete criada ainda — toda escrita hoje
-- passa pelo cliente admin (service role, que ignora RLS), como no academia
-- flow. Quando as Server Actions de cadastro/checkout existirem, adicionar
-- policies de escrita específicas em vez de abrir tudo.

-- ============================================================================
-- 9. Seed — dado inicial que hoje vive em src/lib/mock/*.ts
-- ============================================================================

insert into public.tutores (nome, descricao) values
  ('Clara', 'Mulher, sotaque neutro'),
  ('Diego', 'Homem, 30 e poucos anos'),
  ('Mei', 'Mulher, voz jovem'),
  ('Seu Antônio', 'Senhor, tom pausado');

insert into public.regras_certificacao (plano, nota_minima) values
  ('basico', 60),
  ('intermediario', 70),
  ('avancado', 80);

insert into public.conteudo_por_nivel (idioma, nivel, status) values
  ('espanhol', 'A1-A2', 'publicado'),
  ('espanhol', 'B1-B2', 'publicado'),
  ('espanhol', 'C1+', 'em_curadoria');
