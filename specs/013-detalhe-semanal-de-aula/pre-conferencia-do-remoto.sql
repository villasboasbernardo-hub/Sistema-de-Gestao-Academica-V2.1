select 'A registros_aula total' as c, count(*)::text as v from public.registros_aula
union all select 'B VIOLARIAM a catraca nova', count(*)::text from public.registros_aula
  where unidade_ensino_id is null and (origem_migracao_v1 is null or editado_em is not null)
union all select 'C atividades_nao_letivas total', count(*)::text from public.atividades_nao_letivas
union all select 'D VIOLARIAM o CHECK do Estudo Individual', count(*)::text from public.atividades_nao_letivas
  where categoria_normativa = 'Estudo_Individual' and escopo <> 'turma'
union all select 'E Estudo Individual no total', count(*)::text from public.atividades_nao_letivas
  where categoria_normativa = 'Estudo_Individual'
union all select 'F atividades de escopo global hoje', count(*)::text from public.atividades_nao_letivas
  where turma_id is null
union all select 'G registros_aula com editado_em', count(*)::text from public.registros_aula
  where editado_em is not null
union all select 'H metodologias / com sigla', count(*)::text || ' / ' || count(*) filter (where metadados ? 'sigla')::text
  from public.config_listas where lista = 'metodologias'
union all select 'I tipos_atividade / com categoria', count(*)::text || ' / ' || count(*) filter (where metadados ? 'categoria')::text
  from public.config_listas where lista = 'tipos_atividade'
union all select 'J config_parametros dsa.*', count(*)::text from public.config_parametros where chave like 'dsa.%'
union all select 'K disciplina_id ja existe?', count(*)::text from information_schema.columns
  where table_schema='public' and table_name='registros_aula' and column_name='disciplina_id'
union all select 'L cursos por competencias', count(*)::text from public.cursos where curriculo_modelo = 'competencias'
union all select 'M disciplinas sem_unidades_ensino', count(*)::text from public.disciplinas where sem_unidades_ensino
union all select 'N views com security_invoker', string_agg(c.relname || '=' || (coalesce(c.reloptions,'{}')::text), ' ')
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname in ('vw_ocupacao_ta','vw_disciplinas_execucao')
order by 1;
