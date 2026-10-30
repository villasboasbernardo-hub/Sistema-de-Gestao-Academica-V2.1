select coalesce(a.tipo_avaliacao,'(nulo)') tipo, coalesce(ins.valor, '(nulo)') instrumento_coluna, coalesce(ic.valor,'(nulo)') instrumento_do_item, count(*) n
from avaliacoes a left join config_listas ins on ins.id=a.instrumento_id
left join avaliacoes_curriculo c on c.id=a.avaliacao_curriculo_id left join config_listas ic on ic.id=c.instrumento_id
where a.status::text not in ('cancelada','substituida_pela_planilha')
group by 1,2,3 order by 1,2,3;
