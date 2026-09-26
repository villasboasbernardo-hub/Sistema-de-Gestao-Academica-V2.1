-- =================================================================================
-- 107 — A exclusao permanente de disciplina e de UE, com porteiro e RASTRO
--
-- O QUE  : prova a decisao D-B1 (Bernardo Villas Boas, 24/09/2026) pelos dois lados —
--          recusa com CADA UM dos seis impedimentos da disciplina e com aula na UE;
--          sucesso so para o registro limpo; e o rastro gravado com quem, o que e quando.
--          `FR-020` a `FR-024` da spec 010.
--
-- ⚠️ A SESSAO E SIMULADA COMO O POSTGREST FAZ (`request.jwt.claim.sub`), e isso serve para
--    AUDITORIA e porteiro, NUNCA para autorizacao: a prova de "quem pode o que" mora em
--    `tests/invariantes/rls/disciplinas.test.ts`, com sessao autenticada de verdade. O
--    pgTAP roda como dono do schema, e sob privilegio de dono a RLS nao se aplica.
--
-- ⚠️ O IMPEDIMENTO `aula_lancada` E CONFERIDO PELOS DOIS CAMINHOS, e o segundo (asserção 8)
--    e o que pega o furo real: a aula historica alcanca a disciplina por
--    `registros_aula.disciplina_codigo_legado_v1`, que NAO E FK. Sem ele, uma disciplina
--    com 100 aulas seria excluivel — medido: 1.566 de 1.566 aulas casam por esse texto.
--
-- ⚠️ A ASSERCAO 12 e a que prova que a excecao NAO ABRE PORTA: continua havendo zero
--    policy de DELETE e zero privilegio de DELETE para `authenticated`, agora tambem nas
--    duas tabelas novas.
-- =================================================================================
begin;
select plan(13);

insert into auth.users (id, email, aud, role) values
  ('a7000000-0000-0000-0000-000000000001', 't107-admin@ciaara.teste', 'authenticated', 'authenticated');

insert into public.usuarios (codigo, auth_user_id, email, nome, perfil) values
  ('T107-USR-ADM', 'a7000000-0000-0000-0000-000000000001', 't107-admin@ciaara.teste', 'Admin T107', 'admin');

insert into public.cursos (id, codigo, nome_curso, classificacao, modalidade, duracao_dias) values
  ('a7200000-0000-0000-0000-000000000001', 'T107-CUR', 'Curso T107', 'regular', 'presencial', 30);

insert into public.curso_regime_historico
  (curso_id, tipo_regime, regime_tempos, ta_duracao_min, intervalo_manha_min,
   intervalo_tarde_min, hora_inicio_manha, hora_inicio_tarde, vigente_de)
values
  ('a7200000-0000-0000-0000-000000000001', 'padrao', 8, 45, 10, 10, '07:30', '13:30', '2020-01-01');

-- ⚠️ A TURMA VEM ANTES DAS DISCIPLINAS: criar turma faz nascer uma linha de
--    `turma_disciplina` por disciplina ATIVA do curso (`FR-032.2` da spec 009). Com a
--    disciplina antes, a linha nasceria sozinha e a insercao explicita colidiria.
insert into public.turmas (id, codigo, curso_id, turma, ano_letivo, status, modalidade,
                           data_inicio, data_termino)
values ('a7500000-0000-0000-0000-000000000001', 'T107-CUR T1 2026',
        'a7200000-0000-0000-0000-000000000001', 'T1', 2026, 'planejada', 'presencial',
        '2026-03-02', '2026-06-30');

insert into public.instrutores (id, codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om) values
  ('a7100000-0000-0000-0000-000000000001', 'T107-INS', 'CT', '-EF', 'Instrutor T107', 'Militar', 'CIAARA');

