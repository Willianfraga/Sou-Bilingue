-- Adiciona campo de URL de foto para os tutores de IA
-- Permite exibir avatar real (foto do rosto) na interface de chat

alter table public.tutores
add column foto_url text;

comment on column public.tutores.foto_url is
  'URL da foto do tutor de IA para exibir no avatar do chat.';
