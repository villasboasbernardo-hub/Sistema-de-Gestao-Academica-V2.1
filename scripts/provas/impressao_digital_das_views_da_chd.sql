-- Impressão digital do CONTEÚDO das três somas da CHD, só nas colunas que existiam antes do Bloco 2 (spec 017,
-- SC-010). Rodar ANTES e DEPOIS das migrations que acrescentam, sobre o MESMO dado: os três md5 têm de ser iguais.
-- Uso (local): docker exec -i supabase_db_ciaara-11-v2-1 psql -U postgres -d postgres -At < este arquivo
-- Uso (remoto, só leitura): supabase db query --linked -f este arquivo
select 'vw_chd_por_fato' as view, count(*) as linhas,
       md5(coalesce(string_agg(concat_ws('|', turma_id, disciplina_id, data, tempos, origem), E'\n'
           order by turma_id, disciplina_id, data, tempos, origem), '')) as md5
  from public.vw_chd_por_fato
union all
select 'vw_carga_horaria_turma', count(*),
       md5(coalesce(string_agg(concat_ws('|', turma_id, turma_codigo, curso_id, curso_codigo, nome_curso, ano_letivo,
           status_turma, chr_curricular, ta_aula, ta_extraclasse, ta_avaliacao, ta_vista_prova, chd_executada, ta_aec,
           ta_tad, ta_tr, ta_estudo_individual, cht_executada, ta_apoio_individualizado, ta_dias_parados), E'\n'
           order by turma_id), ''))
  from public.vw_carga_horaria_turma
union all
select 'vw_disciplinas_execucao', count(*),
       md5(coalesce(string_agg(concat_ws('|', disciplina_id, disciplina_codigo, curso_id, cod_disciplina,
           nome_disciplina, carga_horaria_tempos, turma_id, turma_codigo, ano_letivo, previsao_inicio_efetiva,
           previsao_termino_efetiva, origem_periodo, data_real_inicio, data_real_termino, ta_aula_executados,
           ta_avaliacao_executados, ta_executados, ta_saldo), E'\n' order by disciplina_id, turma_id), ''))
  from public.vw_disciplinas_execucao;
