-- Corrige um bug de RLS encontrado testando a interface do responsável com
-- login real (17 ago 2026): a policy de profiles só deixava cada um ler o
-- próprio perfil, então o responsável via a cota semanal, o certificado e o
-- consentimento do aluno vinculado, mas não conseguia ler o NOME do aluno
-- (profiles.nome) — a tela de progresso/consentimento ficava com "undefined".
--
-- app.pode_ver_aluno(id) já cobre exatamente essa regra em todo o resto do
-- schema (aluno vê o próprio dado, responsável vê o do aluno vinculado,
-- admin vê tudo) — profiles.id === alunos.id (1:1), então a mesma função
-- serve aqui sem precisar de uma nova.

drop policy "usuário lê o próprio profile, admin lê todos" on public.profiles;

create policy "usuário lê o próprio profile, responsável lê o do aluno vinculado, admin lê tudo"
  on public.profiles for select
  using (app.pode_ver_aluno(id));
