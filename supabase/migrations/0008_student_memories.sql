-- Memória persistente do tutor. Guarda fatos estáveis compartilhados pelo aluno
-- e permite continuar a conversa em aulas futuras sem repetir perguntas.
create table if not exists public.student_memories (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  chave text not null check (char_length(chave) between 2 and 60),
  valor text not null check (char_length(valor) between 1 and 500),
  criada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now(),
  unique (aluno_id, chave)
);

create index if not exists idx_student_memories_aluno
  on public.student_memories (aluno_id, atualizada_em desc);

alter table public.student_memories enable row level security;

create policy "aluno e administradores leem memorias permitidas"
  on public.student_memories for select
  using (app.pode_ver_aluno(aluno_id));

create policy "aluno grava as proprias memorias"
  on public.student_memories for insert
  with check (auth.uid() = aluno_id or app.is_admin());

create policy "aluno atualiza as proprias memorias"
  on public.student_memories for update
  using (auth.uid() = aluno_id or app.is_admin())
  with check (auth.uid() = aluno_id or app.is_admin());

comment on table public.student_memories is
  'Fatos duradouros compartilhados pelo aluno para personalização do tutor.';
