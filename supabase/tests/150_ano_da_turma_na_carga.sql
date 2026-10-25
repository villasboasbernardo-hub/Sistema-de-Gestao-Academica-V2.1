-- =================================================================================
-- 150 — O ano da carga do instrutor e o ANO DA TURMA (Bloco 10, spec 025, RT-6; conferencia de 24/10/2026)
--
-- > "o ano de qualquer informacao ligada a turma e o ANO DA TURMA, nunca a data do registro ou a
-- > janela da atribuicao." — Bernardo Villas Boas, 24/10/2026
--
-- O QUE  : prova a migration `20261024213231` — `vw_instrutor_carga_prevista.ano` e o ano da
--          turma, e `vw_instrutor_carga_anual` soma a prevista E a ministrada pelo ano da turma.
--
-- ⚠️ O CASO QUE DISCRIMINA (DoD 8), o do defeito achado por Bernardo: o MESMO instrutor na MESMA
--    disciplina numa turma de 2046 e numa de 2047, com a janela das DUAS em 2046 (a previsao vem da
--    disciplina); e uma aula da turma de 2047 com DATA em 2046. Pela janela e pela data, 2046 somava
--    as duas turmas e 2047 ficava vazio; pelo ano da turma, cada ano tem so a sua.
-- =================================================================================
begin;
select plan(8);

insert into public.cursos (id, codigo, nome_curso, classificacao, modalidade, duracao_dias) values
  ('a1502000-0000-0000-0000-000000000001', 'T150-CUR', 'Curso T150', 'regular', 'presencial', 30);
insert into public.curso_regime_historico
  (curso_id, tipo_regime, regime_tempos, ta_duracao_min, intervalo_manha_min,
   intervalo_tarde_min, hora_inicio_manha, hora_inicio_tarde, vigente_de)
values
  ('a1502000-0000-0000-0000-000000000001', 'padrao', 8, 45, 10, 10, '07:30', '13:30', '2020-01-01');

insert into public.turmas (id, codigo, curso_id, turma, ano_letivo, status, modalidade, data_inicio, data_termino)
values
  ('a1505000-0000-0000-0000-000000000046', 'T150-CUR T1 2046', 'a1502000-0000-0000-0000-000000000001',
   'T1', 2046, 'planejada', 'presencial', '2046-03-02', '2046-06-30'),
  ('a1505000-0000-0000-0000-000000000047', 'T150-CUR T1 2047', 'a1502000-0000-0000-0000-000000000001',
   'T1', 2047, 'planejada', 'presencial', '2046-12-01', '2047-06-30');

-- A previsao da DISCIPLINA (do curriculo) esta em 2046: e ela que da a janela das duas turmas.
insert into public.disciplinas
  (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos, previsao_inicio, previsao_termino)
values
  ('a1503000-0000-0000-0000-000000000001', 'T150-DIS', 'a1502000-0000-0000-0000-000000000001', 'I',
   'Disciplina T150', 20, '2046-03-02', '2046-06-26');
insert into public.turma_disciplina (turma_id, disciplina_id)
select t.id, 'a1503000-0000-0000-0000-000000000001'
  from public.turmas t
 where t.codigo like 'T150-CUR %'
   and not exists (select 1 from public.turma_disciplina td
                    where td.turma_id = t.id and td.disciplina_id = 'a1503000-0000-0000-0000-000000000001');

insert into public.instrutores (id, codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om) values
  ('a1501000-0000-0000-0000-000000000001', 'T150-INS', 'CT', '-EF', 'Instrutor T150', 'Militar', 'CIAARA');
insert into public.turma_disciplina_instrutor (turma_disciplina_id, instrutor_id, codigo)
select td.id, 'a1501000-0000-0000-0000-000000000001', td.codigo || '#T150-INS'
  from public.turma_disciplina td where td.disciplina_id = 'a1503000-0000-0000-0000-000000000001';

insert into public.unidades_ensino (id, disciplina_id, curso_id, numero_ue, topico, ch_prevista_tempos) values
  ('a1507000-0000-0000-0000-000000000001', 'a1503000-0000-0000-0000-000000000001',
   'a1502000-0000-0000-0000-000000000001', 1, 'UE T150', 20);
-- Uma aula de cada turma; a da turma de 2047 tem DATA em 2046.
insert into public.registros_aula
  (codigo, data, turma_id, curso_id, unidade_ensino_id, instrutor_id, tempos_consumidos, ta_inicial, salvo)
values
  ('T150-REG-2046', '2046-03-10', 'a1505000-0000-0000-0000-000000000046', 'a1502000-0000-0000-0000-000000000001',
   'a1507000-0000-0000-0000-000000000001', 'a1501000-0000-0000-0000-000000000001', 3, 1, true),
  ('T150-REG-2047', '2046-12-10', 'a1505000-0000-0000-0000-000000000047', 'a1502000-0000-0000-0000-000000000001',
   'a1507000-0000-0000-0000-000000000001', 'a1501000-0000-0000-0000-000000000001', 5, 1, true);

-- ── a prevista ───────────────────────────────────────────────────────────────────
select is(
  (select ano::int from public.vw_instrutor_carga_prevista
    where turma_id = 'a1505000-0000-0000-0000-000000000047'
      and instrutor_id = 'a1501000-0000-0000-0000-000000000001'),
  2047,
  'DISCRIMINA · a atribuicao da turma de 2047 e de 2047, mesmo com a janela em 2046'
);
select is(
  (select previsao_inicio from public.vw_instrutor_carga_prevista
    where turma_id = 'a1505000-0000-0000-0000-000000000047'
      and instrutor_id = 'a1501000-0000-0000-0000-000000000001'),
  '2046-03-02'::date,
  'a janela continua a mesma: ela e o PERIODO da carga, nao o ano dela'
);

-- ── a anual: prevista e ministrada, cada ano com a sua turma ──────────────────────
select is(
  (select ta_previsto_ano::int from public.vw_instrutor_carga_anual
    where instrutor_id = 'a1501000-0000-0000-0000-000000000001' and ano = 2046),
  20,
  'DISCRIMINA · em 2046, so a prevista da turma de 2046 (a de 2047 nao entra)'
);
select is(
  (select ta_previsto_ano::int from public.vw_instrutor_carga_anual
    where instrutor_id = 'a1501000-0000-0000-0000-000000000001' and ano = 2047),
  20,
  'em 2047, so a prevista da turma de 2047'
);
select is(
  (select ta_ministrado_ano::int from public.vw_instrutor_carga_anual
    where instrutor_id = 'a1501000-0000-0000-0000-000000000001' and ano = 2046),
  3,
  'DISCRIMINA · em 2046, so a aula da turma de 2046 (a da de 2047, datada em 2046, nao entra)'
);
select is(
  (select ta_ministrado_ano::int from public.vw_instrutor_carga_anual
    where instrutor_id = 'a1501000-0000-0000-0000-000000000001' and ano = 2047),
  5,
  'em 2047, a aula da turma de 2047, pelo ano da turma e nao pela data'
);

-- ── as opcoes das views (gotcha 10) ──────────────────────────────────────────────
select ok(
  (select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.vw_instrutor_carga_prevista'::regclass),
  'vw_instrutor_carga_prevista continua security_invoker'
);
select ok(
  (select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.vw_instrutor_carga_anual'::regclass),
  'vw_instrutor_carga_anual continua security_invoker'
);

select * from finish();
rollback;
