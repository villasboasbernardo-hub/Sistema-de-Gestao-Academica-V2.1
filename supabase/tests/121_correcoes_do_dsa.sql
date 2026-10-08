-- =================================================================================
-- 121 — Correcoes do DSA de 08/10/2026 (migration 20261008164612)
--
-- O QUE  : (1) a AEC ganha disciplina OPCIONAL — so AEC, so de turma, so do curso da turma;
--          (2) D-DSA-2: a turma ganha a janela da etapa presencial, inteira e coerente.
--          A D-DSA-1 (aula sem UE em qualquer disciplina) esta no `116`, no caso que discrimina.
--
-- ⚠️ OS CASOS QUE DISCRIMINAM (DoD 8): a AEC com disciplina do curso da turma — impossivel antes,
--    porque a coluna nao existia — e a turma com a janela da etapa presencial.
-- ⚠️ Identificadores fixos: o arquivo inteiro vive numa transacao DESFEITA (regra 9.1 cobra
--    geracao so em amostra que persiste). Nada aqui mexe em sequencia (gotcha 6).
-- =================================================================================

begin;
select plan(22);

insert into public.cursos (id, codigo, nome_curso, classificacao, modalidade, duracao_dias) values
  ('d1210000-0000-0000-0000-000000000001', 'T121-A', 'Curso A do 121', 'regular', 'semipresencial', 90),
  ('d1210000-0000-0000-0000-000000000002', 'T121-B', 'Curso B do 121', 'regular', 'presencial', 30);

insert into public.turmas (id, codigo, curso_id, turma, ano_letivo, status, modalidade,
                           data_inicio, data_termino) values
  ('d1215000-0000-0000-0000-000000000001', 'T121-A T1 2026',
   'd1210000-0000-0000-0000-000000000001', 'T1', 2026, 'ativa', 'semipresencial', '2026-03-02', '2026-11-30');

insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina,
                                carga_horaria_tempos) values
  ('d1213000-0000-0000-0000-000000000001', 'T121-D-A', 'd1210000-0000-0000-0000-000000000001',
   'I', 'Disciplina do curso A', 10),
  ('d1213000-0000-0000-0000-000000000002', 'T121-D-B', 'd1210000-0000-0000-0000-000000000002',
   'I', 'Disciplina do curso B', 10);

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- 1 · A DISCIPLINA DA AEC
-- ═══════════════════════════════════════════════════════════════════════════════════════

select has_column('public', 'atividades_nao_letivas', 'disciplina_id',
  'AEC · `atividades_nao_letivas.disciplina_id` existe');

select col_is_null('public', 'atividades_nao_letivas', 'disciplina_id',
  'AEC · ela e ANULAVEL: AEC sem disciplina continua o caso normal');

select has_function('app', 'disciplina_e_da_turma', array['uuid', 'uuid'],
  'AEC · o porteiro `app.disciplina_e_da_turma(uuid, uuid)` existe');

