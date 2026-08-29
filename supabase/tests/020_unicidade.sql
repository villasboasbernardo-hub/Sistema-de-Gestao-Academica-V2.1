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
select plan(7);

insert into public.cursos (id, codigo, nome_curso, classificacao) values
  ('11111111-0000-0000-0000-000000000001', 'UNI-A', 'Curso Unicidade A', 'regular'),
  ('11111111-0000-0000-0000-000000000002', 'UNI-B', 'Curso Unicidade B', 'expedito');

insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos) values
  ('22222222-0000-0000-0000-000000000001', 'UNI-A-MAT', '11111111-0000-0000-0000-000000000001', 'MAT', 'Matematica A', 40);

insert into public.turmas (id, codigo, curso_id, turma, ano_letivo, status) values
  ('33333333-0000-0000-0000-000000000001', 'UNI-A 2026 T1', '11111111-0000-0000-0000-000000000001', 'T1', 2026, 'ativa');

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
select throws_ok(
  $$insert into public.turmas (codigo, curso_id, turma, ano_letivo, status)
    values ('UNI-A 2026 T1 DUP', '11111111-0000-0000-0000-000000000001', 'T1', 2026, 'planejada')$$,
  '23505',
  null,
  'FR-009 · turma repetida no mesmo curso e ano letivo e recusada'
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
