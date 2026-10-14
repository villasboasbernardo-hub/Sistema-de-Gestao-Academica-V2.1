-- @ Tipos de atividade (categoria, uso, ativo)
select valor, coalesce(metadados->>'categoria','—') as categoria, coalesce(metadados->>'uso','—') as uso, ativo
  from config_listas where lista = 'tipos_atividade' order by valor
-- @ Tipos de parada
select valor, rotulo_exibicao, metadados->>'pode_global' as pode_global, metadados->>'aceita_tr' as aceita_tr
  from config_listas where lista = 'tipos_parada' order by ordem
-- @ Por turma ativa: AEC, TAD, TR, EI e Apoio (vw_carga_horaria_turma)
select turma_codigo, ta_aec, ta_tad, ta_tr, ta_estudo_individual, ta_apoio_individualizado
  from vw_carga_horaria_turma where status_turma = 'ativa' order by 1
-- @ Atividades ativas com subtipo Monitoria (mudam na rodada do PR 3, não aqui)
select count(*) as monitorias_ativas from atividades_nao_letivas where status = 'ativo' and subtipo = 'Monitoria'
-- @ Parâmetro vence em breve
select chave, valor, natureza from config_parametros where chave = 'avaliacao.vence_em_breve_dias' and status = 'ativo'
