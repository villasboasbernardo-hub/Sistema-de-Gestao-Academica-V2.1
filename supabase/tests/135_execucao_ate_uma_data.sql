-- =================================================================================
-- 135 — Spec 016, PR 3 · M1 (`20261019035107_execucao_ate_uma_data`): a CHD EXECUTADA ATÉ UM DIA DADO.
--
-- D-COR-2 (Bernardo Villas Boas, 16/10/2026): *"o saldo de capacidade conta só até hoje"*; Q-5 e NQ-1: fora do DSA e da
-- planilha, executado é "até hoje" em toda tela. O dia é o de São Paulo, passado por quem chama (FR-014.3).
--
-- O caso que discrimina (DoD 8): uma turma com aula de 2 TA ONTEM, 1 TA NO DIA, 3 TA AMANHÃ, uma avaliação pendente de
-- 2 TA depois de amanhã e uma vista de 1 TA três dias depois dela. `chd_da_turma_ate(dia)` = 3; a view de hoje
-- (`vw_carga_horaria_turma.chd_executada`), que soma tudo, = 9.
--
-- A guarda da cópia (P-3, `PEND-016-1`): a composição da CHD vive em TRÊS lugares — as duas views de hoje e a base
-- nova. SEM CORTE, a base TEM de bater com as duas, em toda execução da suíte: quem mudar uma e esquecer as outras
-- reprova aqui.
--
-- ⚠️ Autorização NÃO se prova aqui (pgTAP roda como dono): que a função não fura a RLS está em
--    `tests/invariantes/rls/execucao-ate.test.ts`, com sessão real. Aqui, a estrutura e a regra do banco.
-- =================================================================================
begin;
select plan(21);

select public.criar_curso_com_regime(
  '{"codigo":"T135-CUR","nome_curso":"Curso T135","classificacao":"regular",
    "modalidade":"presencial","duracao_dias":300}'::jsonb,
  '{"regime_tempos":8,"ta_duracao_min":45,"intervalo_manha_min":10,"intervalo_tarde_min":10,
    "hora_inicio_manha":"07:30","hora_inicio_tarde":"13:30","vigente_de":"2047-01-01"}'::jsonb);
create temporary table _t135 as select id as curso_id from public.cursos where codigo = 'T135-CUR';
insert into public.config_listas (lista, valor, rotulo_exibicao) values ('tipos_avaliacao', 'Prova T135', 'Prova T135')
  on conflict do nothing;

insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos) values
  ('13500000-0000-0000-0000-000000000001', 'T135-D1', (select curso_id from _t135), 'T135', 'Disciplina T135', 40);
insert into public.unidades_ensino (id, codigo, disciplina_id, curso_id, numero_ue, topico, ch_prevista_tempos) values
  ('13510000-0000-0000-0000-000000000001', 'T135-UE1', '13500000-0000-0000-0000-000000000001',
   (select curso_id from _t135), 1, 'Tópico T135', 40);
insert into public.turmas (id, curso_id, turma, ano_letivo, status, modalidade, data_inicio, data_termino) values
  ('13520000-0000-0000-0000-000000000001', (select curso_id from _t135), 'T1', 2047,
   'ativa', 'presencial', '2047-03-02', '2047-11-30');
insert into public.instrutores (id, codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om) values
  ('13530000-0000-0000-0000-000000000001', 'T135-INS', 'CT', '-EF', 'Instrutor T135', 'Militar', 'CIAARA');

-- O dia é 12/05/2047. Ontem 2 TA, no dia 1 TA, amanhã 3 TA.
insert into public.registros_aula
  (codigo, data, turma_id, curso_id, unidade_ensino_id, instrutor_id, tempos_consumidos, ta_inicial)
values
  ('T135-REG-ONTEM',  '2047-05-11', '13520000-0000-0000-0000-000000000001', (select curso_id from _t135),
   '13510000-0000-0000-0000-000000000001', '13530000-0000-0000-0000-000000000001', 2, 1),
  ('T135-REG-DIA',    '2047-05-12', '13520000-0000-0000-0000-000000000001', (select curso_id from _t135),
   '13510000-0000-0000-0000-000000000001', '13530000-0000-0000-0000-000000000001', 1, 1),
  ('T135-REG-AMANHA', '2047-05-13', '13520000-0000-0000-0000-000000000001', (select curso_id from _t135),
   '13510000-0000-0000-0000-000000000001', '13530000-0000-0000-0000-000000000001', 3, 1);
