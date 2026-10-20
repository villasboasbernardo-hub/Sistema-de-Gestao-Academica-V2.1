-- Impressão digital do CONTEÚDO de `vw_dias_parados_turma` e das views que leem dela, linha inteira (spec 018, SC-009).
-- A migration `20261020025815` recria a view preferindo o regime nomeado da turma, sem mudar coluna nenhuma: rodar
-- ANTES e DEPOIS dela, sobre o MESMO dado (nenhuma turma com regime), e os md5 têm de ser iguais.
-- Uso (local): docker exec -i supabase_db_ciaara-11-v2-1 psql -U postgres -d postgres -At -F'|' < este arquivo
-- Uso (remoto, só leitura): supabase db query --linked -f este arquivo
select 'vw_dias_parados_turma' as view, count(*) as linhas,
       md5(coalesce(string_agg(v::text, E'\n' order by v::text), '')) as md5
  from public.vw_dias_parados_turma v
union all
select 'vw_carga_horaria_turma', count(*), md5(coalesce(string_agg(v::text, E'\n' order by v::text), ''))
  from public.vw_carga_horaria_turma v
union all
select 'vw_conformidade_tetos', count(*), md5(coalesce(string_agg(v::text, E'\n' order by v::text), ''))
  from public.vw_conformidade_tetos v;
