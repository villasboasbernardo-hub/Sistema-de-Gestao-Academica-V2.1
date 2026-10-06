-- VIRADA-1 · a linha HISTÓRICA INATIVA fica dispensada das catracas — e só ela.
--
-- Migration `20261006184558`. A substituição dos lançamentos do ETL pela planilha de controle é
-- exclusão LÓGICA (regra 4), e inativar é editar: sem a emenda, o `UPDATE` de status era recusado.
--
-- ⚠️ CADA CATRACA TEM O PAR QUE DISCRIMINA: a linha migrada INATIVA passa; a MESMA linha, ATIVA e
--    já editada, continua recusada. Um arquivo que só provasse o primeiro passaria igual com a
--    catraca removida.
begin;
select plan(12);

insert into public.cursos (id, codigo, nome_curso, classificacao, modalidade, duracao_dias) values
  ('d1170000-0000-0000-0000-000000000001', 'T117-UE', 'Curso do 117', 'regular', 'presencial', 30);

insert into public.turmas (id, codigo, curso_id, turma, ano_letivo, status, modalidade,
                           data_inicio, data_termino) values
  ('d1175000-0000-0000-0000-000000000001', 'T117-UE T1 2026',
   'd1170000-0000-0000-0000-000000000001', 'T1', 2026, 'ativa', 'presencial', '2026-03-02', '2026-06-30');

-- Três linhas como o ETL as deixou: sem UE, sem instrutor, sem tempos, sem posição.
insert into public.registros_aula (id, codigo, data, turma_id, curso_id, origem_migracao_v1) values
  ('d1176000-0000-0000-0000-000000000001', 'T117-A1', '2026-03-03',
   'd1175000-0000-0000-0000-000000000001', 'd1170000-0000-0000-0000-000000000001', 'Registro_Aulas:T117-A1'),
  ('d1176000-0000-0000-0000-000000000002', 'T117-A2', '2026-03-04',
   'd1175000-0000-0000-0000-000000000001', 'd1170000-0000-0000-0000-000000000001', 'Registro_Aulas:T117-A2');

insert into public.atividades_nao_letivas (id, codigo, categoria_normativa, escopo, turma_id, data,
                                           descricao, origem_migracao_v1) values
  ('d1177000-0000-0000-0000-000000000001', 'T117-N1', 'Estudo_Individual', 'turma',
   'd1175000-0000-0000-0000-000000000001', '2026-03-03', 'Estudo individual migrado', 'Registro_Eventos:T117-N1');

-- ── as cinco restrições trazem a saída, e só para linha com procedência ──
select ok(
  (select bool_and(pg_get_constraintdef(oid) like '%(origem_migracao_v1 IS NOT NULL) AND (status = ''inativo''::status_registro)%')
     from pg_constraint
    where conname in ('reg_aula_instrutor_obrigatorio', 'reg_aula_tempos_so_nulo_no_historico',
                      'reg_aula_ue_so_nula_no_historico', 'reg_aula_ue_ou_disciplina',
                      'ativ_tempos_so_nulo_no_historico')),
  'VIRADA-1 · as CINCO catracas trazem a saída da linha migrada inativa — e ela exige procedência'
);

select is(
  (select count(*)::int from pg_constraint c
     left join pg_description d on d.objoid = c.oid and d.classoid = 'pg_constraint'::regclass
    where c.conname in ('reg_aula_instrutor_obrigatorio', 'reg_aula_tempos_so_nulo_no_historico',
                        'reg_aula_ue_so_nula_no_historico', 'reg_aula_ue_ou_disciplina',
                        'ativ_tempos_so_nulo_no_historico')
      and d.description like '%EMENDA DE 06/10/2026%'),
  5,
  'VIRADA-1 · as cinco têm comentário, com a emenda datada — `drop` + `add` descarta o comentário em silêncio'
);

-- ── a linha migrada pode ser INATIVADA ──
select lives_ok(
  $$update public.registros_aula set status = 'inativo',
           observacoes = '[SUBSTITUIDO PELA PLANILHA DE CONTROLE]'
     where id = 'd1176000-0000-0000-0000-000000000001'$$,
  'VIRADA-1 · inativar a aula migrada (sem UE, sem instrutor, sem tempos) PASSA — era recusado com 23514'
);

select isnt(
  (select editado_em from public.registros_aula where id = 'd1176000-0000-0000-0000-000000000001'),
  null,
  'VIRADA-1 · a inativação CARIMBA `editado_em` — é por isso que a saída não podia depender dele'
);

select lives_ok(
  $$update public.atividades_nao_letivas set status = 'inativo'
     where id = 'd1177000-0000-0000-0000-000000000001'$$,
  'VIRADA-1 · inativar a atividade migrada sem tempos PASSA'
);

-- ── ⚠️ os casos que discriminam: a linha ATIVA continua presa ──
select throws_ok(
  $$update public.registros_aula set status = 'ativo'
     where id = 'd1176000-0000-0000-0000-000000000001'$$,
  '23514', null,
  'VIRADA-1 (NEGATIVO) · REATIVAR a aula histórica sem UE é recusado — a saída só vale enquanto inativa'
);

select throws_ok(
  $$update public.atividades_nao_letivas set status = 'ativo'
     where id = 'd1177000-0000-0000-0000-000000000001'$$,
  '23514', null,
  'VIRADA-1 (NEGATIVO) · reativar a atividade histórica sem tempos é recusado'
);

select throws_ok(
  $$update public.registros_aula set conteudo_resumo = 'editada sem inativar'
     where id = 'd1176000-0000-0000-0000-000000000002'$$,
  '23514', null,
  'VIRADA-1 (NEGATIVO) · editar a linha histórica ATIVA continua exigindo o que falta — a catraca não foi removida'
);

-- ── ⚠️ linha NOVA não escapa por nascer inativa ──
select throws_ok(
  $$insert into public.registros_aula (codigo, data, turma_id, curso_id, status)
    values ('T117-NOVA', '2026-03-05', 'd1175000-0000-0000-0000-000000000001',
            'd1170000-0000-0000-0000-000000000001', 'inativo')$$,
  '23514', null,
  'VIRADA-1 (NEGATIVO) · lançamento NOVO inativo e sem UE é recusado — a saída exige procedência de ETL'
);

select throws_ok(
  $$insert into public.atividades_nao_letivas (codigo, categoria_normativa, escopo, turma_id, data, descricao, status)
    values ('T117-N-NOVA', 'TAD', 'turma', 'd1175000-0000-0000-0000-000000000001', '2026-03-05', 'nova', 'inativo')$$,
  '23514', null,
  'VIRADA-1 (NEGATIVO) · atividade NOVA inativa e sem tempos é recusada'
);

-- ── a linha inativa sai da ocupação, que é o que «substituir, não somar» precisa ──
select is(
  (select count(*)::int from public.registros_aula
    where turma_id = 'd1175000-0000-0000-0000-000000000001' and status = 'ativo'),
  1,
  'VIRADA-1 · das duas aulas migradas, sobra UMA ativa — a outra saiu por exclusão lógica, sem ser apagada'
);

select is(
  (select count(*)::int from public.registros_aula where turma_id = 'd1175000-0000-0000-0000-000000000001'),
  2,
  'regra 4 · nada foi apagado: as duas linhas continuam na tabela'
);

select * from finish();
rollback;
