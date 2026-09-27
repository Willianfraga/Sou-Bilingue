-- Elenco de 6 tutores: 2 crianças, 2 jovens, 2 adultos (uma mulher e um
-- homem em cada faixa). Reaproveita os IDs que já têm voz mapeada em
-- src/lib/voice/elevenlabs.ts — nenhum tutor é apagado, porque
-- alunos.tutor_id referencia esta tabela. As imagens ficam em
-- public/tutores/ (ilustrações do próprio app).
-- Idempotente: pode rodar mais de uma vez.

alter table public.tutores
  add column if not exists foto_url text,
  add column if not exists faixa_etaria text
    check (faixa_etaria in ('crianca', 'jovem', 'adulto')),
  add column if not exists genero text
    check (genero in ('feminino', 'masculino')),
  add column if not exists ativo boolean not null default true;

insert into public.tutores (id, nome, descricao, foto_url, faixa_etaria, genero, ativo) values
  ('41396d05-5d7d-4913-866b-109f441b2e0b', 'Luna',
   'Criança alegre e curiosa. Conversa sobre escola, bichos e brincadeiras, com frases curtas e muito incentivo.',
   '/tutores/luna.svg', 'crianca', 'feminino', true),
  ('dbed74f6-38e3-414e-8ad7-4e508c73e839', 'Theo',
   'Criança animada e brincalhona. Adora jogos, desenhos e histórias, e transforma a prática em diversão.',
   '/tutores/theo.svg', 'crianca', 'masculino', true),
  ('2fbd2c7b-8613-44c1-961c-542b72f250e7', 'Mei',
   'Jovem leve e descontraída. Fala de música, séries, redes sociais e planos para o futuro.',
   '/tutores/mei.svg', 'jovem', 'feminino', true),
  ('2dff69b8-0df7-4740-b67e-4caa7bf38ecc', 'Diego',
   'Jovem comunicativo e bem-humorado. Bom para praticar conversas do dia a dia, viagens e esportes.',
   '/tutores/diego.svg', 'jovem', 'masculino', true),
  ('e315b919-9faf-4ebb-a786-db46a676c01e', 'Clara',
   'Adulta calorosa e paciente. Ideal para trabalho, entrevistas e situações profissionais.',
   '/tutores/clara.svg', 'adulto', 'feminino', true),
  ('3af0510b-a5b5-40d9-9772-fd0fb6ba6943', 'Seu Antônio',
   'Adulto sereno e bem-humorado, com tom pausado. Ótimo para quem prefere um ritmo tranquilo.',
   '/tutores/antonio.svg', 'adulto', 'masculino', true)
on conflict (id) do update set
  nome = excluded.nome,
  descricao = excluded.descricao,
  foto_url = excluded.foto_url,
  faixa_etaria = excluded.faixa_etaria,
  genero = excluded.genero,
  ativo = true;

-- Tutores fora do elenco saem da escolha, mas continuam existindo para não
-- quebrar alunos que já os tinham escolhido.
update public.tutores
set ativo = false
where id not in (
  '41396d05-5d7d-4913-866b-109f441b2e0b',
  'dbed74f6-38e3-414e-8ad7-4e508c73e839',
  '2fbd2c7b-8613-44c1-961c-542b72f250e7',
  '2dff69b8-0df7-4740-b67e-4caa7bf38ecc',
  'e315b919-9faf-4ebb-a786-db46a676c01e',
  '3af0510b-a5b5-40d9-9772-fd0fb6ba6943'
);

-- Garante a leitura para qualquer usuário logado (mesma regra da 0001),
-- caso a policy não exista neste projeto.
alter table public.tutores enable row level security;
drop policy if exists "tutores são públicos pra qualquer usuário autenticado" on public.tutores;
create policy "tutores são públicos pra qualquer usuário autenticado"
  on public.tutores for select
  using (auth.uid() is not null);
