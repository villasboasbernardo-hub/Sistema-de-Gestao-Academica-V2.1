-- =================================================================================
-- A carga horaria prevista por instrutor (RN-INST-04, FR-014 da spec 006, T011 respondida)
--
-- O QUE  : (1) cria `vw_instrutor_carga_prevista`, uma linha por atribuicao ativa, com o ano, os
--          tempos que cabem ao instrutor e a media semanal da janela prevista; (2) recria
--          `vw_instrutor_carga_anual` com `ta_previsto_ano` NO FIM, somando essas atribuicoes por ano.
--
-- DECISAO DE BERNARDO VILLAS BOAS, 15/09/2026 (T011):
--   (a) 1 tempo de aula ~ 1 hora nesta fatia;
--   (b) media semanal = tempos previstos da disciplina / semanas entre inicio e termino previstos;
--   (c) o ano da atribuicao e o da DATA DE INICIO PREVISTA da disciplina;
--   (d) limites da faixa inclusivos — isso vive no dominio (`lib/dominio/carga-horaria.ts`).
--
-- O QUE JA ESTAVA ESCRITO, e completa a formula sem nada inventado:
--   · RN-MAT-05 (documento 04): modo DIVIDIDO reparte a carga entre os designados; modo SIMULTANEO
--     da a carga integral a cada um;
--   · comentario de `turma_disciplina_instrutor.ch_prevista_tempos`: preenchido vale; NULL = rateio
--     nao declarado, "o consumidor divide igualmente";
--   · comentario de `instrutor_disciplina.modo_atribuicao`: `herdar` resolve no
--     `modo_atribuicao_padrao` da disciplina;
--   · `disciplinas.semanas` = floor((termino - inicio) / 7) + 1, coluna GERADA — a mesma conta que a
--     `disciplinas.ch_semanal` ja faz ("media informativa, NAO a distribuicao semanal").
--
-- ⚠️ A MEDIA SEMANAL DO INSTRUTOR NAO ENTRA. A decisao (b) define a media de UMA disciplina; como
--    compor a de um instrutor com varias disciplinas no ano — somar as medias, ou somar as de cada
--    semana e olhar a pior — e pendencia registrada no contrato. `ta_previsto_semanal` espera.
--
-- ⚠️ ATRIBUICAO ATIVA E `tdi.status` E `td.status` ATIVOS. Uma disciplina tirada da turma deixa de
--    prever carga, mesmo que a linha de designacao continue la.
--
-- ⚠️ ATRIBUICAO SEM DATA DE INICIO NAO TEM ANO. Ela aparece aqui com `ano` nulo e nao entra em ano
--    nenhum de `vw_instrutor_carga_anual`: nao e zero escondido, e ausencia visivel.
--
-- ⚠️ VIEW, NUNCA COLUNA GRAVADA (FR-015). E `security_invoker`: quem le passa pela RLS das tabelas.
--
-- ⚠️ `create or replace view` SO ACEITA COLUNA NOVA NO FIM. As colunas de `vw_instrutor_carga_anual`
--    sao as da migration `20260829235731`, na mesma ordem e com as mesmas expressoes; o que muda e o
--    FROM, que passa a ter os anos de fato E os de previsao — antes, instrutor com carga prevista num
--    ano sem aula lancada nao teria linha naquele ano.
-- =================================================================================

create view public.vw_instrutor_carga_prevista
with (security_invoker = true) as
with atribuicoes as (
  select
    tdi.id                    as atribuicao_id,
    tdi.instrutor_id,
    tdi.turma_disciplina_id,
    td.turma_id,
    d.id                      as disciplina_id,
    d.curso_id,
    d.nome_disciplina,
    c.codigo                  as curso_codigo,
    t.codigo                  as turma_codigo,
    d.carga_horaria_tempos,
    d.previsao_inicio,
    d.previsao_termino,
    d.semanas,
    tdi.ch_prevista_tempos,
    coalesce(nullif(v.modo_atribuicao, 'herdar'), d.modo_atribuicao_padrao) as modo,
    count(*) over (partition by tdi.turma_disciplina_id) as instrutores_designados
  from public.turma_disciplina_instrutor tdi
  join public.turma_disciplina td on td.id = tdi.turma_disciplina_id
  join public.disciplinas d       on d.id = td.disciplina_id
  join public.cursos c            on c.id = d.curso_id
  join public.turmas t            on t.id = td.turma_id
  left join public.instrutor_disciplina v
         on v.instrutor_id = tdi.instrutor_id
        and v.disciplina_id = d.id
        and v.status = 'ativo'
  where tdi.status = 'ativo'
    and td.status = 'ativo'
),
rateadas as (
  select
    a.*,
    case
      when a.ch_prevista_tempos is not null then a.ch_prevista_tempos::numeric
      when a.modo = 'simultaneo'           then a.carga_horaria_tempos::numeric
      else a.carga_horaria_tempos::numeric / a.instrutores_designados
    end as tempos_previstos
  from atribuicoes a
)
select
  r.atribuicao_id,
  r.instrutor_id,
  r.turma_disciplina_id,
  r.turma_id,
  r.disciplina_id,
  r.curso_id,
  r.nome_disciplina,
  r.curso_codigo,
  r.turma_codigo,
  extract(year from r.previsao_inicio)::smallint as ano,
  r.previsao_inicio,
  r.previsao_termino,
  r.modo,
  r.instrutores_designados,
  round(r.tempos_previstos, 2)                   as tempos_previstos,
  r.semanas,
  case when r.semanas is not null and r.semanas > 0
       then round(r.tempos_previstos / r.semanas, 2)
  end                                            as media_semanal
