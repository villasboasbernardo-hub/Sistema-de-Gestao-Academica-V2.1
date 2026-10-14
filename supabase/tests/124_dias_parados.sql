-- Spec 014, PR 1 · migration E-2 — dias parados, limites, código FER- e as views da turma.
--
-- FR-013 (o caso que discrimina): a atividade GLOBAL soma em cada turma com DSA na data e em
-- NENHUMA turma EAD nem semipresencial fora da etapa presencial.
begin;
select plan(17);

insert into public.cursos (id, codigo, nome_curso, classificacao, modalidade, duracao_dias) values
  ('d1240000-0000-0000-0000-000000000001', 'T124-DP', 'Curso do 124', 'regular', 'presencial', 30);
insert into public.turmas (id, codigo, curso_id, turma, ano_letivo, status, modalidade, data_inicio, data_termino,
                           inicio_etapa_presencial, termino_etapa_presencial) values
  ('d1245000-0000-0000-0000-000000000001', 'T124-DP T1 2026', 'd1240000-0000-0000-0000-000000000001', 'T1', 2026, 'ativa', 'presencial', '2026-03-02', '2026-06-30', null, null),
  ('d1245000-0000-0000-0000-000000000002', 'T124-DP T2 2026', 'd1240000-0000-0000-0000-000000000001', 'T2', 2026, 'ativa', 'presencial', '2026-03-02', '2026-06-30', null, null),
  ('d1245000-0000-0000-0000-000000000003', 'T124-DP T3 2026', 'd1240000-0000-0000-0000-000000000001', 'T3', 2026, 'ativa', 'ead',        '2026-03-02', '2026-06-30', null, null),
  ('d1245000-0000-0000-0000-000000000004', 'T124-DP T4 2026', 'd1240000-0000-0000-0000-000000000001', 'T4', 2026, 'ativa', 'semipresencial', '2026-03-02', '2026-06-30', '2026-05-01', '2026-05-30');

insert into public.config_listas (lista, valor, rotulo_exibicao, metadados) values
  ('tipos_atividade', 'T124 Palestra', 'T124 Palestra', '{"categoria": "AEC"}'),
  ('tipos_parada', 'T124LA', 'T124LA — Licença', '{"pode_global": true, "aceita_tr": true}')
on conflict (lista, valor) do nothing;