-- Depois de amanhã, a avaliação PENDENTE de 2 TA; três dias depois dela, a vista de 1 TA.
insert into public.avaliacoes (id, codigo, turma_id, disciplina_id, curso_id, tipo_avaliacao, data_avaliacao, ta_inicial,
                               tempos_consumidos, instrutor_responsavel_id)
values ('13540000-0000-0000-0000-000000000001', 'T135-AV1', '13520000-0000-0000-0000-000000000001',
        '13500000-0000-0000-0000-000000000001', (select curso_id from _t135), 'Prova T135', '2047-05-14', 1, 2,
        '13530000-0000-0000-0000-000000000001');
insert into public.vistas_de_avaliacao (avaliacao_id, numero, data, ta_inicial, tempos_consumidos)
values ('13540000-0000-0000-0000-000000000001', 1, '2047-05-17', 1, 1);

-- ── o caso que discrimina ──
select is(
  (select status::text from public.avaliacoes where id = '13540000-0000-0000-0000-000000000001'),
  'pendente',
  'semente · a avaliação é PENDENTE — a view de hoje a soma mesmo assim'
);
select is(
  (select chd_executada from public.vw_carga_horaria_turma where turma_id = '13520000-0000-0000-0000-000000000001'),
  9::bigint,
  'D-COR-2 · a view de hoje soma TUDO — inclusive o futuro: 2 + 1 + 3 + 2 + 1 = 9'
);
select is(
  (select chd_executada from public.chd_da_turma_ate('2047-05-12')
    where turma_id = '13520000-0000-0000-0000-000000000001'),
  3::bigint,
  'D-COR-2 · FR-014.1 · até o dia, só 3: ontem (2) e o próprio dia (1) — o futuro não entra'
);
select is(
  (select chd_executada from public.chd_da_turma_ate('2047-05-11')
    where turma_id = '13520000-0000-0000-0000-000000000001'),
  2::bigint,
  'FR-014.1 · a borda é INCLUSIVA: até ontem conta a aula de ontem'
);
select is(
  (select count(*)::int from public.chd_da_turma_ate('2047-05-10')
    where turma_id = '13520000-0000-0000-0000-000000000001'),
  0,
  'FR-014.1 · antes do primeiro fato, a turma não aparece'
);
select is(
  (select chd_executada from public.chd_da_turma_ate('2047-05-14')
    where turma_id = '13520000-0000-0000-0000-000000000001'),
  8::bigint,
  'FR-014.1 · no dia da avaliação pendente, ela conta (2 + 1 + 3 + 2) e a vista ainda não'
);
select is(
  (select chd_executada from public.chd_da_turma_ate('2047-05-17')
    where turma_id = '13520000-0000-0000-0000-000000000001'),
  9::bigint,
  'FR-014.1 · no dia da vista, a soma alcança a da view de hoje'
);
select results_eq(
  $$select disciplina_id, ta_executados, data_real_inicio
      from public.execucao_por_disciplina_ate('2047-05-12', '13520000-0000-0000-0000-000000000001')$$,
  $$values ('13500000-0000-0000-0000-000000000001'::uuid, 3::bigint, '2047-05-11'::date)$$,
  'FR-014.4 · por disciplina, até o dia: 3 TA, iniciada ontem (a disciplina da aula vem da UE)'
);

