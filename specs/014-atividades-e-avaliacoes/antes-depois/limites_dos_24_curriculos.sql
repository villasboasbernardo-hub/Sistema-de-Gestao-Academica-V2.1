-- @ Limites por curso e categoria
select c.codigo as curso, l.categoria, l.tempos, l.fonte_arquivo, l.fonte_pagina
  from limites_curriculo l join cursos c on c.id = l.curso_id where l.status = 'ativo' order by 1, 2
-- @ Total de limites ativos
select count(*) as limites_ativos from limites_curriculo where status = 'ativo'
-- @ Eventos da D-1 em migracao_log
select count(*) as eventos from migracao_log where codigo like 'MLOG-014-D1-%'
