-- Assistente de dúvidas da página de vendas (27 set 2026): dois eventos novos
-- no funil, sem conteúdo da conversa (nada do que o visitante escreve é
-- guardado). Só amplia a lista de nomes aceitos.
alter table public.eventos_funil drop constraint if exists eventos_funil_nome_check;
alter table public.eventos_funil add constraint eventos_funil_nome_check check (nome in (
  'pagina_vista', 'cta_principal', 'como_funciona', 'planos_vistos',
  'plano_selecionado', 'cupom_na_url', 'ida_ao_checkout', 'compra_confirmada',
  'assistente_aberto', 'assistente_pergunta'
));
