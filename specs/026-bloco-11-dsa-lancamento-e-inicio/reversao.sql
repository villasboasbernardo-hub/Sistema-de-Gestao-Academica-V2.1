-- =================================================================================
-- Reversão da spec 026 (Bloco 11): a migration `20261026043358_regime_da_semana_do_dsa`.
--
-- ⚠️ VALE ANTES DE USO REAL DO REGIME DA SEMANA: depois dele, desfazer apaga as escolhas «só esta semana» e «desde» e o
--    regime gravado das semanas salvas — e uma semana salva com um regime nomeado voltaria ao regime de `Editar turma`.
--    Decisão de Bernardo, nunca automática. A migration só acrescentou: nada existente é restaurado.
-- =================================================================================
begin;

drop function public.gravar_regime_da_semana_do_dsa(uuid, smallint, smallint);
drop function public.definir_regime_do_dsa_desde(uuid, smallint, smallint, uuid);
drop function public.definir_regime_do_dsa_so_nesta_semana(uuid, smallint, smallint, uuid);
drop function app.porteiro_do_regime_do_dsa(uuid, uuid);
drop function app.congelar_regime_da_semana(uuid, smallint, smallint);
drop function app.inserir_regime_da_semana(uuid, smallint, smallint, text, uuid);
drop function app.regime_resolvido_da_semana(uuid, date);
drop function app.semana_do_dsa_salva(uuid, smallint, smallint);
drop function app.segunda_da_semana_iso(smallint, smallint);

drop table public.turma_regime_vigencia;
drop table public.dsa_regime_da_semana;

drop function app.proximo_codigo_turma_regime_vigencia();
drop sequence app.turma_regime_vigencia_codigo_seq;
drop function app.proximo_codigo_regime_da_semana();
drop sequence app.dsa_regime_da_semana_codigo_seq;

delete from supabase_migrations.schema_migrations where version = '20261026043358';

commit;
