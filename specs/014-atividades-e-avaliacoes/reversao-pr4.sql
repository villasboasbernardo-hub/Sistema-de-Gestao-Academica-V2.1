-- =================================================================================
-- Spec 014, PR 4 — plano de REVERSÃO das migrations E-4, E-5, D-5, D-6, D-4 e D-7 (T154)
--
-- Ordem inversa da aplicação: D-7 → D-4 → D-6 → D-5 → E-5 → E-4.
-- ⚠️ No REMOTO, nada é apagado (regra 4): dado volta por UPDATE, item vira `inativo`, tabela fica. Os blocos
--    marcados «SÓ NA BASE DESCARTÁVEL» desfazem estrutura e servem para provar que a impressão digital volta.
-- ⚠️ O valor de enum `substituida_pela_planilha` NÃO se desfaz (o PostgreSQL não tem `drop value`): depois
--    da D-7 desfeita ele fica sem uso, e a impressão digital mostra exatamente essa diferença.
-- =================================================================================

begin;

-- ---------------------------------------------------------------- D-7 (três blocos)
-- D-8: o texto volta para observacoes, lido do migracao_log
update public.registros_aula r
   set observacoes = l.valor_antes, outros_instrutores = '{}'
  from public.migracao_log l
 where l.codigo like 'MLOG-014-D8-%' and l.destino_chave = r.codigo;
-- D-7b: as sessões criadas pela migration ficam inativas (a do espelho, criada depois, fica)
update public.vistas_de_avaliacao set status = 'inativo'
 where numero = 1 and status = 'ativo'
   and origem_migracao_v1 = 'spec014-D7b';
-- D-7: a substituída volta a cancelada
update public.avaliacoes set status = 'cancelada', status_anterior = null where status = 'substituida_pela_planilha';

-- ---------------------------------------------------------------- D-4
update public.avaliacoes_curriculo set status = 'inativo' where origem_migracao_v1 like 'spec014-D4:%';

-- ---------------------------------------------------------------- D-6 (o mapa de volta)
-- O mapa está em migracao_log (`MLOG-014-D6-…-<curso>`: origem_chave = a extra, destino_chave = a unificada,
-- e as contagens). A volta, por par:
--   update public.disciplinas set status = 'ativo' where id = <extra>;
--   update public.disciplinas set cod_disciplina = <cod antigo>, nome_disciplina = <nome antigo>,
--          carga_horaria_tempos = <ch antiga> where id = <unificada>;
--   as UEs de numeração da extra (I-I: UE 7; FIS: UE 2) voltam a ela;
--   aulas, avaliações e atividades cujos códigos o antes/depois lista voltam à extra;
--   a turma_disciplina extra volta a `ativo`, e as linhas `turma_disciplina_instrutor` com
--   origem `spec014-D6` ficam `inativo`.
-- ⚠️ Escrito por par e não genérico de propósito: a volta precisa da lista de lançamentos que o
--    antes/depois mediu (`antes-depois/unificar_hn2101_e_matfis.md`), não de uma regra que adivinhe.

-- ---------------------------------------------------------------- D-5 (os valores antigos, do migracao_log)
-- Cada caso B-n tem `valor_antes` («cod=…; nome=…; ch=…; status=…») em `MLOG-014-D5-…`; a volta é o UPDATE
-- desses quatro campos na disciplina do `origem_chave`.

-- ---------------------------------------------------------------- E-5 — SÓ NA BASE DESCARTÁVEL
-- drop trigger trg_avaliacoes_espelhar_vista on public.avaliacoes; drop function app.espelhar_vista_na_sessao_1();
-- drop view public.vw_avaliacoes_situacao; drop function app.fn_status_vista(uuid, date, integer);
-- recriar app.fn_status_vista(date, date, status_avaliacao, integer), vw_avaliacoes_situacao, vw_carga_horaria_turma,
-- vw_ocupacao_ta (sem sessao_id/numero_sessao: drop + create), vw_disciplinas_execucao, vw_instrutor_carga_anual,
-- app.lancamentos_que_travam_vigencia e public.gravar_lancamentos_em_transacao pelas definições de
-- 20261014051943, 20261005181116, 20260915084854, 20261006210242 e 20261008223717; aval_ta_coerente pela de
-- 20261006225009; os comentários das colunas de vista.

-- ---------------------------------------------------------------- E-4 — SÓ NA BASE DESCARTÁVEL
-- No remoto: as tabelas novas ficam, vazias de uso. Na base descartável:
-- drop table public.vistas_de_avaliacao, public.avaliacoes_curriculo_turma; alter table public.avaliacoes
--   drop constraint avaliacoes_item_da_disciplina, drop column avaliacao_curriculo_id, drop column ues_abordadas,
--   drop column outros_instrutores, drop column status_anterior; drop table public.avaliacoes_curriculo;
-- alter table public.registros_aula drop column outros_instrutores; as funções, sequências e a permissão
-- `avaliacoes_curriculo_arbitrado`; as policies de escrita de `avaliacoes_planejadas` de volta.

commit;
