-- Spec 014, PR 1 · migration E-1 e E-2 — Apoio Individualizado, o tipo com FK e `compoe_cht` recriada.
--
-- RN-EVT-01 (Risco Alto): Estudo Individual e Apoio Individualizado NUNCA entram na CHT (SC-004).
-- Decisão D-1 do plan: `compoe_cht` recriada dá o MESMO resultado da expressão antiga em toda linha
-- que não é Apoio.
begin;
select plan(18);

insert into public.cursos (id, codigo, nome_curso, classificacao, modalidade, duracao_dias) values
  ('d1230000-0000-0000-0000-000000000001', 'T123-AP', 'Curso do 123', 'regular', 'presencial', 30);
insert into public.turmas (id, codigo, curso_id, turma, ano_letivo, status, modalidade, data_inicio, data_termino) values
  ('d1235000-0000-0000-0000-000000000001', 'T123-AP T1 2026', 'd1230000-0000-0000-0000-000000000001',
   'T1', 2026, 'ativa', 'presencial', '2026-03-02', '2026-06-30');

insert into public.config_listas (lista, valor, rotulo_exibicao, metadados) values
  ('tipos_atividade', 'T123 Palestra',  'T123 Palestra',  '{"categoria": "AEC"}'),
  ('tipos_atividade', 'T123 Monitoria', 'T123 Monitoria', '{"categoria": "Apoio_Individualizado"}'),
  ('tipos_atividade', 'T123 Aula',      'T123 Aula',      '{"uso": "aula"}')
on conflict (lista, valor) do update set metadados = excluded.metadados;

select ok(
  'Apoio_Individualizado' = any (enum_range(null::public.categoria_normativa)::text[]),
  'FR-018 · o domínio de categorias tem o 5º valor, Apoio_Individualizado'
);

-- ── o tipo deriva a categoria ──
insert into public.atividades_nao_letivas (id, codigo, categoria_normativa, escopo, turma_id, data, descricao, subtipo, tempos_consumidos)
values ('d1237000-0000-0000-0000-000000000001', 'T123-N1', 'TAD', 'turma', 'd1235000-0000-0000-0000-000000000001',
        '2026-03-03', 'Palestra', 'T123 Palestra', 2);
select is(
  (select categoria_normativa::text from public.atividades_nao_letivas where id = 'd1237000-0000-0000-0000-000000000001'),
  'AEC',
  'D-AA-3 · a categoria vem do TIPO (o subtipo casou com o tipo de AEC), e não da que o cliente mandou'
);
select isnt(
  (select tipo_atividade_id from public.atividades_nao_letivas where id = 'd1237000-0000-0000-0000-000000000001'),
  null,
  'R-3 · o tipo é preenchido pelo subtipo quando vem nulo (o DSA e a sincronização de hoje mandam o subtipo)'
);

insert into public.atividades_nao_letivas (id, codigo, categoria_normativa, escopo, turma_id, data, descricao, subtipo, tempos_consumidos)
values ('d1237000-0000-0000-0000-000000000002', 'T123-N2', 'TAD', 'turma', 'd1235000-0000-0000-0000-000000000001',
        '2026-03-04', 'Monitoria de reforço', 'T123 Monitoria', 2);
select is(
  (select (categoria_normativa::text, compoe_cht) from public.atividades_nao_letivas where id = 'd1237000-0000-0000-0000-000000000002'),
  ('Apoio_Individualizado'::text, false),
  'RN-EVT-01 · Monitoria cai em Apoio Individualizado e `compoe_cht` é FALSO — fora da CHT (SC-004)'
);

-- ── UPDATE só do subtipo recalcula o tipo (o caso que discrimina) ──
update public.atividades_nao_letivas set subtipo = 'T123 Monitoria' where id = 'd1237000-0000-0000-0000-000000000001';
select is(
  (select categoria_normativa::text from public.atividades_nao_letivas where id = 'd1237000-0000-0000-0000-000000000001'),
  'Apoio_Individualizado',
  'R-3 · um UPDATE só do subtipo recalcula o tipo e a categoria'
);
update public.atividades_nao_letivas set subtipo = 'T123 Monitoria' where id = 'd1237000-0000-0000-0000-000000000001';
select is(
  (select categoria_normativa::text from public.atividades_nao_letivas where id = 'd1237000-0000-0000-0000-000000000001'),
  'Apoio_Individualizado',
  'R-3 · a segunda gravação igual não muda nada'
);

-- ── recusas ──
select throws_ok(
  $$insert into public.atividades_nao_letivas (codigo, categoria_normativa, escopo, turma_id, data, descricao, subtipo, tempos_consumidos)
    values ('T123-N3', 'AEC', 'turma', 'd1235000-0000-0000-0000-000000000001', '2026-03-05', 'Aula como atividade', 'T123 Aula', 1)$$,
  '23514', 'O tipo «T123 Aula» não tem categoria de atividade.',
  'FR-010 · tipo de uso "aula" é RECUSADO como tipo de atividade'
);
select throws_ok(
  $$insert into public.atividades_nao_letivas (codigo, categoria_normativa, escopo, turma_id, data, descricao, subtipo, tempos_consumidos)
    values ('T123-N4', 'AEC', 'turma', 'd1235000-0000-0000-0000-000000000001', '2026-03-05', 'Sem tipo', 'Tipo que não existe', 1)$$,
  '23514', 'O subtipo «Tipo que não existe» não está na lista de tipos de atividade.',
  'FR-012 · linha nova com subtipo fora da lista é recusada'
);
select lives_ok(
  $$insert into public.config_listas (lista, valor, rotulo_exibicao, metadados) values ('tipos_atividade', 'T123 Aula Dois', 'T123 Aula Dois', '{}')$$,
  'R-3 · tipo SEM categoria é aceito em config_listas (o ETL grava tipos de aula assim)'
);
select throws_ok(
  $$insert into public.config_listas (lista, valor, rotulo_exibicao, metadados) values ('tipos_atividade', 'T123 Ruim', 'T123 Ruim', '{"categoria": "XYZ"}')$$,
  '23514', 'A categoria «XYZ» não é categoria normativa.',
  'R-3 · categoria presente e fora do enum é recusada em config_listas'
);

