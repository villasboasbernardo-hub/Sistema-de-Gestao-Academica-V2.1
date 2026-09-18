-- =====================================================================================
-- 020_unicidade.sql — as regras de unicidade, TENTADAS e RECUSADAS
-- Epico 1 · T036 · FR-008 a FR-013 · FR-057 · FR-059
-- -------------------------------------------------------------------------------------
-- "Testar so o caminho valido nao prova nada": uma tabela sem constraint nenhuma passa
-- num teste que apenas insere uma linha. Cada assercao aqui TENTA VIOLAR e ESPERA A
-- RECUSA. E o unico formato que prova que a regra existe.
--
-- Sao as regras que na v2.0 dependiam de conferencia humana ou de uma funcao que alguem
-- tinha de lembrar de chamar. Aqui elas deixam de ser construiveis.
-- =====================================================================================
begin;
select plan(8);

-- ⚠️ POR QUE ESTE ARQUIVO PASSOU A AFIRMAR O NOME DA RESTRICAO, e nao so o SQLSTATE
-- (decisao de Bernardo Villas Boas, 17/09/2026):
--
--   A partir da spec 009 o codigo da turma e FUNCAO DETERMINISTICA de curso, rotulo e ano. Com
--   isso, uma segunda turma que colida em (curso, ano, rotulo) colide TAMBEM em `codigo`, e as
--   DUAS restricoes passam a ser acionaveis pelo mesmo caso. A ordem em que o Postgres as avalia
--   NAO E GARANTIDA, e `23505` sozinho deixou de dizer QUAL regra recusou: se um dia a unicidade
--   por (curso, ano, rotulo) for removida, este teste segue VERDE pelo indice do codigo.
--
--   E a mesma doenca dos seis negativos do `SC-004` no `rls.test.ts`, que passavam pelo motivo
--   errado — la o controle positivo pegou; aqui nao existe controle que distinga. Por isso a
--   assercao nomeia a restricao.
create function pg_temp.restricao_violada(p_sql text) returns text
language plpgsql as $f$
declare
  v_restricao text;
begin
  execute p_sql;
  return '(nao houve recusa)';
exception when others then
  get stacked diagnostics v_restricao = constraint_name;
  return sqlstate || ' · ' || coalesce(nullif(v_restricao, ''), '(sem nome de restricao)');
end;
$f$;

insert into public.cursos (id, codigo, nome_curso, classificacao, modalidade, duracao_dias) values
  ('11111111-0000-0000-0000-000000000001', 'UNI-A', 'Curso Unicidade A', 'regular', 'presencial', 30),
  ('11111111-0000-0000-0000-000000000002', 'UNI-B', 'Curso Unicidade B', 'expedito', 'presencial', 10);

-- A TURMA VEM ANTES DAS DISCIPLINAS (spec 009, T003 / A-2). A partir da migration 4 desta fatia,
-- criar turma faz nascer uma linha de `turma_disciplina` por disciplina ATIVA do curso (FR-032.2).
-- Com a disciplina criada antes, a linha nasceria sozinha e o insert explicito da assercao de
-- FR-011, abaixo, colidiria com `uq_turma_disciplina_ativo` FORA de qualquer assercao. Trocando a
-- ordem, o curso ainda nao tem disciplina quando a turma nasce, e a grade continua sendo montada
-- pelo proprio teste — que e o que as duas assercoes de FR-011 provam.
insert into public.turmas (id, codigo, curso_id, turma, ano_letivo, status, modalidade) values
  ('33333333-0000-0000-0000-000000000001', 'UNI-A T1 2026', '11111111-0000-0000-0000-000000000001', 'T1', 2026, 'ativa', 'presencial');

insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos) values
  ('22222222-0000-0000-0000-000000000001', 'UNI-A-MAT', '11111111-0000-0000-0000-000000000001', 'MAT', 'Matematica A', 40);

insert into public.instrutores (id, codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om) values
  ('44444444-0000-0000-0000-000000000001', 'UNI-INS-1', 'CC', 'AA', 'Instrutor Unicidade', 'Militar', 'CIAARA');

-- FR-008 / RN-MAT-02 / RF-DADOS-06 — codigo de disciplina unico DENTRO DO CURSO.
-- Generico para qualquer curso: encerra o contorno especifico do C-Ap-FR, que nao pegou a
-- duplicata equivalente encontrada no C-Esp-ALH na auditoria de 31/07/2026.
select throws_ok(
  $$insert into public.disciplinas (codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos)
    values ('UNI-A-MAT-DUP', '11111111-0000-0000-0000-000000000001', 'MAT', 'Matematica duplicada', 20)$$,
  '23505',
  null,
  'RN-MAT-02 · duas disciplinas com o mesmo codigo no MESMO curso sao recusadas'
);

