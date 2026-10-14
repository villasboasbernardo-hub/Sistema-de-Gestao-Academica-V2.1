-- =================================================================================
-- Spec 014, PR 1.1 · REVERSÃO das migrations E-3 e D-3 (T044). Ordem: D-3 → E-3. Escrita à mão.
--
--   (A) BASE DESCARTÁVEL: `drop` das duas tabelas novas e das funções; a impressão digital tem de
--       voltar à do PR 1 (`58d13d0a…`, 1.722 objetos, medida em 14/10/2026).
--   (B) REMOTO: nada é apagado (regra 4) — os previstos ficam `inativo`, a trilha fica como está (é
--       imutável), e só a view, as policies e o privilégio de `reservas_proens` voltam.
-- =================================================================================

begin;

-- ---------------------------------------------------------------- D-3 (dado)
update public.previstos_proens_turma set status = 'inativo'
 where origem_migracao_v1 like 'spec014-D3:%' and status = 'ativo';
update public.config_parametros set status = 'inativo'
 where chave like 'proens.reserva_generica_%' and status = 'ativo';
insert into public.migracao_log (codigo, origem_tabela, destino_tabela, acao, regra_aplicada, observacao)
values ('MLOG-014-D3-REV-' || to_char(now(), 'YYYYMMDDHH24MISS'), 'reservas_proens', 'previstos_proens_turma',
        'descartado'::public.acao_migracao, 'Reversão da D-3 (spec 014)',
        'Previstos e reserva genérica da D-3 inativados pela reversão do PR 1.1.');

-- ---------------------------------------------------------------- E-3 (estrutura)
-- reservas_proens volta a ter escrita, com as policies e a ACL medidas antes da E-3:
grant insert, update on public.reservas_proens to authenticated;
create policy reservas_proens_criar on public.reservas_proens for insert to authenticated
  with check (app.pode('calendario', 'criar') and app.alcanca_curso(curso_id) and app.curso_em_oferta(curso_id));
create policy reservas_proens_editar on public.reservas_proens for update to authenticated
  using (app.pode('calendario', 'editar') and app.alcanca_curso(curso_id) and app.curso_em_oferta(curso_id))
  with check (app.pode('calendario', 'editar') and app.alcanca_curso(curso_id) and app.curso_em_oferta(curso_id));
comment on table public.reservas_proens is
  'Reservas anuais de TAD e TR por curso, concedidas pelo PROENS. Aposenta a constante `RESERVAS_PROENS` do `Código.gs`. v2.0: `Calendario_Reservas` §5.10. Origem: RF-DADOS-04; RNF-MAN-04; achado (e).';

-- A view anterior, copiada de 20260829235731_derivados_e_funcoes_de_dominio.sql, com a ACL de antes:
drop view public.vw_conformidade_tetos;
create or replace view public.vw_conformidade_tetos
with (security_invoker = true) as
select
  v.turma_id,
  v.turma_codigo,
  v.curso_id,
  v.curso_codigo,
  v.nome_curso,
  v.ano_letivo,
  v.chr_curricular,

  -- AEC ---------------------------------------------------------------------------------
  v.ta_aec,
  round(v.chr_curricular * app.fn_parametro_numerico('teto.aec_percentual_chr', v.ano_letivo) / 100, 2) as teto_aec,
  (v.ta_aec > v.chr_curricular * app.fn_parametro_numerico('teto.aec_percentual_chr', v.ano_letivo) / 100) as aec_excedido,

  -- TAD ---------------------------------------------------------------------------------
  v.ta_tad,
  round(v.chr_curricular * app.fn_parametro_numerico('teto.tad_percentual_chr', v.ano_letivo) / 100, 2) as teto_tad,
  (v.ta_tad > v.chr_curricular * app.fn_parametro_numerico('teto.tad_percentual_chr', v.ano_letivo) / 100) as tad_excedido,

  -- TR ----------------------------------------------------------------------------------
  v.ta_tr,
  round(v.chr_curricular * app.fn_parametro_numerico('teto.tr_percentual_chr', v.ano_letivo) / 100, 2) as teto_tr,
  (v.ta_tr > v.chr_curricular * app.fn_parametro_numerico('teto.tr_percentual_chr', v.ano_letivo) / 100) as tr_excedido,

  -- Reservas concedidas pelo PROENS, para comparar previsto × executado -------------------
  (select r.tempos_reservados from public.reservas_proens r
    where r.curso_id = v.curso_id and r.ano = v.ano_letivo
      and r.tipo_reserva = 'TAD' and r.status = 'ativo' limit 1) as tad_reservado_proens,
  (select r.tempos_reservados from public.reservas_proens r
    where r.curso_id = v.curso_id and r.ano = v.ano_letivo
      and r.tipo_reserva = 'TR'  and r.status = 'ativo' limit 1) as tr_reservado_proens,

  v.chd_executada,
  v.cht_executada,
  v.ta_estudo_individual
from public.vw_carga_horaria_turma v;

comment on view public.vw_conformidade_tetos is
  'Sinalização dos três tetos normativos por turma: AEC ≤ 10%, TAD ≤ 5% e TR ≤ 10% da CHR. '
  'Percentuais lidos de `config_parametros` (RNF-NORM-08), nunca literais. A saída é '
  'ALERTA na tela, jamais bloqueio (RN-DEG-02). Origem: RNF-NORM-02.';
revoke all on public.vw_conformidade_tetos from anon, authenticated;
grant select, insert, update, references, trigger, maintain on public.vw_conformidade_tetos to authenticated;

-- A permissão: (A) apagada; (B) no remoto, `update ... set permitido = false`.
delete from public.perfil_permissao where recurso = 'previsto_proens';

-- (A) base descartável:
drop table public.previstos_proens_alteracoes;
drop table public.previstos_proens_turma;
drop function app.previstos_proens_alteracoes_imutavel();
drop function app.registrar_alteracao_do_previsto();
-- (B) no remoto, no lugar das quatro linhas acima:
--   alter table public.previstos_proens_turma disable trigger trg_previstos_proens_trilha;  -- a trilha para de crescer

commit;
