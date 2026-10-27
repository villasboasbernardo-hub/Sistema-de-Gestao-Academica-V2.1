-- =================================================================================
-- Reversão da spec 027 (Bloco 12): a migration `20261027123023_exclusao_logica_no_calendario`.
--
-- ⚠️ VALE ANTES DE USO REAL DO EXCLUIR: depois dele, desfazer apaga a marca das linhas excluídas — elas VOLTAM À LISTA
--    do calendário, inativas (continuam sem contar em nada, porque a exclusão as deixou `inativo`). O rastro em
--    `exclusoes_registradas` é imutável e fica. Decisão de Bernardo, nunca automática. A migration só acrescentou:
--    nada existente é restaurado.
-- =================================================================================
begin;

drop function public.excluir_linha_do_calendario(uuid);
drop function public.impacto_da_exclusao_do_feriado(uuid);
drop function app.excluir_linha_do_calendario(uuid);
drop function app.impacto_da_exclusao_do_feriado(uuid);

drop trigger trg_feriados_exclusao on public.feriados;
drop function app.guardar_exclusao_no_calendario();

alter table public.feriados
  drop constraint feriados_excluida_inativa,
  drop constraint feriados_exclusao_completa,
  drop column excluido_por,
  drop column excluido_em;

delete from supabase_migrations.schema_migrations where version = '20261027123023';

commit;
