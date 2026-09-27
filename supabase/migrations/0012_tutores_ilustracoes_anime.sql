-- Ilustrações em estilo anime (personagens fictícios) para os 6 tutores,
-- em public/tutores/anime/. As fotos e SVGs anteriores continuam em
-- public/tutores/, sem uso.
-- Idempotente: pode rodar mais de uma vez.

update public.tutores set foto_url = '/tutores/anime/luna.png'    where id = '41396d05-5d7d-4913-866b-109f441b2e0b';
update public.tutores set foto_url = '/tutores/anime/theo.png'    where id = 'dbed74f6-38e3-414e-8ad7-4e508c73e839';
update public.tutores set foto_url = '/tutores/anime/mei.png'     where id = '2fbd2c7b-8613-44c1-961c-542b72f250e7';
update public.tutores set foto_url = '/tutores/anime/diego.png'   where id = '2dff69b8-0df7-4740-b67e-4caa7bf38ecc';
update public.tutores set foto_url = '/tutores/anime/clara.png'   where id = 'e315b919-9faf-4ebb-a786-db46a676c01e';
update public.tutores set foto_url = '/tutores/anime/antonio.png' where id = '3af0510b-a5b5-40d9-9772-fd0fb6ba6943';
