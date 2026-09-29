-- Retenção das conversas (29 set 2026): todo dia às 03:17 UTC apaga o texto
-- das mensagens com mais de 90 dias (função da migration 0020). Mantém data,
-- tokens, custo e status para os relatórios. Política: /privacidade.
create extension if not exists pg_cron;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'apagar-textos-conversas') then
    perform cron.unschedule('apagar-textos-conversas');
  end if;
  perform cron.schedule('apagar-textos-conversas', '17 3 * * *', 'select app.apagar_textos_antigos(90)');
end $$;
