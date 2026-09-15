-- =================================================================================
-- Os filtros de vinculo no caminho de leitura da listagem (FR-025 emendado em 15/09/2026)
--
-- O QUE  : acrescenta ao FIM de `vw_instrutores` quatro colunas derivadas — `habilitado`,
--          `selecionado`, `cursos_vinculados` e `classificacoes_vinculadas` — para que os filtros de
--          habilitado, selecionado, curso e classificacao do curso entrem no MESMO `where` da consulta
--          da listagem, como os demais.
--
-- DECISAO DE BERNARDO VILLAS BOAS, 15/09/2026: a barra de filtros ganha habilitado (sim/nao),
--   selecionado (sim/nao), curso e classificacao do curso. Regras lidas na spec 015 da v2.0:
--   · habilitado = vinculo ATIVO em `instrutor_disciplina`;
--   · selecionado = atribuicao ATIVA — `turma_disciplina_instrutor` e `turma_disciplina` ativas, a
--     mesma definicao de `vw_instrutor_carga_prevista`;
--   · habilitado NAO e selecionado: sao conjuntos independentes (a v2.0 mediu dez selecionados sem
--     habilitacao);
--   · curso casa com instrutor que tem vinculo OU atribuicao a alguma disciplina daquele curso
--     (spec 015, FR-005) — e a classificacao, pelos cursos dela.
--
-- ⚠️ POR QUE NO BANCO, E NAO NA TELA. A primeira implementacao calculava um recorte de ids na pagina e
--    o mandava como `in (...)` e `not in (...)`. Com a base real, "nao habilitado" vira uma lista de
--    175 identificadores na URL da interface de dados, e a consulta falhou — medido em 15/09/2026 pela
--    ponta a ponta. Na base vazia do CI isso passaria em silencio. Com as colunas aqui, o filtro e um
--    predicado curto, e a regra tem um endereco so.
--
-- ⚠️ `security_invoker`: as subconsultas passam pela RLS de quem le. Quem nao le vinculo ve `false` e
--    arranjo vazio — "nao ha" pelo alcance da sessao, que e a mesma resposta do resto da tela.
--
-- ⚠️ `create or replace view` SO ACEITA COLUNA NOVA NO FIM: a lista abaixo e a da migration
--    `20260915053511`, na mesma ordem, com as quatro novas por ultimo.
-- =================================================================================

create or replace view public.vw_instrutores with (security_invoker = true) as
with atribuicoes_ativas as (
  select tdi.instrutor_id, td.disciplina_id
    from public.turma_disciplina_instrutor tdi
    join public.turma_disciplina td on td.id = tdi.turma_disciplina_id
   where tdi.status = 'ativo' and td.status = 'ativo'
),
habilitacoes_ativas as (
  select v.instrutor_id, v.disciplina_id
    from public.instrutor_disciplina v
   where v.status = 'ativo'
),
cursos_por_instrutor as (
  select x.instrutor_id,
         array_agg(distinct c.codigo order by c.codigo)                          as cursos,
         array_agg(distinct c.classificacao::text order by c.classificacao::text) as classificacoes
    from (select * from habilitacoes_ativas union select * from atribuicoes_ativas) x
    join public.disciplinas d on d.id = x.disciplina_id
    join public.cursos c      on c.id = d.curso_id
   group by x.instrutor_id
)
select
  i.id,
  i.codigo,
  i.posto_graduacao,
  i.esp_hab_obs,
  i.nome_completo,
  i.categoria,
  i.om,
  i.nome_guerra,
  i.nome_normalizado,
  i.nip,
  i.data_nascimento,
  i.dep_divisao,
  i.data_assuncao_setor,
  i.email,
  i.regime_trabalho,
  i.nivel_escolaridade,
  i.formacao_principal_secundaria,
  i.capacitacao_didatica,
  i.data_inicio_docencia_mb,
  i.data_inicio_docencia_ciaara,
  i.ultima_avaliacao_desempenho,
  i.data_avaliacao_desempenho,
  i.preferencia,
  i.disciplinas_ministradas_legado_v1,
  i.antiguidade_declarada,
  i.antiguidade_declarada_num,
  i.status,
  i.origem_migracao_v1,
  i.criado_por,
  i.criado_em,
  i.editado_por,
  i.editado_em,
  i.area_conhecimento,
  app.fn_antiguidade_ordem(i.id) as ordem_antiguidade,
  exists (select 1 from habilitacoes_ativas h where h.instrutor_id = i.id) as habilitado,
  exists (select 1 from atribuicoes_ativas a where a.instrutor_id = i.id)  as selecionado,
  coalesce(cpi.cursos, '{}'::text[])                                         as cursos_vinculados,
  coalesce(cpi.classificacoes, '{}'::text[])                                 as classificacoes_vinculadas
from public.instrutores i
left join cursos_por_instrutor cpi on cpi.instrutor_id = i.id;

comment on column public.vw_instrutores.habilitado is
  'Tem vinculo ATIVO em instrutor_disciplina (FR-025, 15/09/2026). Independente de selecionado.';
comment on column public.vw_instrutores.selecionado is
  'Tem atribuicao ATIVA (turma_disciplina_instrutor e turma_disciplina ativas). Independente de habilitado.';
comment on column public.vw_instrutores.cursos_vinculados is
  'Siglas (cursos.codigo) dos cursos com vinculo OU atribuicao ativa do instrutor (spec 015, FR-005).';
comment on column public.vw_instrutores.classificacoes_vinculadas is
  'Classificacoes (escopo_curso) desses cursos, para o filtro de classificacao do curso.';

revoke insert, update, delete, truncate on public.vw_instrutores from authenticated;

-- =================================================================================
-- PLANO DE REVERSAO
--
--   `drop view public.vw_instrutores` e recria-la com a definicao de
--   `20260915053511_ordem_de_antiguidade_na_leitura.sql`, com o `grant select` e os quatro `revoke`
--   de `20260908120000_recorte_dado_pessoal_instrutor.sql`. ⚠️ `vw_instrutor_carga_anual` nao depende
--   desta view; nenhuma outra view depende dela (conferir com `pg_depend` antes do drop).
--
-- ⚠️ A reversao tira da listagem os filtros de habilitado, selecionado, curso e classificacao.
-- =================================================================================
