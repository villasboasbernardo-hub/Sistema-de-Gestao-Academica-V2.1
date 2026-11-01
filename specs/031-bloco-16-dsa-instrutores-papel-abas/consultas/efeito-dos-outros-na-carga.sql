select i.codigo, t.ano_letivo ano, count(*) aulas, sum(r.tempos_consumidos) ta_a_mais,
  bool_or(r.instrutor_id = i.id) mesmo_que_titular
from registros_aula r join turmas t on t.id=r.turma_id
cross join lateral unnest(r.outros_instrutores) c(cod)
left join instrutores i on i.codigo = c.cod
where r.status='ativo' and r.salvo and cardinality(r.outros_instrutores)>0
group by 1,2 order by 1;