-- ── a guarda da cópia: SEM CORTE, a base é a mesma soma das duas views de hoje ──
select is(
  (select count(*)::int
     from public.vw_carga_horaria_turma v
     left join public.chd_da_turma_ate('9999-12-31') f on f.turma_id = v.turma_id
    where coalesce(f.chd_executada, 0) <> coalesce(v.chd_executada, 0)),
  0,
  'P-3 · sem corte, chd_da_turma_ate = vw_carga_horaria_turma.chd_executada em TODA turma'
);
select is(
  (select count(*)::int
     from public.chd_da_turma_ate('9999-12-31') f
    where not exists (select 1 from public.vw_carga_horaria_turma v where v.turma_id = f.turma_id)),
  0,
  'P-3 · e nenhuma turma da base fica de fora da view'
);
select is(
  (select count(*)::int
     from public.vw_disciplinas_execucao v
     left join lateral public.execucao_por_disciplina_ate('9999-12-31', v.turma_id) f
       on f.disciplina_id = v.disciplina_id
    where coalesce(f.ta_executados, 0) <> coalesce(v.ta_executados, 0)),
  0,
  'P-3 · sem corte, execucao_por_disciplina_ate = vw_disciplinas_execucao.ta_executados em toda turma × disciplina'
);

-- ── a estrutura ──
select ok(
  (select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.vw_chd_por_fato'::regclass),
  'Gotcha 10 · vw_chd_por_fato roda com security_invoker'
);
select is(
  (select count(*)::int from pg_proc
    where oid in ('public.chd_da_turma_ate(date)'::regprocedure,
                  'public.execucao_por_disciplina_ate(date, uuid)'::regprocedure)
      and provolatile = 's' and not prosecdef),
  2,
  'Princípio XI · as duas funções são stable e NÃO security definer — a RLS de quem lê vale'
);
select is(
  (select count(*)::int from pg_proc
    where oid in ('public.chd_da_turma_ate(date)'::regprocedure,
                  'public.execucao_por_disciplina_ate(date, uuid)'::regprocedure)
      and pronargdefaults = 0),
  2,
  'FR-014.3 · p_ate SEM valor padrão — esquecer o dia é erro de chamada, não número errado'
);
-- Regra 9.1.1: o corpo é lido SEM comentário antes de procurar.
select is(
  (select count(*)::int from pg_proc
    where oid in ('public.chd_da_turma_ate(date)'::regprocedure,
                  'public.execucao_por_disciplina_ate(date, uuid)'::regprocedure)
      and lower(regexp_replace(prosrc, '--[^\n]*', '', 'g'))
          ~ '(current_date|now\s*\(|current_timestamp|localtimestamp)'),
  0,
  'FR-014.3 · D20 · nenhuma das duas lê o relógio do servidor (current_date, now(), current_timestamp, localtimestamp)'
);
select ok(
  lower(regexp_replace(pg_get_viewdef('public.vw_chd_por_fato'::regclass), '--[^\n]*', '', 'g'))
    !~ '(current_date|now\s*\(|current_timestamp|localtimestamp)',
  'FR-014.3 · nem a base lê o relógio do servidor'
);

-- ── os privilégios ──
select ok(
  not has_table_privilege('authenticated', 'public.vw_chd_por_fato', 'INSERT')
  and not has_table_privilege('authenticated', 'public.vw_chd_por_fato', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.vw_chd_por_fato', 'DELETE')
  and not has_table_privilege('authenticated', 'public.vw_chd_por_fato', 'TRUNCATE'),
  'Épico 1 · a base nasce SEM escrita para authenticated (o revoke repetido)'
);
select ok(
  has_table_privilege('authenticated', 'public.vw_chd_por_fato', 'SELECT')
  and not has_table_privilege('anon', 'public.vw_chd_por_fato', 'SELECT'),
  'a base: authenticated lê, anon não'
);
select ok(
  not has_function_privilege('anon', 'public.chd_da_turma_ate(date)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.execucao_por_disciplina_ate(date, uuid)', 'EXECUTE'),
  'anon NÃO executa as duas funções'
);
select ok(
  has_function_privilege('authenticated', 'public.chd_da_turma_ate(date)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.execucao_por_disciplina_ate(date, uuid)', 'EXECUTE'),
  'controle positivo · authenticated executa as duas'
);
select is(
  (select count(*)::int from pg_policy where polcmd = 'd'),
  0,
  'Regra 4 · nenhuma policy de DELETE no catálogo'
);

select * from finish();
rollback;