-- ── estrutura ──
select ok(
  (select relrowsecurity from pg_class where oid = 'public.dias_parados'::regclass),
  'R-1 · dias_parados tem RLS'
);
select is(
  (select count(*)::int from pg_policy where polrelid = 'public.dias_parados'::regclass and polcmd = 'd'),
  0,
  'Regra 4 · nenhuma policy de DELETE em dias_parados'
);
select is(
  (select count(*)::int from pg_policy where polrelid = 'public.limites_curriculo'::regclass and polcmd = 'd'),
  0,
  'Regra 4 · nenhuma policy de DELETE em limites_curriculo'
);
select ok(
  (select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.vw_carga_horaria_turma'::regclass)
  and (select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.vw_dias_parados_turma'::regclass),
  'Gotcha 10 · as duas views da turma rodam com security_invoker'
);
select is(
  (select array_agg(attname::text order by attnum) from pg_attribute
    where attrelid = 'public.vw_carga_horaria_turma'::regclass and attnum between 1 and 19),
  array['turma_id','turma_codigo','curso_id','curso_codigo','nome_curso','ano_letivo','status_turma','chr_curricular',
        'ta_aula','ta_extraclasse','ta_avaliacao','ta_vista_prova','chd_executada','ta_aec','ta_tad','ta_tr',
        'ta_estudo_individual','cht_executada','ta_apoio_individualizado'],
  'vw_carga_horaria_turma · as colunas antigas na MESMA ordem, as novas no fim (vw_conformidade_tetos depende dela)'
);

-- ── dias_parados: restrições e código ──
insert into public.dias_parados (id, turma_id, data, ta_inicial, tempos, tipo_parada_id, motivo)
select 'd1247000-0000-0000-0000-000000000001', 'd1245000-0000-0000-0000-000000000001', '2026-03-10', 1, 4, id, 'Licença da turma'
  from public.config_listas where lista = 'tipos_parada' and valor = 'T124LA';
select matches(
  (select codigo from public.dias_parados where id = 'd1247000-0000-0000-0000-000000000001'),
  '^DPA-[0-9]{6}$',
  'R-1 · o código DPA- vem do DEFAULT'
);
select throws_ok(
  $$insert into public.dias_parados (turma_id, data, tipo_parada_id, motivo)
    select null, '2026-03-11', id, 'Global de dia inteiro' from public.config_listas where lista = 'tipos_parada' and valor = 'T124LA'$$,
  '23514', null,
  'FR-024 · global de dia inteiro é `feriados`, não dia parado (dpa_global_so_parte_do_dia)'
);
select throws_ok(
  $$insert into public.dias_parados (turma_id, data, ta_inicial, tipo_parada_id, motivo)
    select 'd1245000-0000-0000-0000-000000000001', '2026-03-11', 2, id, 'Sem tempos' from public.config_listas where lista = 'tipos_parada' and valor = 'T124LA'$$,
  '23514', null,
  'R-1 · ta_inicial e tempos andam juntos (dpa_tempos_coerentes)'
);
select throws_ok(
  $$insert into public.dias_parados (turma_id, data, tipo_parada_id, motivo)
    values ('d1245000-0000-0000-0000-000000000001', '2026-03-11', gen_random_uuid(), 'Tipo inexistente')$$,
  '23503', null,
  'FR-012 · o tipo de parada é FK para config_listas'
);

-- ── feriados: código FER- por DEFAULT, e a sequência não fica atrás ──
insert into public.feriados (id, ano, data, descricao, impacto) values
  ('d1248000-0000-0000-0000-000000000001', 2026, '2026-03-12', 'T124LA — Licença geral', 'dia_inteiro');
select matches(
  (select codigo from public.feriados where id = 'd1248000-0000-0000-0000-000000000001'),
  '^FER-[0-9]{6}$',
  'Gotcha 9 · feriados.codigo vem do DEFAULT FER-'
);
select ok(
  (select last_value from app.feriados_codigo_seq) >=
  (select coalesce(max(substring(codigo from '^FER-([0-9]+)$')::bigint), 0) from public.feriados),
  'Gotcha 9 · a sequência FER- nunca está atrás do maior código gravado'
);

-- ── FR-013: a global soma só em turma com DSA na data ──
insert into public.atividades_nao_letivas (codigo, categoria_normativa, escopo, turma_id, data, descricao, subtipo, tempos_consumidos)
values ('T124-G1', 'AEC', 'global', null, '2026-03-16', 'Palestra global', 'T124 Palestra', 2);
select is(
  (select array_agg(ta_aec order by turma_codigo) from public.vw_carga_horaria_turma where curso_codigo = 'T124-DP'),
  array[2, 2, 0, 0]::bigint[],
  'FR-013 · a AEC global de 2 TA soma 2 nas duas presenciais e 0 na EAD e na semipresencial fora da etapa'
);
select ok(
  not app.turma_tem_dsa_na_data('d1245000-0000-0000-0000-000000000003', '2026-03-16')
  and app.turma_tem_dsa_na_data('d1245000-0000-0000-0000-000000000004', '2026-05-10'),
  'A-1 · EAD nunca tem DSA; semipresencial tem dentro da etapa presencial'
);

-- ── FR-025.4: a linha "dias parados", fora da CHT ──
select is(
  (select (dias, tempos) from public.vw_dias_parados_turma where turma_id = 'd1245000-0000-0000-0000-000000000001' and tipo = 'T124LA'),
  (2::bigint, 4::bigint + coalesce((select regime_padrao_tempos from public.vw_cursos_regime_vigente where curso_id = 'd1240000-0000-0000-0000-000000000001'), 8)::bigint),
  'FR-025.4 · dias parados = os 4 tempos da licença da turma + o feriado de dia inteiro (tempos do regime)'
);
select is(
  (select cht_executada from public.vw_carga_horaria_turma where turma_id = 'd1245000-0000-0000-0000-000000000001'),
  2::bigint,
  'Q-14 · o dia parado NÃO entra na CHT (só a AEC global de 2 TA)'
);
select is(
  (select tempos from public.vw_dias_parados_turma where turma_id = 'd1245000-0000-0000-0000-000000000002' and tipo = 'T124LA'),
  coalesce((select regime_padrao_tempos from public.vw_cursos_regime_vigente where curso_id = 'd1240000-0000-0000-0000-000000000001'), 8)::bigint,
  'FR-025.4 · o tipo do feriado vem da sigla do prefixo da descrição quando casa com tipos_parada'
);
select ok(
  exists (select 1 from public.vw_dias_parados_turma v join public.turmas t on t.id = v.turma_id
           where v.tipo = 'FR' and t.codigo not like 'T124%')
  or not exists (select 1 from public.feriados f where f.descricao not like '% — %' and f.status = 'ativo' and f.impacto = 'dia_inteiro'),
  'FR-025.4 · feriado histórico sem prefixo conta como FR'
);

select * from finish();
rollback;
