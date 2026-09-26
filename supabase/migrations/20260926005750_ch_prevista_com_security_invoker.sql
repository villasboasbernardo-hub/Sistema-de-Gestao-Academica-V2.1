-- =================================================================================
-- M7 — `vw_instrutor_carga_prevista` volta a ser `security_invoker`
--
-- O QUE  : recria a view com `with (security_invoker = true)`, a opcao que ela tinha desde
--          15/09/2026 e que a PARTE F da migration `20260925135054_rateio_por_instrutor.sql`
--          desta MESMA fatia derrubou sem querer.
--
-- POR QUE: `create or replace view` **NAO preserva as opcoes da view** — ele preserva o objeto,
--          o dono e os privilegios, mas as `reloptions` sao as do comando. A PARTE F escreveu
--          `create or replace view public.vw_instrutor_carga_prevista as`, sem o `with (...)`,
--          e a view passou a rodar com os direitos do DONO.
--
-- ⚠️ E O DONO E `postgres`, QUE TEM `rolbypassrls = true`. Medido no banco local em 25/09/2026,
--    depois das seis migrations desta fatia:
--
--      relname                      | reloptions
--      vw_instrutor_carga_prevista  | (nenhuma)          <- era {security_invoker=true}
--      vw_instrutor_dados_pessoais  | (nenhuma)          <- INTENCIONAL, ver abaixo
--      as outras 11 views de public  | {security_invoker=true}
--
--    Consequencia: **a RLS das tabelas de baixo deixou de se aplicar a quem le a view**. Um
--    perfil com alcance restrito a um curso passava a ver a CH prevista de TODOS os instrutores,
--    de todas as turmas — sem erro nenhum, que e o gotcha 4 ao contrario: em vez de negar em
--    silencio, ela CONCEDE em silencio. E `vw_instrutor_carga_anual` le DESTA view, entao o
--    vazamento ia junto para a ficha do instrutor.
--
-- ⚠️ A EXCECAO NOMINAL CONTINUA VALENDO, e nao e descuido: `vw_instrutor_dados_pessoais` **tem
--    de ser** de dono, porque e assim que o recorte de PII da fatia (c) funciona — RLS nao
--    recorta COLUNA, entao a tabela leva `revoke`, a view leva `grant` e o porteiro mora no
--    `where` dela (`app.pode('instrutores','ler')` e os tres perfis da decisao PII-1). Trocar
--    essa view para invoker quebraria a leitura autorizada.
--
-- COMO FOI ACHADO: pela T010 — a impressao digital da estrutura antes das seis migrations trazia
--          `WITH (security_invoker='true')` na view, e a de depois nao. Nenhuma assercao da suite
--          media opcao de view, e por isso ninguem viu. Esta migration vem com a assercao que
--          faltava, em `supabase/tests/010_estrutura.sql`.
--
-- REVERSAO (executada numa base descartavel antes do PR):
--    create or replace view public.vw_instrutor_carga_prevista as <o mesmo corpo, sem o `with`>;
--    — isto e, volta ao estado com o defeito. So faz sentido para provar a reversao.
-- =================================================================================

