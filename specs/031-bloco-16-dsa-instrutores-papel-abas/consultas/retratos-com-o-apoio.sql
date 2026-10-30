select tipo, count(*) eventos, count(*) filter (where retrato::text like '%alunos específicos%') com_apoio,
 count(*) filter (where retrato::text like '%ORIGINAL%') x
from dsa_eventos_da_semana where tipo in ('publicado','alteracao_publicada') group by 1;
