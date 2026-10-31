select 'aula' t, count(*) filter (where cardinality(outros_instrutores)>0) com_outros, count(*) filter (where cardinality(outros_instrutores)>0 and status='ativo') ativos from registros_aula
union all select 'aval', count(*) filter (where cardinality(outros_instrutores)>0), count(*) filter (where cardinality(outros_instrutores)>0 and status not in ('cancelada','substituida_pela_planilha')) from avaliacoes
union all select 'ativ', count(*) filter (where cardinality(outros_instrutores)>0), count(*) filter (where cardinality(outros_instrutores)>0 and status='ativo') from atividades_nao_letivas;