create or replace view public.vw_instrutor_carga_prevista
with (security_invoker = true) as
with atribuicoes as (
  select tdi.id                as atribuicao_id,
         tdi.instrutor_id,
         tdi.turma_disciplina_id,
         td.turma_id,
         d.id                  as disciplina_id,
         d.curso_id,
         d.nome_disciplina,
         c.codigo              as curso_codigo,
         t.codigo              as turma_codigo,
         d.carga_horaria_tempos,
         d.previsao_inicio,
         d.previsao_termino,
         d.semanas,
         tdi.ch_prevista_tempos,
         coalesce(nullif(v.modo_atribuicao, 'herdar'::public.modo_atribuicao),
                  d.modo_atribuicao_padrao) as modo,
         count(*) over (partition by tdi.turma_disciplina_id) as instrutores_designados,
         row_number() over (partition by tdi.turma_disciplina_id
                            order by app.fn_antiguidade_ordem(tdi.instrutor_id),
                                     tdi.instrutor_id)        as ordem_antiguidade,
         (select coalesce(sum(u.ch_prevista_tempos), 0)
            from public.turma_disciplina_unidade tdu
            join public.unidades_ensino u on u.id = tdu.unidade_ensino_id
           where tdu.turma_disciplina_id = tdi.turma_disciplina_id
             and tdu.instrutor_id = tdi.instrutor_id
             and tdu.status = 'ativo')                        as ch_das_unidades,
         exists (select 1 from public.turma_disciplina_unidade tdu
                  where tdu.turma_disciplina_id = tdi.turma_disciplina_id
                    and tdu.status = 'ativo')                 as rateio_por_ue
    from public.turma_disciplina_instrutor tdi
    join public.turma_disciplina td on td.id = tdi.turma_disciplina_id
    join public.disciplinas d on d.id = td.disciplina_id
    join public.cursos c on c.id = d.curso_id
    join public.turmas t on t.id = td.turma_id
    left join public.instrutor_disciplina v
      on v.instrutor_id = tdi.instrutor_id
     and v.disciplina_id = d.id
     and v.status = 'ativo'::public.status_registro
   where tdi.status = 'ativo'::public.status_registro
     and td.status  = 'ativo'::public.status_registro
), rateadas as (
  select a.*,
         case
           -- Caso 5 — por UE: a soma da CH das UEs do instrutor.
           when a.rateio_por_ue then a.ch_das_unidades::numeric
           -- Caso 4 — por TA: o que foi digitado.
           when a.ch_prevista_tempos is not null then a.ch_prevista_tempos::numeric
           -- Caso 2 — simultaneo: a CH integral para cada um.
           when a.modo = 'simultaneo'::public.modo_atribuicao then a.carga_horaria_tempos::numeric
           -- Casos 1 e 3 — divisao INTEIRA, resto aos mais antigos (Q-03, A-1).
           else (a.carga_horaria_tempos / a.instrutores_designados)
                + case when a.ordem_antiguidade
                            <= (a.carga_horaria_tempos % a.instrutores_designados)
                       then 1 else 0 end
         end as tempos_previstos
    from atribuicoes a
)
select atribuicao_id,
       instrutor_id,
       turma_disciplina_id,
       turma_id,
       disciplina_id,
       curso_id,
       nome_disciplina,
       curso_codigo,
       turma_codigo,
       extract(year from previsao_inicio)::smallint as ano,
       previsao_inicio,
       previsao_termino,
       modo,
       instrutores_designados,
       tempos_previstos,
       semanas,
       case when semanas is not null and semanas > 0
            then round(tempos_previstos / semanas::numeric, 2)
            else null::numeric end as media_semanal
  from rateadas r;

comment on view public.vw_instrutor_carga_prevista is
  'CH PREVISTA por instrutor, nos cinco casos do rateio (A-1, Bernardo Villas Boas, '
  '25/09/2026; FR-041.7). A divisao e inteira e o resto vai AOS MAIS ANTIGOS '
  '(`app.fn_antiguidade_ordem`, RN-ANT-02): 10 TA entre 3 dao 4 + 3 + 3, e nao 3.33 tres '
  'vezes somando 9.99, como a versao anterior a 25/09/2026 fazia. A funcao pura '
  '`lib/dominio/rateio-de-carga.ts` e a referencia, e esta view e testada contra ela. '
  '⚠️ `security_invoker` REPOSTO em 26/09/2026 (M7): a PARTE F de '
  '`20260925135054_rateio_por_instrutor.sql` recriou a view sem o `with (...)`, e '
  '`create or replace view` NAO preserva as opcoes — a view passou a rodar como o dono, que '
  'tem `rolbypassrls`, e a RLS das tabelas de baixo deixou de valer para quem le.';

-- ⚠️ Repetido de proposito: view recriada nasce com DELETE e TRUNCATE para `authenticated`.
revoke insert, update, delete, truncate on public.vw_instrutor_carga_prevista from authenticated, anon;
revoke all    on public.vw_instrutor_carga_prevista from anon;
grant  select on public.vw_instrutor_carga_prevista to authenticated;