select ok(
  (select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app' and p.proname = 'disciplina_e_da_turma'),
  'AEC · o porteiro e SECURITY DEFINER — CHECK e fato sobre a linha, nao depende de permissao');

-- ⚠️ gotcha 5.1: o CHECK e avaliado com os direitos de quem grava.
select ok(
  has_function_privilege('authenticated', 'app.disciplina_e_da_turma(uuid, uuid)', 'execute'),
  'AEC · `authenticated` executa o porteiro — sem isso toda AEC gravada pela tela falharia');

select ok(
  not has_function_privilege('anon', 'app.disciplina_e_da_turma(uuid, uuid)', 'execute'),
  'AEC · `anon` NAO executa o porteiro');

-- ⚠️ O CASO QUE DISCRIMINA: AEC de turma, com disciplina do curso da turma.
select lives_ok($$
  insert into public.atividades_nao_letivas
    (codigo, categoria_normativa, escopo, turma_id, data, descricao, tempos_consumidos, ta_inicial,
     disciplina_id)
  values ('T121-ATV-001', 'AEC', 'turma', 'd1215000-0000-0000-0000-000000000001', '2026-04-06',
          'Visita tecnica da disciplina I', 2, 1, 'd1213000-0000-0000-0000-000000000001')
$$, 'AEC · AEC de turma com disciplina do curso da turma e ACEITA — o lancamento que a coluna abre');

select lives_ok($$
  insert into public.atividades_nao_letivas
    (codigo, categoria_normativa, escopo, turma_id, data, descricao, tempos_consumidos, ta_inicial)
  values ('T121-ATV-002', 'AEC', 'turma', 'd1215000-0000-0000-0000-000000000001', '2026-04-07',
          'Palestra sem disciplina', 2, 1)
$$, 'AEC · AEC SEM disciplina continua aceita — a disciplina e opcional');

select throws_ok($$
  insert into public.atividades_nao_letivas
    (codigo, categoria_normativa, escopo, turma_id, data, descricao, tempos_consumidos, ta_inicial,
     disciplina_id)
  values ('T121-ATV-003', 'AEC', 'turma', 'd1215000-0000-0000-0000-000000000001', '2026-04-08',
          'AEC com disciplina de OUTRO curso', 2, 1, 'd1213000-0000-0000-0000-000000000002')
$$, '23514', null,
  'AEC · disciplina de OUTRO curso e recusada — o porteiro confere o curso da turma');

select throws_ok($$
  insert into public.atividades_nao_letivas
    (codigo, categoria_normativa, escopo, turma_id, data, descricao, tempos_consumidos, ta_inicial,
     disciplina_id)
  values ('T121-ATV-004', 'TAD', 'turma', 'd1215000-0000-0000-0000-000000000001', '2026-04-09',
          'TAD com disciplina', 1, 1, 'd1213000-0000-0000-0000-000000000001')
$$, '23514', null,
  'AEC · so a AEC leva disciplina — TAD com disciplina e recusada');

select throws_ok($$
  insert into public.atividades_nao_letivas
    (codigo, categoria_normativa, escopo, turma_id, data, descricao, tempos_consumidos, ta_inicial,
     disciplina_id)
  values ('T121-ATV-005', 'AEC', 'global', null, '2026-04-10',
          'AEC global com disciplina', 1, 1, 'd1213000-0000-0000-0000-000000000001')
$$, '23514', null,
  'AEC · atividade GLOBAL nao leva disciplina — ela vale para todas as turmas e nao e de curso nenhum');

-- ⚠️ E A DISCIPLINA DA AEC NAO ENTRA NA VIEW DA OCUPACAO: AEC nao e CHD.
select is(
  (select disciplina_id from public.vw_ocupacao_ta
    where origem = 'atividade_nao_letiva'
      and fato_id = (select id from public.atividades_nao_letivas where codigo = 'T121-ATV-001')),
  null::uuid,
  'AEC · a disciplina da AEC NAO aparece em `vw_ocupacao_ta` — ela nao conta no teto nem na CH da disciplina');

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- 2 · D-DSA-2 — A JANELA DA ETAPA PRESENCIAL
-- ═══════════════════════════════════════════════════════════════════════════════════════

select has_column('public', 'turmas', 'inicio_etapa_presencial',
  'D-DSA-2 · `turmas.inicio_etapa_presencial` existe');
select has_column('public', 'turmas', 'termino_etapa_presencial',
  'D-DSA-2 · `turmas.termino_etapa_presencial` existe');

-- O CASO QUE DISCRIMINA: a janela inteira, dentro do periodo da turma.
select lives_ok($$
  update public.turmas
     set inicio_etapa_presencial = '2026-05-04', termino_etapa_presencial = '2026-05-29'
   where id = 'd1215000-0000-0000-0000-000000000001'
$$, 'D-DSA-2 · a janela inteira e coerente, dentro do periodo da turma, e ACEITA');

select is(
  (select termino_etapa_presencial from public.turmas where id = 'd1215000-0000-0000-0000-000000000001'),
  '2026-05-29'::date,
  'D-DSA-2 · e a janela fica gravada — o valor no banco, nao so a ausencia de erro');

select lives_ok($$
  update public.turmas
     set inicio_etapa_presencial = null, termino_etapa_presencial = null
   where id = 'd1215000-0000-0000-0000-000000000001'
$$, 'D-DSA-2 · sem janela (as duas nulas) continua aceito — e o estado "nao cadastrada", que a tela avisa');

select throws_ok($$
  update public.turmas
     set inicio_etapa_presencial = '2026-05-04', termino_etapa_presencial = null
   where id = 'd1215000-0000-0000-0000-000000000001'
$$, '23514', null,
  'D-DSA-2 · janela pela METADE e recusada — as duas pontas ou nenhuma');

select throws_ok($$
  update public.turmas
     set inicio_etapa_presencial = '2026-05-29', termino_etapa_presencial = '2026-05-04'
   where id = 'd1215000-0000-0000-0000-000000000001'
$$, '23514', null,
  'D-DSA-2 · termino ANTES do inicio e recusado');

select throws_ok($$
  update public.turmas
     set inicio_etapa_presencial = '2026-02-01', termino_etapa_presencial = '2026-05-29'
   where id = 'd1215000-0000-0000-0000-000000000001'
$$, '23514', null,
  'D-DSA-2 · janela que COMECA antes do periodo da turma e recusada');

select throws_ok($$
  update public.turmas
     set inicio_etapa_presencial = '2026-05-04', termino_etapa_presencial = '2026-12-15'
   where id = 'd1215000-0000-0000-0000-000000000001'
$$, '23514', null,
  'D-DSA-2 · janela que TERMINA depois do periodo da turma e recusada');

-- ⚠️ O comentario da restricao existe: `drop constraint` o descartaria em silencio.
select ok(
  (select obj_description(oid, 'pg_constraint') is not null from pg_constraint
    where conrelid = 'public.turmas'::regclass and conname = 'turmas_etapa_presencial_coerente'),
  'D-DSA-2 · a restricao tem comentario — quem ler o catalogo sabe por que ela existe');

select * from finish();
rollback;