-- E o contraponto que prova que a regra e por CURSO, nao global: o mesmo codigo em outro
-- curso e legitimo, e recusa-lo seria mudar a regra.
select lives_ok(
  $$insert into public.disciplinas (codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos)
    values ('UNI-B-MAT', '11111111-0000-0000-0000-000000000002', 'MAT', 'Matematica B', 40)$$,
  'RN-MAT-02 · o mesmo codigo em OUTRO curso e aceito — a unicidade e por curso'
);

-- FR-009 — uma turma por curso, rotulo e ano letivo.
-- ⚠️ MEDIDO EM 17/09/2026, E CONTRARIA A EXPECTATIVA: por INSERCAO, quem recusa e
-- `turmas_codigo_key`, nao `turmas_unica_por_ano`. Com o codigo sendo funcao deterministica de
-- curso, rotulo e ano, duas turmas que colidem em (curso, ano, rotulo) colidem TAMBEM no codigo, e
-- o indice do codigo — criado antes — e avaliado primeiro. A assercao diz o nome VERDADEIRO.
select is(
  pg_temp.restricao_violada(
    $$insert into public.turmas (codigo, curso_id, turma, ano_letivo, status, modalidade)
      values ('UNI-A T1 2026', '11111111-0000-0000-0000-000000000001', 'T1', 2026, 'planejada', 'presencial')$$
  ),
  '23505 · turmas_codigo_key',
  'FR-009 · turma repetida por INSERCAO e recusada por turmas_codigo_key — o codigo ja carrega curso, rotulo e ano'
);

-- ⚠️ E ESTA E A QUE FECHA O BURACO. Se a assercao acima fosse a unica, remover a unicidade por
-- (curso, ano, rotulo) deixaria o arquivo VERDE, porque o indice do codigo continuaria recusando.
-- Pela EDICAO a ordem se inverte: o codigo NUNCA muda (FR-025.1 da spec 009), entao mudar o rotulo
-- de T2 para T1 colide so em (curso, ano, rotulo) — e quem recusa e `turmas_unica_por_ano`, pelo
-- nome. Os quatro caminhos de colisao estao no `101_turma_codigo_e_rotulo.sql`.
insert into public.turmas (codigo, curso_id, turma, ano_letivo, status, modalidade) values
  ('UNI-A T2 2026', '11111111-0000-0000-0000-000000000001', 'T2', 2026, 'planejada', 'presencial');
select is(
  pg_temp.restricao_violada(
    $$update public.turmas set turma = 'T1' where codigo = 'UNI-A T2 2026'$$
  ),
  '23505 · turmas_unica_por_ano',
  'FR-009 · mudar o rotulo para um ja ocupado e recusado por turmas_unica_por_ano — a regra tem prova propria'
);

-- FR-010 — uma habilitacao por instrutor e disciplina. Habilitacao, nao atribuicao:
-- confundir as tres formas foi o defeito que a spec 034 da v2.0 corrigiu.
insert into public.instrutor_disciplina (codigo, instrutor_id, disciplina_id)
  values ('VIN-UNI-1', '44444444-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001');
select throws_ok(
  $$insert into public.instrutor_disciplina (codigo, instrutor_id, disciplina_id)
    values ('VIN-UNI-2', '44444444-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001')$$,
  '23505',
  null,
  'FR-010 · o mesmo instrutor habilitado duas vezes na mesma disciplina e recusado'
);

-- FR-011 / LIQ-1 — uma linha de grade por turma e disciplina.
insert into public.turma_disciplina (codigo, turma_id, disciplina_id)
  values ('TD-UNI-1', '33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001');
select throws_ok(
  $$insert into public.turma_disciplina (codigo, turma_id, disciplina_id)
    values ('TD-UNI-2', '33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001')$$,
  '23505',
  null,
  'FR-011 · a mesma disciplina duas vezes na grade da mesma turma e recusada (LIQ-1)'
);

-- FR-021 — numeracao de unidade unica dentro da disciplina.
insert into public.unidades_ensino (codigo, disciplina_id, curso_id, numero_ue, topico, ch_prevista_tempos)
  values ('UNI-A-MAT-UE1', '22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 1, 'Unidade 1', 20);
select throws_ok(
  $$insert into public.unidades_ensino (codigo, disciplina_id, curso_id, numero_ue, topico, ch_prevista_tempos)
    values ('UNI-A-MAT-UE1-DUP', '22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 1, 'Unidade repetida', 20)$$,
  '23505',
  null,
  'FR-021 · duas unidades com o mesmo numero na mesma disciplina sao recusadas'
);

-- FR-025 — e o contraponto: numeracao NAO precisa ser contigua. Um curriculo pode saltar
-- numeros, e recusar isso rejeitaria dado normativo correto. Guarda deliberada.
select lives_ok(
  $$insert into public.unidades_ensino (codigo, disciplina_id, curso_id, numero_ue, topico, ch_prevista_tempos)
    values ('UNI-A-MAT-UE7', '22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 7, 'Unidade com lacuna antes', 20)$$,
  'FR-025 · lacuna na numeracao e aceita — o curriculo pode numerar com salto'
);

select * from finish();
rollback;
