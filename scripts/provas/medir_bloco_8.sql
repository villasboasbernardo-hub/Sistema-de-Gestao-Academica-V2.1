-- Spec 023 (Bloco 8), item 3 — os insumos do saldo das turmas ATIVAS cujo intervalo contém 28/10/2026, em JSON, para
-- `scripts/provas/medir_bloco_8/antes-depois.test.ts`. Roda no banco LOCAL com a cópia do remoto restaurada:
--   docker exec -i supabase_db_ciaara-11-v2-1 psql -U postgres -At < scripts/provas/medir_bloco_8.sql > dados.json
-- O "hoje" é fixo (o da medição), para a medida ser reproduzível sobre a mesma cópia.
\set hoje '2026-10-22'
select json_build_object(
  'hoje', :'hoje',
  'feriados', (select coalesce(json_agg(f.data order by f.data), '[]'::json)
                 from public.feriados f
                where f.impacto = 'dia_inteiro' and f.status = 'ativo' and f.data >= date :'hoje'),
  'turmas', (select coalesce(json_agg(x order by x.codigo), '[]'::json) from (
     select t.codigo, t.status::text as status, t.modalidade::text as modalidade, t.data_termino,
            c.chr_curricular as prevista,
            coalesce(e.chd_executada, 0) as executada,
            r.regime_padrao_tempos, r.limite_diario_ead_horas, rh.regime_tempos
       from public.turmas t
       join public.vw_carga_horaria_turma c on c.turma_id = t.id
       left join public.chd_da_turma_ate(date :'hoje') e on e.turma_id = t.id
       left join public.vw_cursos_regime_vigente r on r.curso_id = t.curso_id
       left join public.regimes_de_horario rh on rh.id = t.regime_de_horario_id
      where t.status = 'ativa' and t.data_inicio <= date '2026-10-28' and t.data_termino >= date '2026-10-28'
  ) x)
);
