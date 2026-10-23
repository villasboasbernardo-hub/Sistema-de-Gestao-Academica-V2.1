-- Spec 024 (Bloco 9, item 2) — os insumos do andamento das turmas EAD e semipresenciais, em JSON, para
-- `scripts/provas/medir_bloco_9/antes-depois.test.ts`. Roda no banco LOCAL com a cópia do remoto e as migrations do Bloco 9:
--   docker exec -i supabase_db_ciaara-11-v2-1 psql -U postgres -At < scripts/provas/medir_bloco_9.sql > dados.json
\set hoje '2026-10-23'
select json_build_object(
  'hoje', :'hoje',
  'feriados', (select coalesce(json_agg(f.data order by f.data), '[]'::json)
                 from public.feriados f
                where f.impacto = 'dia_inteiro' and f.status = 'ativo' and f.data >= date :'hoje'
                  and not exists (select 1 from public.feriado_turma ft where ft.feriado_id = f.id and ft.status = 'ativo')),
  'turmas', (select coalesce(json_agg(x order by x.modalidade, x.codigo), '[]'::json) from (
     select t.codigo, t.status::text as status, t.modalidade::text as modalidade, t.data_termino,
            t.inicio_etapa_presencial, t.termino_etapa_presencial,
            c.chr_curricular as prevista,
            coalesce(e.chd_executada, 0) as executada,
            coalesce(p.disciplinas_presenciais, 0) as disciplinas_presenciais,
            coalesce(p.ch_presencial, 0) as ch_presencial,
            coalesce(n.chd_executada, 0) as executada_na_etapa,
            r.regime_padrao_tempos, r.limite_diario_ead_horas, rh.regime_tempos
       from public.turmas t
       join public.vw_carga_horaria_turma c on c.turma_id = t.id
       left join public.chd_da_turma_ate(date :'hoje') e on e.turma_id = t.id
       left join public.chd_da_turma_na_etapa_ate(date :'hoje') n on n.turma_id = t.id
       left join public.vw_carga_presencial_turma p on p.turma_id = t.id
       left join public.vw_cursos_regime_vigente r on r.curso_id = t.curso_id
       left join public.regimes_de_horario rh on rh.id = t.regime_de_horario_id
      where t.modalidade in ('ead', 'semipresencial')
  ) x)
);
