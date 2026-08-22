-- Seed: Tutores com fotos e dados iniciais
-- Execute isso no console do Supabase para popular os dados iniciais

-- Inserir tutores com fotos (usando URLs públicas de avatares)
insert into public.tutores (id, nome, descricao, foto_url) values
  (
    'tutor-clara',
    'Clara',
    'Professora de Espanhol com 8 anos de experiência. Apaixonada por linguística e ensino dinâmico.',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop'
  ),
  (
    'tutor-marco',
    'Marco',
    'Professor de Francês nativo de Paris. Especialista em conversação e cultura francesa.',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop'
  ),
  (
    'tutor-sophia',
    'Sophia',
    'Professora de Inglês com foco em sotaque americano. Divertida e motivadora.',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop'
  ),
  (
    'tutor-wei',
    'Wei',
    'Professor de Mandarim nativo de Pequim. Paciência e expertise em tons e caracteres.',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop'
  )
on conflict (id) do update set
  foto_url = excluded.foto_url,
  descricao = excluded.descricao;

-- Inserir um perfil de aluno de teste (Lucas Melo)
-- Se não existir, criar; senão, manter o existente
insert into public.profiles (id, papel, nome)
values ('aluno-lucas', 'aluno', 'Lucas Melo')
on conflict (id) do nothing;

-- Inserir o aluno Lucas com tutor Clara
insert into public.alunos (
  id,
  maior_de_idade,
  idioma,
  sotaque,
  plano,
  tutor_id,
  objetivo_pessoal
) values (
  'aluno-lucas',
  true,
  'espanhol',
  'Espanha',
  'intermediario',
  'tutor-clara',
  'Viajar pela América Latina'
)
on conflict (id) do nothing;