-- Seis disciplinas, cada uma com EXATAMENTE UM impedimento, e uma limpa.
insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos) values
  ('a7300000-0000-0000-0000-000000000000', 'T107-LIMPA',  'a7200000-0000-0000-0000-000000000001', 'L',  'Disciplina limpa',       10),
  ('a7300000-0000-0000-0000-000000000001', 'T107-TURMA',  'a7200000-0000-0000-0000-000000000001', 'I',  'Com linha de turma',     10),
  ('a7300000-0000-0000-0000-000000000002', 'T107-VINC',   'a7200000-0000-0000-0000-000000000001', 'II', 'Com vinculo',            10),
  ('a7300000-0000-0000-0000-000000000003', 'T107-AVAL',   'a7200000-0000-0000-0000-000000000001', 'III','Com avaliacao',          10),
  ('a7300000-0000-0000-0000-000000000004', 'T107-UE',     'a7200000-0000-0000-0000-000000000001', 'IV', 'Com unidade de ensino',  10),
  ('a7300000-0000-0000-0000-000000000005', 'T107-LEGADO', 'a7200000-0000-0000-0000-000000000001', 'V',  'Com aula historica',     10);

-- O impedimento de cada uma
insert into public.turma_disciplina (turma_id, disciplina_id, origem_periodo)
values ('a7500000-0000-0000-0000-000000000001', 'a7300000-0000-0000-0000-000000000001', 'nao_informado');

insert into public.instrutor_disciplina (instrutor_id, disciplina_id)
values ('a7100000-0000-0000-0000-000000000001', 'a7300000-0000-0000-0000-000000000002');

-- ⚠️ `tipo_avaliacao` e conferido contra `config_listas`, que nasce VAZIA no `db:reset` —
--    o vocabulario e semeado pela carga do ETL. A amostra semeia o que usa, como qualquer
--    amostra faz com o dado de que depende; sem isto o arquivo passa na base carregada e
--    reprova na limpa, que e o pior modo de falha possivel.
insert into public.config_listas (lista, valor, rotulo_exibicao, ordem)
select v.lista, v.valor, v.valor, 1
  from (values ('tipos_avaliacao', 'Prova Escrita'),
               ('tipos_atividade', 'Aula Teórica')) as v(lista, valor)
 where not exists (select 1 from public.config_listas c
                    where c.lista = v.lista and c.valor = v.valor);

insert into public.avaliacoes
  (codigo, turma_id, disciplina_id, curso_id, tipo_avaliacao, data_avaliacao, instrutor_responsavel_id)
values ('T107-AVL', 'a7500000-0000-0000-0000-000000000001', 'a7300000-0000-0000-0000-000000000003',
        'a7200000-0000-0000-0000-000000000001', 'Prova Escrita', '2026-04-01',
        'a7100000-0000-0000-0000-000000000001');

insert into public.unidades_ensino (id, disciplina_id, curso_id, numero_ue, topico, ch_prevista_tempos)
values ('a7400000-0000-0000-0000-000000000001', 'a7300000-0000-0000-0000-000000000004',
        'a7200000-0000-0000-0000-000000000001', 1, 'UE que impede a exclusao', 10),
       ('a7400000-0000-0000-0000-000000000002', 'a7300000-0000-0000-0000-000000000000',
        'a7200000-0000-0000-0000-000000000001', 1, 'UE limpa, sem aula', 10);

-- A aula historica: alcanca a disciplina SO pelo texto do codigo legado, que nao e FK.
insert into public.registros_aula
  (codigo, data, turma_id, curso_id, instrutor_id, categoria_normativa, tipo_atividade,
   tempos_consumidos, disciplina_codigo_legado_v1, origem_migracao_v1)
values ('T107-REG', '2026-04-02', 'a7500000-0000-0000-0000-000000000001',
        'a7200000-0000-0000-0000-000000000001', 'a7100000-0000-0000-0000-000000000001',
        'aula', 'Aula Teórica', 4, 'T107-LEGADO', 'v20:T107');

select set_config('request.jwt.claim.sub', 'a7000000-0000-0000-0000-000000000001', true);

