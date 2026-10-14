-- @ Reservas do PROENS (origem, por curso)
select r.codigo, coalesce(c.codigo, '(genérica)') as curso, r.ano, r.tipo_reserva, r.tempos_reservados
  from reservas_proens r left join cursos c on c.id = r.curso_id where r.status = 'ativo' order by r.codigo
-- @ Previsto do PROENS por turma (destino)
select t.codigo as turma, p.categoria, p.tempos_previstos, p.origem_migracao_v1
  from previstos_proens_turma p join turmas t on t.id = p.turma_id where p.status = 'ativo' order by 1, 2
-- @ Reserva genérica em config_parametros
select chave, valor, ano_vigencia, natureza from config_parametros where chave like 'proens.reserva_generica_%' and status = 'ativo' order by 1
-- @ Linhas na trilha do previsto
select count(*) as linhas_na_trilha from previstos_proens_alteracoes
-- @ Eventos da D-3 em migracao_log
select count(*) as eventos from migracao_log where codigo like 'MLOG-014-D3-%'
