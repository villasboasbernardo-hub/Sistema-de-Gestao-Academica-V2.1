-- =================================================================================
-- 155 — O ajuste manual de uma avaliação (spec 031, Bloco 16, ajuste D de 31/10/2026)
--
-- O QUE  : prova a estrutura e as regras de banco de `20261031151628_ajustes_de_avaliacao`: a tabela só de acréscimo
--          (o gatilho recusa reescrever, inclusive sem sessão), um alvo só (item do currículo OU avaliação), a
--          justificativa de 10 caracteres ou mais, a vista não antes da aplicação, a situação da lista fechada, e o
--          alvo da própria turma. Sem DELETE para `authenticated`. Nenhuma view lê a tabela (a CH não muda).
-- ⚠️ Quem pode o quê se prova com sessão autenticada em `tests/invariantes/rls/ajustes-de-avaliacao.test.ts`.
-- ⚠️ 2049 e códigos próprios (`T155-…`): vale na base limpa e na carregada.
-- =================================================================================
begin;
select plan(11);

select has_table('public', 'ajustes_de_avaliacao', 'D · a tabela de ajustes existe');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.ajustes_de_avaliacao'::regclass),
  'D · RLS ligada'
);
select is(
  (select count(*)::int from pg_policy where polrelid = 'public.ajustes_de_avaliacao'::regclass and polcmd in ('w', 'd')),
  0,
  'D · nenhuma policy de UPDATE nem de DELETE (só de acréscimo; regra 4)'
);
select ok(
  not has_table_privilege('authenticated', 'public.ajustes_de_avaliacao', 'DELETE')
  and not has_table_privilege('authenticated', 'public.ajustes_de_avaliacao', 'UPDATE'),
  'D · authenticated sem privilégio de UPDATE e de DELETE'
);
select is(
  (select count(*)::int from pg_views
    where schemaname in ('public', 'app') and definition ilike '%ajustes_de_avaliacao%'),
  0,
  'D · nenhuma view lê os ajustes — a CH e a situação calculada no banco não mudam'
);

-- ── a amostra ────────────────────────────────────────────────────────────────────
insert into public.cursos (id, codigo, nome_curso, classificacao, modalidade, duracao_dias) values
  ('a1552000-0000-0000-0000-000000000001', 'T155-CUR', 'Curso T155', 'regular', 'presencial', 30),
  ('a1552000-0000-0000-0000-000000000002', 'T155-OUT', 'Curso T155 outro', 'regular', 'presencial', 30);
insert into public.turmas (id, codigo, curso_id, turma, ano_letivo, status, modalidade, data_inicio, data_termino)
values ('a1555000-0000-0000-0000-000000000001', 'T155-CUR T1 2049', 'a1552000-0000-0000-0000-000000000001',
        'T1', 2049, 'ativa', 'presencial', '2049-03-01', '2049-06-30'),
       ('a1555000-0000-0000-0000-000000000002', 'T155-OUT T1 2049', 'a1552000-0000-0000-0000-000000000002',
        'T1', 2049, 'ativa', 'presencial', '2049-03-01', '2049-06-30');
insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos) values
  ('a1553000-0000-0000-0000-000000000001', 'T155-DIS', 'a1552000-0000-0000-0000-000000000001', 'I', 'D T155', 20),
  ('a1553000-0000-0000-0000-000000000002', 'T155-DOU', 'a1552000-0000-0000-0000-000000000002', 'I', 'D T155o', 20);
-- ⚠️ `tipos_avaliacao` nasce VAZIA no `db:reset` (é povoada pela carga): a amostra semeia o tipo que usa.
insert into public.config_listas (lista, valor, rotulo_exibicao) values ('tipos_avaliacao', 'T155 Prova', 'T155 Prova');
insert into public.avaliacoes (id, codigo, turma_id, curso_id, disciplina_id, tipo_avaliacao, data_avaliacao, status)
values ('a1556000-0000-0000-0000-000000000001', 'T155-AV1', 'a1555000-0000-0000-0000-000000000001',
        'a1552000-0000-0000-0000-000000000001', 'a1553000-0000-0000-0000-000000000001', 'T155 Prova',
        '2049-04-10', 'pendente'),
       ('a1556000-0000-0000-0000-000000000002', 'T155-AV2', 'a1555000-0000-0000-0000-000000000002',
        'a1552000-0000-0000-0000-000000000002', 'a1553000-0000-0000-0000-000000000002', 'T155 Prova',
        '2049-04-10', 'pendente');

insert into public.ajustes_de_avaliacao (id, turma_id, avaliacao_id, situacao, data_aplicacao, data_vista, justificativa)
values ('a1557000-0000-0000-0000-000000000001', 'a1555000-0000-0000-0000-000000000001',
        'a1556000-0000-0000-0000-000000000001', 'concluida', '2049-04-11', '2049-04-15',
        'Aplicada em outro dia, conforme a ata da turma.');
select is(
  (select autor_nome from public.ajustes_de_avaliacao where id = 'a1557000-0000-0000-0000-000000000001'),
  null,
  'D · sem sessão (script), o autor fica nulo — o banco carimba o autor só pela sessão'
);

select throws_ok(
  $$update public.ajustes_de_avaliacao set justificativa = 'Reescrevendo o histórico.'
     where id = 'a1557000-0000-0000-0000-000000000001'$$,
  '42501', null,
  'D · o ajuste não se reescreve, nem pela service_role (42501)'
);
select throws_ok(
  $$insert into public.ajustes_de_avaliacao (turma_id, avaliacao_id, situacao, justificativa)
    values ('a1555000-0000-0000-0000-000000000001', 'a1556000-0000-0000-0000-000000000001', 'cancelada', 'curta')$$,
  '23514', null,
  'D · justificativa com menos de 10 caracteres é recusada'
);
select throws_ok(
  $$insert into public.ajustes_de_avaliacao (turma_id, situacao, justificativa)
    values ('a1555000-0000-0000-0000-000000000001', 'cancelada', 'Sem alvo nenhum aqui.')$$,
  '23514', null,
  'D · sem item e sem avaliação é recusado (um alvo só)'
);
select throws_ok(
  $$insert into public.ajustes_de_avaliacao (turma_id, avaliacao_id, situacao, justificativa)
    values ('a1555000-0000-0000-0000-000000000001', 'a1556000-0000-0000-0000-000000000002', 'cancelada',
            'A avaliação é da outra turma.')$$,
  '23514', null,
  'D · a avaliação de outra turma é recusada'
);
select throws_ok(
  $$insert into public.ajustes_de_avaliacao (turma_id, avaliacao_id, situacao, justificativa)
    values ('a1555000-0000-0000-0000-000000000001', 'a1556000-0000-0000-0000-000000000001', 'aprovada',
            'Situação fora da lista fechada.')$$,
  '23514', null,
  'D · situação fora da lista é recusada'
);

select * from finish();
rollback;