-- -- 1 a 5 — cada impedimento recusa, com `23503`
select throws_ok(
  $$select app.excluir_disciplina('a7300000-0000-0000-0000-000000000001', 'T107-TURMA')$$,
  '23503',
  null,
  'FR-022 · disciplina com linha de turma e recusada'
);
select throws_ok(
  $$select app.excluir_disciplina('a7300000-0000-0000-0000-000000000002', 'T107-VINC')$$,
  '23503',
  null,
  'FR-022 · disciplina com vinculo de habilitacao e recusada'
);
select throws_ok(
  $$select app.excluir_disciplina('a7300000-0000-0000-0000-000000000003', 'T107-AVAL')$$,
  '23503',
  null,
  'FR-022 · disciplina com avaliacao e recusada'
);
select throws_ok(
  $$select app.excluir_disciplina('a7300000-0000-0000-0000-000000000004', 'T107-UE')$$,
  '23503',
  null,
  'FR-022 · disciplina com unidade de ensino e recusada'
);
select throws_ok(
  $$select app.excluir_disciplina('a7300000-0000-0000-0000-000000000005', 'T107-LEGADO')$$,
  '23503',
  null,
  'FR-022 · disciplina com aula historica (codigo legado, que NAO e FK) e recusada — A-11'
);

-- -- 6 — a lista de impedimentos nomeia o que prende
select is(
  (select app.impedimentos_de_exclusao_da_disciplina('a7300000-0000-0000-0000-000000000005')),
  array['aula_lancada'],
  'FR-022 · a lista nomeia o impedimento, e e ela que a tela traduz'
);

-- -- 7 — codigo de confirmacao errado recusa ANTES de qualquer outra coisa
select throws_ok(
  $$select app.excluir_disciplina('a7300000-0000-0000-0000-000000000000', 'CODIGO-ERRADO')$$,
  '22023',
  null,
  'FR-023 · codigo de confirmacao que nao confere recusa com 22023'
);

-- -- 8 e 9 — a disciplina LIMPA: a UE dela sai primeiro, depois ela
select lives_ok(
  $$select app.excluir_unidade_ensino('a7400000-0000-0000-0000-000000000002',
      (select codigo from public.unidades_ensino where id = 'a7400000-0000-0000-0000-000000000002'))$$,
  'FR-020 · UE sem aula lancada e excluida'
);

select lives_ok(
  $$select app.excluir_disciplina('a7300000-0000-0000-0000-000000000000', 'T107-LIMPA')$$,
  'FR-020 · disciplina sem dependente nenhum e excluida'
);

-- -- 10 — o RASTRO: quem, o que e quando, com o retrato
select is(
  (select count(*)::int from public.exclusoes_registradas
    where registro_codigo in ('T107-LIMPA')
      and tabela = 'disciplinas'
      and excluido_por = 'a7000000-0000-0000-0000-000000000001'
      and retrato ->> 'cod_disciplina' = 'L'),
  1,
  'FR-024 · a exclusao deixou rastro com quem, o que, quando e o retrato da linha'
);

-- -- 11 — UE com aula NUNCA e excluida
insert into public.unidades_ensino (id, disciplina_id, curso_id, numero_ue, topico, ch_prevista_tempos)
values ('a7400000-0000-0000-0000-000000000003', 'a7300000-0000-0000-0000-000000000005',
        'a7200000-0000-0000-0000-000000000001', 1, 'UE com aula', 10);
update public.registros_aula
   set unidade_ensino_id = 'a7400000-0000-0000-0000-000000000003'
 where codigo = 'T107-REG';

select throws_ok(
  $$select app.excluir_unidade_ensino('a7400000-0000-0000-0000-000000000003',
      (select codigo from public.unidades_ensino where id = 'a7400000-0000-0000-0000-000000000003'))$$,
  '23503',
  null,
  'FR-022 · UE com aula lancada NUNCA e excluida — so desativada (UE-1)'
);

-- -- 12 — o rastro e SO DE ACRESCIMO, inclusive para quem tem privilegio
select throws_ok(
  $$update public.exclusoes_registradas set registro_codigo = 'OUTRO'$$,
  '42501',
  null,
  'Q-09 · `exclusoes_registradas` recusa UPDATE — rastro nao se reescreve'
);

-- -- 13 — a excecao NAO abriu porta nenhuma na RLS
select is(
  (select count(*)::int from pg_policy where polcmd = 'd')
  + (select count(*)::int from information_schema.role_table_grants
      where table_schema = 'public' and grantee = 'authenticated' and privilege_type = 'DELETE'),
  0,
  'regra 4 · continua havendo ZERO policy de DELETE e ZERO privilegio de DELETE para authenticated'
);

select * from finish();
rollback;
