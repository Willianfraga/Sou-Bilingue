-- Entrevista de boas-vindas (onboarding pedagógico). Uma linha por aluno:
-- as respostas confirmadas viram contexto permanente do tutor de IA
-- (src/lib/onboarding/contexto.ts); o rascunho guarda o progresso enquanto
-- a entrevista não é concluída, para sobreviver a um refresh ou troca de
-- aparelho.
--
-- As respostas ficam em jsonb porque o questionário é versionado
-- (versao_questionario): mudar perguntas não exige migration, e a validação
-- de formato é feita no servidor por src/lib/onboarding/questionario.ts.
-- Idempotente: pode rodar mais de uma vez.

create table if not exists public.aluno_onboarding (
  aluno_id uuid primary key references public.alunos (id) on delete cascade,
  respostas jsonb not null default '{}'::jsonb
    check (jsonb_typeof(respostas) = 'object' and pg_column_size(respostas) < 16384),
  rascunho jsonb not null default '{}'::jsonb
    check (jsonb_typeof(rascunho) = 'object' and pg_column_size(rascunho) < 16384),
  etapa_atual smallint not null default 0 check (etapa_atual between 0 and 50),
  versao_questionario smallint not null default 1,
  concluido_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.aluno_onboarding enable row level security;

-- Só o próprio aluno lê e grava as respostas dele. Responsável e admin não
-- entram aqui de propósito: são preferências pessoais que só servem ao tutor.
drop policy if exists "aluno le o proprio onboarding" on public.aluno_onboarding;
create policy "aluno le o proprio onboarding"
  on public.aluno_onboarding for select
  using (auth.uid() = aluno_id);

drop policy if exists "aluno cria o proprio onboarding" on public.aluno_onboarding;
create policy "aluno cria o proprio onboarding"
  on public.aluno_onboarding for insert
  with check (auth.uid() = aluno_id);

drop policy if exists "aluno atualiza o proprio onboarding" on public.aluno_onboarding;
create policy "aluno atualiza o proprio onboarding"
  on public.aluno_onboarding for update
  using (auth.uid() = aluno_id)
  with check (auth.uid() = aluno_id);

comment on table public.aluno_onboarding is
  'Entrevista de boas-vindas do aluno: respostas confirmadas, rascunho e data de conclusão.';
