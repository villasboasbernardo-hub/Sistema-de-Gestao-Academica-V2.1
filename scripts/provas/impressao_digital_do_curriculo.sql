-- =================================================================================
-- Impressão digital do que o currículo alimenta — spec 021 (Bloco 6, currículo versionado).
--
-- PARA QUE SERVE: provar que a migration do currículo versionado NÃO muda número nenhum de tela. Cada linha é
-- `objeto|linhas|md5`, com o md5 das linhas ORDENADAS pelo texto (independe da ordem do motor). Tira-se antes e
-- depois, na mesma base, e o `diff` tem de ser vazio.
--
-- ⚠️ AS COLUNAS SÃO LISTADAS UMA A UMA, e não `t.*`: uma coluna NOVA numa view (o `curriculo_id`, por exemplo) mudaria o
--    md5 sem mudar número nenhum — o instrumento mede o que a tela lê, não a forma da view.
-- ⚠️ O "HOJE" É FIXO (`2026-10-20`) nas funções "até uma data": as duas leituras têm de ver o mesmo dia.
-- ⚠️ SÓ LEITURA. Roda como dono (psql no contêiner local) — as views `security_invoker` leem tudo.
-- =================================================================================

with medidas(objeto, linha) as (
  select 'vw_carga_horaria_turma', row(turma_id, turma_codigo, curso_id, ano_letivo, status_turma, chr_curricular,
         ta_aula, ta_extraclasse, ta_avaliacao, ta_vista_prova, chd_executada, ta_aec, ta_tad, ta_tr,
         ta_estudo_individual, cht_executada, ta_apoio_individualizado, ta_dias_parados, ta_fora_do_dsa)::text
    from public.vw_carga_horaria_turma
  union all
  select 'vw_conformidade_tetos', row(turma_id, categoria, cumprido, previsto, limite_declarado, ch_curricular,
         percentual_norma)::text
    from public.vw_conformidade_tetos
  union all
  select 'vw_disciplinas_execucao', row(disciplina_id, curso_id, cod_disciplina, carga_horaria_tempos, turma_id,
         previsao_inicio_efetiva, previsao_termino_efetiva, origem_periodo, data_real_inicio, data_real_termino,
         ta_aula_executados, ta_avaliacao_executados, ta_executados, ta_saldo, ta_fora_do_dsa, nome_no_dsa)::text
    from public.vw_disciplinas_execucao
  union all
  select 'vw_unidades_ensino_execucao', row(unidade_ensino_id, disciplina_id, curso_id, numero_ue, ch_prevista_tempos,
         turma_id, lancamentos, ta_executados, ta_saldo, data_real_inicio, data_real_termino)::text
    from public.vw_unidades_ensino_execucao
  union all
  select 'vw_instrutor_carga_prevista', row(atribuicao_id, instrutor_id, turma_disciplina_id, turma_id, disciplina_id,
         curso_id, ano, previsao_inicio, previsao_termino, modo, instrutores_designados, tempos_previstos, semanas,
         media_semanal)::text
    from public.vw_instrutor_carga_prevista
  union all
  select 'vw_instrutor_carga_anual', row(v.*)::text from public.vw_instrutor_carga_anual v
  union all
  select 'vw_chd_por_fato', row(v.*)::text from public.vw_chd_por_fato v
  union all
  select 'vw_ocupacao_ta', row(v.*)::text from public.vw_ocupacao_ta v
  union all
  select 'vw_dias_parados_turma', row(v.*)::text from public.vw_dias_parados_turma v
  union all
  select 'vw_avaliacoes_situacao', row(id, turma_id, disciplina_id, curso_id, avaliacao_curriculo_id, situacao,
         cod_disciplina, nome_disciplina)::text
    from public.vw_avaliacoes_situacao
  union all
  select 'vw_instrutor_disciplina_rotulada', row(vinculo_id, instrutor_id, disciplina_id, cod_disciplina,
         carga_horaria_tempos, curso_id, modo_atribuicao_efetivo, status)::text
    from public.vw_instrutor_disciplina_rotulada
  union all
  select 'chd_da_turma_ate(2026-10-20)', row(f.*)::text from public.chd_da_turma_ate(date '2026-10-20') f
  union all
  select 'execucao_por_disciplina_ate(2026-10-20)', row(t.id, f.*)::text
    from public.turmas t cross join lateral public.execucao_por_disciplina_ate(date '2026-10-20', t.id) f
  union all
  select 'turma_disciplina', row(id, turma_id, disciplina_id, previsao_inicio, previsao_termino, origem_periodo,
         status)::text
    from public.turma_disciplina
  union all
  select 'turma_disciplina_instrutor', row(id, turma_disciplina_id, instrutor_id, ch_prevista_tempos, papel,
         status)::text
    from public.turma_disciplina_instrutor
  union all
  select 'turma_disciplina_unidade', row(id, turma_disciplina_id, disciplina_id, unidade_ensino_id, instrutor_id,
         status)::text
    from public.turma_disciplina_unidade
  union all
  select 'disciplinas', row(id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos, semanas,
         ch_semanal, previsao_inicio, previsao_termino, modo_atribuicao_padrao, status, sem_unidades_ensino,
         nome_no_dsa)::text
    from public.disciplinas
  union all
  select 'unidades_ensino', row(id, codigo, disciplina_id, curso_id, numero_ue, topico, ch_prevista_tempos,
         status)::text
    from public.unidades_ensino
  union all
  select 'avaliacoes_curriculo', row(id, codigo, disciplina_id, curso_id, ordem, instrumento_id, numero,
         unidade_ensino_id, ta_aplicacao, ta_vista, status)::text
    from public.avaliacoes_curriculo
  union all
  select 'avaliacoes_curriculo_turma', row(id, avaliacao_curriculo_id, turma_id, ta_aplicacao, ta_vista, origem,
         status)::text
    from public.avaliacoes_curriculo_turma
  union all
  select 'limites_curriculo', row(id, curso_id, categoria, tempos, status)::text from public.limites_curriculo
  union all
  select 'instrutor_disciplina', row(id, codigo, instrutor_id, disciplina_id, modo_atribuicao, status)::text
    from public.instrutor_disciplina
  union all
  select 'turmas', row(id, codigo, curso_id, ano_letivo, data_inicio, data_termino, status, regime_de_horario_id)::text
    from public.turmas
  union all
  select 'cursos', row(id, codigo, duracao_semanas, duracao_dias, status)::text from public.cursos
)
select objeto || '|' || count(*) || '|' || md5(string_agg(linha, E'\n' order by linha))
  from medidas
 group by objeto
 order by objeto;
