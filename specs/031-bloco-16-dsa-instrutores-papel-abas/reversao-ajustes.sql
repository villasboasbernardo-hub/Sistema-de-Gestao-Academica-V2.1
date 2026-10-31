-- Reversão da migration 20261031151628_ajustes_de_avaliacao.sql (spec 031, Bloco 16, ajuste D).
-- ⚠️ Recusa se houver ajuste gravado: a tabela sai, e com ela o histórico.
begin;

do $$
begin
  if exists (select 1 from public.ajustes_de_avaliacao) then
    raise exception 'ha ajuste de avaliacao gravado: a reversao apagaria o historico';
  end if;
end $$;

drop table public.ajustes_de_avaliacao;
drop function app.guardar_ajuste_de_avaliacao();
drop function app.proximo_codigo_ajuste_de_avaliacao();
drop sequence app.ajustes_de_avaliacao_codigo_seq;

commit;
