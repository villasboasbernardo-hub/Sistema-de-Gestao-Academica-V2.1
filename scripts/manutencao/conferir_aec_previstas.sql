-- Bloco 18 (spec 033) — conferência SÓ DE LEITURA da carga das AEC previstas (`carga_aec_previstas.sql`): por curso, o
-- que entrou no currículo 1, e a trilha da RC-6 que o gatilho gravou.
select c.codigo as curso, p.ordem, p.codigo, p.nome, l.valor as tipo, p.ta_previstos, d.cod_disciplina as disciplina,
       p.obrigatoria, p.fonte_pagina,
       exists (select 1 from public.correcoes_de_curriculo k
                where k.tabela = 'aec_previstas_curriculo' and k.registro_id = p.id and k.acao = 'incluir') as com_trilha
  from public.aec_previstas_curriculo p
  join public.cursos c on c.id = p.curso_id
  join public.curriculos cu on cu.id = p.curriculo_id and cu.versao = 1
  join public.config_listas l on l.id = p.tipo_atividade_id
  left join public.disciplinas d on d.id = p.disciplina_id
 where p.status = 'ativo'
 order by c.codigo, p.ordem;