from rateadas r;

comment on view public.vw_instrutor_carga_prevista is
  'Carga prevista por atribuicao ativa (RN-INST-04, T011 de 15/09/2026): ano pela data de inicio '
  'prevista da disciplina; tempos do instrutor pelo RN-MAT-05 (dividido reparte, simultaneo da a '
  'integral; ch_prevista_tempos declarado prevalece, nulo divide igualmente); media semanal = '
  'tempos / disciplinas.semanas. NAO e a distribuicao semanal (RN-DIST-01).';

grant select on public.vw_instrutor_carga_prevista to authenticated;
revoke all on public.vw_instrutor_carga_prevista from anon;
revoke insert, update, delete, truncate on public.vw_instrutor_carga_prevista from authenticated;


create or replace view public.vw_instrutor_carga_anual
with (security_invoker = true) as
with fatos as (
  select r.instrutor_id, extract(year from r.data)::smallint as ano,
         sum(r.tempos_consumidos) as ta, 0 as ta_fiscal
    from public.registros_aula r
   where r.status = 'ativo' and r.instrutor_id is not null
   group by 1, 2
  union all
  select a.instrutor_responsavel_id, extract(year from a.data_avaliacao)::smallint,
         sum(coalesce(a.tempos_consumidos, 0) + coalesce(a.tempos_consumidos_vista, 0)), 0
    from public.avaliacoes a
   where a.status <> 'cancelada'
   group by 1, 2
  union all
  select a.fiscal_id, extract(year from a.data_avaliacao)::smallint,
         0, sum(coalesce(a.tempos_consumidos, 0))
    from public.avaliacoes a
   where a.status <> 'cancelada' and a.fiscal_id is not null
   group by 1, 2
),
consolidado as (
  select instrutor_id, ano, sum(ta) as ta_ministrado, sum(ta_fiscal) as ta_fiscalizado
    from fatos
   where instrutor_id is not null
   group by 1, 2
),
previstos as (
  select instrutor_id, ano, sum(tempos_previstos) as ta_previsto
    from public.vw_instrutor_carga_prevista
   where ano is not null
   group by 1, 2
),
anos as (
  select instrutor_id, ano from consolidado
  union
  select instrutor_id, ano from previstos
)
select
  i.id                            as instrutor_id,
  i.codigo                        as instrutor_codigo,
  i.posto_graduacao,
  coalesce(i.nome_guerra, i.nome_completo) as nome_exibicao,
  i.nome_completo,
  i.om,
  i.dep_divisao,
  i.regime_trabalho,
  i.status,
  app.fn_antiguidade_ordem(i.id)  as ordem_antiguidade,
  a.ano,
  coalesce(co.ta_ministrado, 0)   as ta_ministrado_ano,
  coalesce(co.ta_fiscalizado, 0)  as ta_fiscalizado_ano,
  app.fn_parametro_numerico('ch_docente.' || i.regime_trabalho::text || '.min', a.ano) as faixa_semanal_min,
  app.fn_parametro_numerico('ch_docente.' || i.regime_trabalho::text || '.max', a.ano) as faixa_semanal_max,
  case when i.data_assuncao_setor is not null
       then floor((current_date - i.data_assuncao_setor)::numeric / 365.25)::integer
  end                             as tempo_setor_anos,
  (select count(*) from public.instrutor_disciplina v
    where v.instrutor_id = i.id and v.status = 'ativo') as qtd_disciplinas_habilitadas,
  coalesce(p.ta_previsto, 0)      as ta_previsto_ano
from public.instrutores i
left join anos a         on a.instrutor_id = i.id
left join consolidado co on co.instrutor_id = i.id and co.ano = a.ano
left join previstos p    on p.instrutor_id = i.id and p.ano = a.ano;

comment on column public.vw_instrutor_carga_anual.ta_previsto_ano is
  'Tempos previstos das atribuicoes ativas cujo inicio previsto cai no ano (T011, 15/09/2026). '
  'Soma de vw_instrutor_carga_prevista.tempos_previstos. Nunca digitada (FR-015).';

-- ⚠️ TODA VIEW RECRIADA REPETE O REVOKE. Esta tinha INSERT e UPDATE para `authenticated` desde o
--    Epico 1 (um dos dez casos do achado R-8); agora perde os dois, como a I-8 da T012 exige.
revoke insert, update, delete, truncate on public.vw_instrutor_carga_anual from authenticated;

-- =================================================================================
-- PLANO DE REVERSAO
--
--   1. `drop view public.vw_instrutor_carga_anual;` e recria-la com a definicao de
--      `20260829235731_derivados_e_funcoes_de_dominio.sql` (create or replace nao remove coluna);
--   2. `drop view public.vw_instrutor_carga_prevista;`.
--
-- ⚠️ A reversao tira a carga prevista da ficha e devolve INSERT/UPDATE da view a `authenticated`.
-- =================================================================================