-- ── a histórica do ETL sem tipo continua, e não ganha tipo num UPDATE ──
insert into public.atividades_nao_letivas (id, codigo, categoria_normativa, escopo, turma_id, data, descricao, subtipo, origem_migracao_v1)
values ('d1237000-0000-0000-0000-000000000005', 'T123-H1', 'TAD', 'turma', 'd1235000-0000-0000-0000-000000000001',
        '2026-03-06', 'Histórica', 'T123 Palestra', 'Registro_Eventos:T123-H1');
select is(
  (select tipo_atividade_id from public.atividades_nao_letivas where id = 'd1237000-0000-0000-0000-000000000005'),
  null,
  'ativ_tipo_obrigatorio · a linha histórica do ETL entra sem tipo (catraca)'
);
update public.atividades_nao_letivas set status = 'inativo' where id = 'd1237000-0000-0000-0000-000000000005';
select is(
  (select (tipo_atividade_id is null, categoria_normativa::text) from public.atividades_nao_letivas where id = 'd1237000-0000-0000-0000-000000000005'),
  (true, 'TAD'::text),
  'R-3 · inativar a histórica não lhe dá tipo nem muda a categoria'
);

-- ── trocar a categoria do tipo recategoriza as ATIVAS (cenário 4 da US2) ──
update public.config_listas set metadados = '{"categoria": "TAD"}' where lista = 'tipos_atividade' and valor = 'T123 Palestra';
insert into public.atividades_nao_letivas (id, codigo, categoria_normativa, escopo, turma_id, data, descricao, subtipo, tempos_consumidos)
values ('d1237000-0000-0000-0000-000000000006', 'T123-N6', 'AEC', 'turma', 'd1235000-0000-0000-0000-000000000001',
        '2026-03-07', 'Palestra', 'T123 Palestra', 1);
update public.config_listas set metadados = '{"categoria": "AEC"}' where lista = 'tipos_atividade' and valor = 'T123 Palestra';
select is(
  (select categoria_normativa::text from public.atividades_nao_letivas where id = 'd1237000-0000-0000-0000-000000000006'),
  'AEC',
  'US2 cenário 4 · trocar a categoria do tipo recategoriza a atividade ativa daquele tipo'
);

-- ── restrições ──
select throws_ok(
  $$insert into public.atividades_nao_letivas (codigo, categoria_normativa, escopo, turma_id, data, descricao, subtipo, tempos_consumidos, quantidade_alunos)
    values ('T123-N7', 'AEC', 'turma', 'd1235000-0000-0000-0000-000000000001', '2026-03-08', 'Palestra', 'T123 Palestra', 1, 3)$$,
  '23514', null,
  'FR-020 · `quantidade_alunos` só no Apoio Individualizado (ativ_alunos_so_apoio)'
);
select throws_ok(
  $$insert into public.atividades_nao_letivas (codigo, categoria_normativa, escopo, turma_id, data, descricao, subtipo, tempos_consumidos)
    values ('T123-N8', 'AEC', 'global', null, '2026-03-08', 'Monitoria global', 'T123 Monitoria', 1)$$,
  '23514', null,
  'FR-018 · Apoio Individualizado é sempre de turma (ativ_estudo_individual_de_turma)'
);
select throws_ok(
  $$insert into public.atividades_nao_letivas (codigo, categoria_normativa, escopo, turma_id, data, descricao, subtipo, tempos_consumidos, bloqueia_aula)
    values ('T123-N9', 'AEC', 'turma', 'd1235000-0000-0000-0000-000000000001', '2026-03-08', 'Palestra', 'T123 Palestra', 1, true)$$,
  '23514', null,
  'FR-025.1 · `bloqueia_aula` só em TR com tipo de parada (ativ_bloqueio_so_tr)'
);

-- ── decisão D-1: a expressão nova reproduz a antiga em toda linha que não é Apoio ──
select is(
  (select count(*)::int from public.atividades_nao_letivas
    where categoria_normativa <> 'Apoio_Individualizado'
      and compoe_cht is distinct from (categoria_normativa <> 'Estudo_Individual')),
  0,
  'Decisão D-1 · `compoe_cht` recriada = expressão antiga em toda linha que não é Apoio'
);
select ok(
  (select generation_expression from information_schema.columns
    where table_schema = 'public' and table_name = 'atividades_nao_letivas' and column_name = 'compoe_cht')
  like '%Apoio_Individualizado%',
  'Decisão D-1 · a expressão gerada de `compoe_cht` cita o Apoio Individualizado'
);

select * from finish();
rollback;
