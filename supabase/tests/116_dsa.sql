-- =====================================================================================
-- 116_dsa.sql — o banco do DSA: lancamento sem UE, o Estudo Individual, o responsavel,
--               a atividade global na grade e o conflito entre turmas
-- Epico 6 · spec 013-detalhe-semanal-de-aula · PR B
-- -------------------------------------------------------------------------------------
-- ⚠️ **ESTE ARQUIVO PROVA ESTRUTURA E REGRA DE BANCO, NAO PERMISSAO.** Ele roda como DONO do
--    schema, e sob privilegio de dono a RLS nao se aplica — uma assercao de "este perfil pode
--    / nao pode" escrita aqui passaria com a RLS DESLIGADA. Quem prova quem pode o que e
--    `tests/invariantes/rls/dsa.test.ts`, com sessao autenticada de verdade (DoD 4).
--
-- ⚠️ **MAS A RECUSA DE `public.conflitos_da_semana` E PROVAVEL AQUI, e por um motivo que vale
--    dizer:** ela nao e de RLS. Ela mora DENTRO da funcao, que e `SECURITY DEFINER`, e a
--    funcao levanta por conta propria para quem quer que a chame. Rodar como dono e o caso
--    mais forte — se o dono e barrado, todo mundo e. E e o pgTAP que roda **sem sessao**, que
--    foi quem pegou o gotcha 15 em 03/10/2026.
--
-- ⚠️ **DOIS `coalesce(..., false)` DESTA FATIA NAO SAO LOAD-BEARING, E ISSO ESTA ESCRITO EM VEZ
--    DE ALEGADO AO CONTRARIO (DoD 8).** Medido em 05/10/2026, sem sessao: `app.pode` e
--    `app.alcanca_turma` devolvem **`false` explicito**, nao NULL — entao o porteiro do
--    conflito falharia fechado com `if not` tambem, e a assercao do `42501` **nao discrimina**
--    a forma. **Ja o `coalesce` de `app.disciplina_sem_ue` SEGURA ALGO, e eu errei na primeira
--    redacao deste cabecalho:** eu afirmei que a FK composta recusaria a disciplina
--    inexistente primeiro, com `23503`. **Medido: quem recusa e o CHECK, com `23514`**, porque
--    CHECK de linha roda **antes** da integridade referencial (que e gatilho AFTER ROW). Sem o
--    `coalesce` o CHECK aprovaria a linha e deixaria a recusa para a FK — e um CHECK que
--    aprova disciplina inexistente mente sobre o que confere.
--
-- ⚠️ **O QUE DISCRIMINA DE VERDADE AQUI SAO QUATRO CASOS**, e cada um pega uma coisa que
--    nenhuma outra assercao pega:
--      · a disciplina **NAO isenta** sem UE e RECUSADA. Sem ele, a isencao da Q-1 valeria
--        para todo curso e a catraca da regra 4 estaria afrouxada em geral, com as 1.566
--        linhas historicas passando a aceitar edicao sem UE.
--      · a aula **sem UE** aparece na grade. Com o `JOIN` interno de antes ela desaparecia da
--        `vw_ocupacao_ta` sem erro nenhum (gotcha 4 na forma de view).
--      · a atividade **global** aparece na grade (V-7). Com o `turma_id is not null` de volta
--        ela nao chega a DSA nenhum, e a `RF-EXTRA-03` fica afirmada e nao cumprida.
--      · a aula **com UE** continua contando pela UE. E a nao regressao: sem ele, o `coalesce`
--        da view poderia trocar a fonte da disciplina sem ninguem notar.
-- =====================================================================================
begin;
select plan(67);

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- A AMOSTRA — dois cursos, porque a isencao e NOMINAL e so se prova com o contraste
-- ⚠️ Identificadores fixos sao aceitaveis aqui porque o arquivo inteiro vive numa transacao
--    DESFEITA; a regra 9.1 cobra geracao em amostra que PERSISTE. Nada abaixo mexe em
--    sequencia (gotcha 6).
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- Curso COMUM: `curriculo_modelo` fica no padrao `unidades_de_ensino`.
insert into public.cursos (id, codigo, nome_curso, classificacao, modalidade, duracao_dias) values
  ('d1160000-0000-0000-0000-000000000001', 'T116-UE', 'Curso por unidades', 'regular', 'presencial', 30),
  ('d1160000-0000-0000-0000-000000000002', 'T116-COMP', 'Curso por competencias', 'regular', 'presencial', 30);

-- E o segundo e POR COMPETENCIAS — um dos dois eixos da isencao.
update public.cursos set curriculo_modelo = 'competencias'
 where id = 'd1160000-0000-0000-0000-000000000002';

insert into public.turmas (id, codigo, curso_id, turma, ano_letivo, status, modalidade,
                           data_inicio, data_termino) values
  ('d1165000-0000-0000-0000-000000000001', 'T116-UE T1 2026',
   'd1160000-0000-0000-0000-000000000001', 'T1', 2026, 'ativa', 'presencial', '2026-03-02', '2026-06-30'),
  ('d1165000-0000-0000-0000-000000000002', 'T116-COMP T1 2026',
   'd1160000-0000-0000-0000-000000000002', 'T1', 2026, 'ativa', 'presencial', '2026-03-02', '2026-06-30');

insert into public.instrutores (id, codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om) values
  ('d1161000-0000-0000-0000-000000000001', 'T116-CT', 'CT', '-EF', 'Instrutor do 116', 'Militar', 'CIAARA');

insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina,
                                carga_horaria_tempos) values
  -- A1: comum. NAO isenta: e ela que prova que a isencao e delimitada.
  ('d1163000-0000-0000-0000-000000000001', 'T116-D-COMUM', 'd1160000-0000-0000-0000-000000000001',
   'I', 'Disciplina comum, com UE', 10),
  -- A2: mesmo curso, mas marcada `sem_unidades_ensino` — o SEGUNDO eixo da isencao.
  ('d1163000-0000-0000-0000-000000000002', 'T116-D-SEMUE', 'd1160000-0000-0000-0000-000000000001',
   'II', 'Disciplina sem unidades', 10),
  -- B1: curso por competencias — o PRIMEIRO eixo.
  ('d1163000-0000-0000-0000-000000000003', 'T116-D-COMP', 'd1160000-0000-0000-0000-000000000002',
   'I', 'Disciplina de curso por competencias', 10);

update public.disciplinas set sem_unidades_ensino = true
 where id = 'd1163000-0000-0000-0000-000000000002';

insert into public.unidades_ensino (id, disciplina_id, curso_id, numero_ue, topico, ch_prevista_tempos) values
  ('d1164000-0000-0000-0000-000000000001', 'd1163000-0000-0000-0000-000000000001',
   'd1160000-0000-0000-0000-000000000001', 1, 'Primeira unidade do 116', 4);

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- A · A DISCIPLINA NA LINHA (Q-1)
-- ═══════════════════════════════════════════════════════════════════════════════════════

select has_column('public', 'registros_aula', 'disciplina_id',
  'Q-1 · `registros_aula.disciplina_id` existe — sem ela nao ha onde dizer de que disciplina e a aula sem UE');

select col_is_null('public', 'registros_aula', 'disciplina_id',
  'Q-1 · ela e ANULAVEL: nula e o caso normal, em que a UE e a fonte da disciplina');

-- ⚠️ FK COMPOSTA, espelhando a `reg_aula_ue_do_curso`: e a `RN-MAT-01` virada estrutura.
select is(
  (select pg_get_constraintdef(oid) from pg_constraint
    where conrelid = 'public.registros_aula'::regclass and conname = 'reg_aula_disciplina_do_curso'),
  'FOREIGN KEY (disciplina_id, curso_id) REFERENCES disciplinas(id, curso_id) ON DELETE RESTRICT',
  'RN-MAT-01 · a FK e COMPOSTA com `curso_id` — a aula nao aponta para disciplina de outro curso'
);

select ok(
  (select count(*) > 0 from pg_indexes
    where schemaname = 'public' and indexname = 'idx_registros_aula_disciplina'),
  'Q-1 · ha indice parcial em `disciplina_id` — a grade filtra por ele em toda semana'
);

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- B · O PORTEIRO DA ISENCAO
-- ═══════════════════════════════════════════════════════════════════════════════════════

select has_function('app', 'disciplina_sem_ue', array['uuid'],
  'Q-1 · `app.disciplina_sem_ue(uuid)` existe — e o unico lugar que decide quem e isento');

-- ⚠️ A ASSERCAO QUE MAIS IMPORTA DESTE BLOCO. Com `invoker`, a funcao leria `disciplinas` e
--    `cursos` sob a RLS de quem insere, e o CHECK passaria a depender de PERMISSAO: a mesma
--    linha valida para o Admin e invalida para um Operador de alcance recortado, recusada com
--    `23514` em vez de erro de permissao. CHECK deve ser fato sobre a linha.
select ok(
  (select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app' and p.proname = 'disciplina_sem_ue'),
  'Q-1 · ela e SECURITY DEFINER — um CHECK que le sob a RLS de quem insere dependeria de permissao'
);

select is(
  (select p.provolatile::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app' and p.proname = 'disciplina_sem_ue'),
  's',
  'Q-1 · ela e STABLE — le tabela, entao nao pode ser IMMUTABLE, e VOLATILE a tiraria do CHECK'
);

select is_empty($$
  select routine_name from information_schema.routine_privileges
   where routine_schema = 'app' and routine_name = 'disciplina_sem_ue' and grantee in ('anon', 'PUBLIC')
$$, 'Q-1 · `anon` nao executa o porteiro da isencao');

-- ⚠️ Gotcha 5.1: a expressao do CHECK e avaliada com os direitos de QUEM GRAVA, mesmo sendo a
--    funcao DEFINER. Sem este grant, todo lancamento de usuario autenticado falharia com
--    `permission denied for function` — e o erro aponta para a funcao, nao para a coluna.
select ok(
  (select count(*) > 0 from information_schema.routine_privileges
    where routine_schema = 'app' and routine_name = 'disciplina_sem_ue'
      and grantee = 'authenticated' and privilege_type = 'EXECUTE'),
  'Q-1 · `authenticated` EXECUTA — sem isso o CHECK derruba a gravacao com erro de funcao (gotcha 5.1)'
);

select is(app.disciplina_sem_ue('d1163000-0000-0000-0000-000000000003'), true,
  'Q-1 · disciplina de curso por COMPETENCIAS e isenta — o primeiro eixo');

select is(app.disciplina_sem_ue('d1163000-0000-0000-0000-000000000002'), true,
  'Q-1 · disciplina marcada `sem_unidades_ensino` e isenta — o segundo eixo');

-- ⚠️ O CONTRASTE: mesma tabela, mesmo curso da anterior, e NAO isenta.
select is(app.disciplina_sem_ue('d1163000-0000-0000-0000-000000000001'), false,
  'Q-1 · disciplina comum NAO e isenta — a isencao e nominal, nao geral');

-- ⚠️ O NULL medido, que e a razao de todo chamador usar `coalesce`.
select is(app.disciplina_sem_ue('00000000-0000-0000-0000-0000000000ff'), null,
  'Q-1 · disciplina inexistente devolve NULL — e `CHECK` passa em NULL (gotcha 15)');

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- C · UE **OU** DISCIPLINA-COM-TOPICO, e a catraca com UMA isencao delimitada
-- ═══════════════════════════════════════════════════════════════════════════════════════

select ok(
  (select pg_get_constraintdef(oid) ~ 'disciplina_sem_ue' from pg_constraint
    where conrelid = 'public.registros_aula'::regclass and conname = 'reg_aula_ue_so_nula_no_historico'),
  'Q-1 · a catraca ganhou a isencao por `app.disciplina_sem_ue` — e NAO foi afrouxada em geral'
);

select ok(
  (select pg_get_constraintdef(oid) ~* 'coalesce' from pg_constraint
    where conrelid = 'public.registros_aula'::regclass and conname = 'reg_aula_ue_so_nula_no_historico'),
  'H3 · a catraca envolve a funcao em `coalesce(..., false)` — CHECK passa em NULL'
);

select ok(
  (select pg_get_constraintdef(oid) ~* 'coalesce' from pg_constraint
    where conrelid = 'public.registros_aula'::regclass and conname = 'reg_aula_ue_ou_disciplina'),
  'H3 · o CHECK do topico tambem usa `coalesce` — a mesma guarda nos dois'
);

select ok(
  (select count(*) = 1 from pg_constraint
    where conrelid = 'public.registros_aula'::regclass and conname = 'reg_aula_ue_xor_disciplina'),
  'Q-1 · ha CHECK de exclusividade — UMA fonte para a disciplina, nunca duas'
);

-- A aula normal, com UE, continua passando: a fatia nao mexeu no caminho de sempre.
select lives_ok($$
  insert into public.registros_aula
    (codigo, data, turma_id, curso_id, unidade_ensino_id, instrutor_id, tempos_consumidos, ta_inicial)
  values ('T116-REG-001', '2026-03-03', 'd1165000-0000-0000-0000-000000000001',
          'd1160000-0000-0000-0000-000000000001', 'd1164000-0000-0000-0000-000000000001',
          'd1161000-0000-0000-0000-000000000001', 2, 1)
$$, 'RF-DSA-04 · a aula COM UE continua sendo aceita — o caminho de sempre nao mudou');

-- O lancamento da Q-1: disciplina isenta + topico.
select lives_ok($$
  insert into public.registros_aula
    (codigo, data, turma_id, curso_id, disciplina_id, instrutor_id, tempos_consumidos,
     ta_inicial, conteudo_resumo)
  values ('T116-REG-002', '2026-03-04', 'd1165000-0000-0000-0000-000000000002',
          'd1160000-0000-0000-0000-000000000002', 'd1163000-0000-0000-0000-000000000003',
          'd1161000-0000-0000-0000-000000000001', 2, 1, 'Competencia X, trecho A')
$$, 'Q-1 · aula SEM UE com disciplina isenta e TOPICO e aceita — e o lancamento que a fatia abre');

-- ⚠️ O TOPICO E OBRIGATORIO: sem UE, `conteudo_resumo` e o unico lugar que diz o que foi dado.
select throws_ok($$
  insert into public.registros_aula
    (codigo, data, turma_id, curso_id, disciplina_id, instrutor_id, tempos_consumidos, ta_inicial)
  values ('T116-REG-003', '2026-03-05', 'd1165000-0000-0000-0000-000000000002',
          'd1160000-0000-0000-0000-000000000002', 'd1163000-0000-0000-0000-000000000003',
          'd1161000-0000-0000-0000-000000000001', 2, 1)
$$, '23514', null,
  'Q-1 · aula sem UE e SEM topico e RECUSADA — o topico e o que substitui a UE');

-- E topico em branco nao vale por topico.
select throws_ok($$
  insert into public.registros_aula
    (codigo, data, turma_id, curso_id, disciplina_id, instrutor_id, tempos_consumidos,
     ta_inicial, conteudo_resumo)
  values ('T116-REG-004', '2026-03-05', 'd1165000-0000-0000-0000-000000000002',
          'd1160000-0000-0000-0000-000000000002', 'd1163000-0000-0000-0000-000000000003',
          'd1161000-0000-0000-0000-000000000001', 2, 1, '   ')
$$, '23514', null,
  'Q-1 · topico so com espaco e RECUSADO — `btrim` antes de medir');

-- ⚠️⚠️ **O CASO QUE DISCRIMINA A DELIMITACAO DA ISENCAO.** Sem ele, a isencao valeria para
--      todo curso e a catraca da regra 4 estaria afrouxada em geral.
select throws_ok($$
  insert into public.registros_aula
    (codigo, data, turma_id, curso_id, disciplina_id, instrutor_id, tempos_consumidos,
     ta_inicial, conteudo_resumo)
  values ('T116-REG-005', '2026-03-06', 'd1165000-0000-0000-0000-000000000001',
          'd1160000-0000-0000-0000-000000000001', 'd1163000-0000-0000-0000-000000000001',
          'd1161000-0000-0000-0000-000000000001', 2, 3, 'Tem topico, mas nao e isenta')
$$, '23514', null,
  'Q-1 · disciplina NAO isenta sem UE e RECUSADA, mesmo com topico — a isencao e SO competencias/sem_unidades_ensino'
);

-- UE e disciplina juntas: a exclusividade.
select throws_ok($$
  insert into public.registros_aula
    (codigo, data, turma_id, curso_id, unidade_ensino_id, disciplina_id, instrutor_id,
     tempos_consumidos, ta_inicial)
  values ('T116-REG-006', '2026-03-09', 'd1165000-0000-0000-0000-000000000001',
          'd1160000-0000-0000-0000-000000000001', 'd1164000-0000-0000-0000-000000000001',
          'd1163000-0000-0000-0000-000000000002', 'd1161000-0000-0000-0000-000000000001', 2, 1)
$$, '23514', null,
  'Q-1 · UE e disciplina na MESMA linha e recusado — duas fontes para a disciplina e segunda verdade');

-- Nem UE nem disciplina, em linha NOVA: a catraca de sempre.
select throws_ok($$
  insert into public.registros_aula
    (codigo, data, turma_id, curso_id, instrutor_id, tempos_consumidos, ta_inicial)
  values ('T116-REG-007', '2026-03-10', 'd1165000-0000-0000-0000-000000000001',
          'd1160000-0000-0000-0000-000000000001', 'd1161000-0000-0000-0000-000000000001', 2, 1)
$$, '23514', null,
  'regra 4 · linha NOVA sem UE e sem disciplina segue RECUSADA — a catraca nao foi afrouxada');

-- ⚠️ E A LINHA HISTORICA CONTINUA ENTRANDO: as 1.566 do ETL tem UE nula, e a catraca as
--    aceita enquanto ninguem as editar. Se esta assercao reprovar, a carga do ETL para de rodar.
select lives_ok($$
  insert into public.registros_aula
    (codigo, data, turma_id, curso_id, tempos_consumidos, origem_migracao_v1)
  values ('T116-REG-008', '2026-03-11', 'd1165000-0000-0000-0000-000000000001',
          'd1160000-0000-0000-0000-000000000001', 2, 'REG-TESTE-116')
$$, 'regra 4 · a linha HISTORICA sem UE continua aceita — e o que mantem as 1.566 do ETL carregaveis');

-- ⚠️⚠️ **ESTA ASSERCAO ME CORRIGIU, E A CORRECAO E O VALOR DELA.** Eu havia escrito que
--      disciplina inexistente seria recusada pela **FK**, com `23503`, e que por isso o
--      `coalesce` nao segurava nada. **Medido: a recusa vem do CHECK, com `23514`.** O motivo
--      e a ordem de avaliacao do PostgreSQL: CHECK de linha e avaliado **antes** da
--      integridade referencial, que e implementada como gatilho AFTER ROW.
-- ⚠️ **Logo o `coalesce` E o que faz o CHECK dizer a verdade.** Sem ele,
--    `app.disciplina_sem_ue(inexistente)` devolve NULL, o CHECK **passa** — e quem recusa
--    passa a ser a FK, com `23503`. A linha e recusada nos dois casos; o que muda e QUAL
--    restricao a recusa, e um CHECK que aprova disciplina inexistente e um CHECK que mente
--    sobre o que confere.
select throws_ok($$
  insert into public.registros_aula
    (codigo, data, turma_id, curso_id, disciplina_id, instrutor_id, tempos_consumidos,
     ta_inicial, conteudo_resumo)
  values ('T116-REG-009', '2026-03-12', 'd1165000-0000-0000-0000-000000000001',
          'd1160000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000ff',
          'd1161000-0000-0000-0000-000000000001', 2, 5, 'Disciplina que nao existe')
$$, '23514', null,
  'H3 · disciplina inexistente e recusada pelo CHECK (`23514`) — ele roda ANTES da FK, e o `coalesce` e o que o faz recusar');

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- D · O CHECK QUE A `RF-EXTRA-02` AFIRMAVA E QUE NAO EXISTIA (V-5)
-- ═══════════════════════════════════════════════════════════════════════════════════════

select ok(
  (select count(*) = 1 from pg_constraint
    where conrelid = 'public.atividades_nao_letivas'::regclass
      and conname = 'ativ_estudo_individual_de_turma'),
  'V-5 · o CHECK «Estudo Individual e sempre de Turma» EXISTE — a `RF-EXTRA-02` o afirmava e ele nao existia'
);

select throws_ok($$
  insert into public.atividades_nao_letivas
    (codigo, categoria_normativa, escopo, turma_id, data, descricao, tempos_consumidos, ta_inicial)
  values ('T116-ATV-001', 'Estudo_Individual', 'global', null, '2026-03-03',
          'Estudo individual global', 1, 9)
$$, '23514', null,
  'V-5 · Estudo Individual de escopo GLOBAL e recusado pelo banco — nao e alerta, e regra estrutural');

select lives_ok($$
  insert into public.atividades_nao_letivas
    (codigo, categoria_normativa, escopo, turma_id, data, descricao, tempos_consumidos, ta_inicial)
  values ('T116-ATV-002', 'Estudo_Individual', 'turma', 'd1165000-0000-0000-0000-000000000001',
          '2026-03-03', 'Estudo individual da turma', 1, 9)
$$, 'V-5 · Estudo Individual de TURMA e aceito — o caso normal, que e o da planilha');

-- ⚠️ CONTROLE POSITIVO: a regra vale SO para Estudo Individual. Sem esta assercao, um CHECK
--    escrito largo demais (proibindo toda atividade global) passaria igual.
select lives_ok($$
  insert into public.atividades_nao_letivas
    (codigo, categoria_normativa, escopo, turma_id, data, descricao, tempos_consumidos, ta_inicial)
  values ('T116-ATV-003', 'TAD', 'global', null, '2026-03-04', 'Cerimonia global', 2, 1)
$$, 'V-5 · atividade TAD global continua aceita — a regra e do Estudo Individual, nao do escopo global');

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- E · O RESPONSAVEL DA ATIVIDADE NAO LETIVA (Q-8)
-- ═══════════════════════════════════════════════════════════════════════════════════════

select has_column('public', 'atividades_nao_letivas', 'responsavel_externo',
  'Q-8 · `responsavel_externo` existe — a coluna INSTRUTOR da planilha traz entidade e palestrante de fora');

select has_column('public', 'atividades_nao_letivas', 'instrutor_id',
  'Q-8 · `instrutor_id` existe — quem esta no cadastro entra por FK, nao por texto');

select is(
  (select pg_get_constraintdef(oid) from pg_constraint
    where conrelid = 'public.atividades_nao_letivas'::regclass
      and conname = 'atividades_nao_letivas_instrutor_id_fkey'),
  'FOREIGN KEY (instrutor_id) REFERENCES instrutores(id) ON DELETE RESTRICT',
  'Q-8 · a FK do instrutor e `restrict` — nada e apagado neste sistema (regra 4)'
);

select throws_ok($$
  insert into public.atividades_nao_letivas
    (codigo, categoria_normativa, escopo, turma_id, data, descricao, tempos_consumidos,
     ta_inicial, instrutor_id, responsavel_externo)
  values ('T116-ATV-004', 'AEC', 'turma', 'd1165000-0000-0000-0000-000000000001', '2026-03-05',
          'Palestra com dois responsaveis', 2, 1,
          'd1161000-0000-0000-0000-000000000001', 'DOEP')
$$, '23514', null,
  'Q-8 · instrutor do cadastro E responsavel externo na mesma linha e recusado — um ou outro');

select lives_ok($$
  insert into public.atividades_nao_letivas
    (codigo, categoria_normativa, escopo, turma_id, data, descricao, tempos_consumidos,
     ta_inicial, responsavel_externo)
  values ('T116-ATV-005', 'AEC', 'turma', 'd1165000-0000-0000-0000-000000000001', '2026-03-06',
          'Palestra da DOEP', 2, 1, 'DOEP')
$$, 'Q-8 · responsavel em TEXTO LIVRE e aceito — e o que a planilha tem em `CIAARA-30`, `DOEP`, `NAS`');

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- F · AS DUAS VIEWS — o LEFT JOIN, a global, e o `security_invoker` REPETIDO
-- ═══════════════════════════════════════════════════════════════════════════════════════

select has_column('public', 'vw_ocupacao_ta', 'local',
  'RN-CONF-01 · a grade traz `local` — sem ela o alerta de SALA nao se calcula');

select has_column('public', 'vw_ocupacao_ta', 'fiscal_id',
  'RN-CONF-01 · a grade traz `fiscal_id` — o conflito do FISCAL e do mesmo tipo que o do instrutor');

select has_column('public', 'vw_ocupacao_ta', 'herdado',
  'Q-12 · a grade traz `herdado` — e por ela que as 188 avaliacoes com `ta_inicial = 1` caem em «Sem posicao»');

-- ⚠️ GOTCHA 10, e esta base pagou por ele em 25/09/2026 com vazamento de leitura que foi ao
--    remoto: `create or replace view` NAO preserva as `reloptions`.
select ok(
  (select coalesce(c.reloptions, '{}'::text[]) @> array['security_invoker=true']
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'vw_ocupacao_ta'),
  'gotcha 10 · `vw_ocupacao_ta` recriada REPETIU `security_invoker` — sem isso ela roda como dono e vaza'
);

select ok(
  (select coalesce(c.reloptions, '{}'::text[]) @> array['security_invoker=true']
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'vw_disciplinas_execucao'),
  'gotcha 10 · `vw_disciplinas_execucao` recriada REPETIU `security_invoker`'
);

-- View nova nasce com DELETE/TRUNCATE para `authenticated`; o revoke do Epico 1 e uma foto.
select is_empty($$
  select table_name || '.' || privilege_type from information_schema.table_privileges
   where table_schema = 'public' and grantee = 'authenticated'
     and table_name in ('vw_ocupacao_ta', 'vw_disciplinas_execucao')
     and privilege_type in ('DELETE', 'TRUNCATE')
$$, 'regra 4 · as duas views recriadas seguem sem DELETE nem TRUNCATE para `authenticated`');

-- ⚠️⚠️ **DISCRIMINA O V-7**: com o `turma_id is not null` de volta, esta linha desaparece.
select is(
  (select count(*)::int from public.vw_ocupacao_ta
    where fato_id = (select id from public.atividades_nao_letivas where codigo = 'T116-ATV-003')),
  1,
  'V-7 · a atividade de escopo GLOBAL chega a grade — a `RF-EXTRA-03` a exige e ela nao chegava'
);

select is(
  (select turma_id from public.vw_ocupacao_ta
    where fato_id = (select id from public.atividades_nao_letivas where codigo = 'T116-ATV-003')),
  null,
  'V-7 · e ela sai com `turma_id` NULO — quem a aplica a cada turma ativa e a pagina, nao a view'
);

-- ⚠️⚠️ **DISCRIMINA O LEFT JOIN**: com o `JOIN` interno de antes, a aula sem UE nao aparecia.
select is(
  (select disciplina_id from public.vw_ocupacao_ta
    where fato_id = (select id from public.registros_aula where codigo = 'T116-REG-002')),
  'd1163000-0000-0000-0000-000000000003'::uuid,
  'Q-1 · a aula SEM UE aparece na grade com a disciplina da COLUNA — antes ela desaparecia sem erro'
);

-- ⚠️ NAO REGRESSAO: a aula COM UE continua tirando a disciplina DA UE.
select is(
  (select disciplina_id from public.vw_ocupacao_ta
    where fato_id = (select id from public.registros_aula where codigo = 'T116-REG-001')),
  'd1163000-0000-0000-0000-000000000001'::uuid,
  'Q-1 · a aula COM UE continua tirando a disciplina DA UE — o `coalesce` nao trocou a fonte'
);

select is(
  (select herdado from public.vw_ocupacao_ta
    where fato_id = (select id from public.registros_aula where codigo = 'T116-REG-001')),
  false,
  'Q-12 · a linha nascida na tela NAO e herdada — e a posicao dela vale'
);

-- ⚠️ `vw_disciplinas_execucao`: sem esta correcao a CH por disciplina do `C-Espc-HN` e do
--    `C-Espc-FR` ficaria em ZERO para sempre depois da Q-1.
select is(
  (select ta_executados::int from public.vw_disciplinas_execucao
    where disciplina_id = 'd1163000-0000-0000-0000-000000000003'
      and turma_id = 'd1165000-0000-0000-0000-000000000002'),
  2,
  'Q-1 · a CH por disciplina CONTA a aula sem UE — sem isso o curso por competencias ficava em zero'
);

select is(
  (select ta_executados::int from public.vw_disciplinas_execucao
    where disciplina_id = 'd1163000-0000-0000-0000-000000000001'
      and turma_id = 'd1165000-0000-0000-0000-000000000001'),
  2,
  'Q-1 · a CH da disciplina COM UE segue contando pela UE — nao regressao do Epico 5.5'
);

-- ⚠️ E A LINHA HISTORICA SEM UE CONTINUA FORA DE DISCIPLINA NENHUMA, que e o numero que a
--    ficha da turma explica na tela. Se isto mudar, o rodape de `/turmas/[turma]` passa a
--    mentir sem que nada acuse.
select is(
  (select coalesce(sum(ta_executados), 0)::int from public.vw_disciplinas_execucao
    where turma_id = 'd1165000-0000-0000-0000-000000000001'),
  2,
  'nao regressao · o lancamento historico com UE e disciplina NULAS nao entra em disciplina alguma'
);

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- G · O CONFLITO ENTRE TURMAS (Q-17)
-- ═══════════════════════════════════════════════════════════════════════════════════════

select has_function('public', 'conflitos_da_semana', array['uuid', 'date', 'date'],
  'Q-17 · `public.conflitos_da_semana` existe em `public` — o PostgREST NAO expoe o schema `app`');

select ok(
  (select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'conflitos_da_semana'),
  'Q-17 · ela e SECURITY DEFINER — `vw_ocupacao_ta` e invoker e esconderia a turma que o perfil nao alcanca'
);

select is_empty($$
  select routine_name from information_schema.routine_privileges
   where routine_schema = 'public' and routine_name = 'conflitos_da_semana'
     and grantee in ('anon', 'PUBLIC')
$$, 'Q-17 · `anon` nao executa a funcao de conflito');

-- ⚠️ O pgTAP roda SEM SESSAO, e e por isso que esta assercao vive aqui: o que ela prova nao e
--    RLS, e que a funcao levanta por conta propria. Foi assim que o gotcha 15 apareceu.
select throws_ok($$
  select * from public.conflitos_da_semana('d1165000-0000-0000-0000-000000000001', '2026-03-02', '2026-03-06')
$$, '42501', null,
  'Q-17 · sem sessao ela levanta `42501` — o porteiro e da funcao, e ela falha FECHADA');

-- ⚠️ A PROVA DE QUE O DADO ALHEIO NAO VAZA e o CONTRATO DE SAIDA: `turma_id`, `fato_id`,
--    disciplina e conteudo NAO estao entre as colunas devolvidas. A regra manda ver o
--    CONFLITO, nao o DSA do outro curso.
select set_eq($$
  select unnest(proargnames) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'conflitos_da_semana'
$$, $$values ('p_turma_id'), ('p_de'), ('p_ate'), ('data'), ('ta_inicial'), ('ta_final'),
             ('instrutor_id'), ('fiscal_id'), ('local')$$,
  'Q-17 · ela devolve so o FATO — sem `turma_id`, sem `fato_id`, sem disciplina e sem conteudo alheio');

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- H · AS SEMENTES (Q-4, Q-10/H1, H2)
-- ═══════════════════════════════════════════════════════════════════════════════════════

select is(
  (select count(*)::int from public.config_parametros
    where chave in ('dsa.teto_tfm_semana', 'dsa.teto_recomendado_semana', 'dsa.sabado_tempos')
      and status = 'ativo'),
  3,
  'Principio VII · os tres parametros do DSA sao DADO, nao constante de codigo'
);

select is(
  (select valor from public.config_parametros where chave = 'dsa.teto_tfm_semana' and status = 'ativo'),
  '6',
  'RN-DIST-03 · o teto RIGIDO de TFM e 6 TA por semana — o unico bloqueio do DSA');

-- O CHECK do banco cobra fundamento de parametro normativo; esta assercao o torna visivel.
select is_empty($$
  select chave from public.config_parametros
   where chave like 'dsa.%' and natureza = 'normativo'
     and (fundamento_normativo is null or btrim(fundamento_normativo) = '')
$$, 'RNF-NORM-08 · todo parametro normativo do DSA nomeia a norma que o sustenta');

select is(
  (select count(*)::int from public.config_listas
    where lista = 'metodologias' and metadados ? 'sigla'),
  10,
  'H1 · DEZ siglas na lista `metodologias` QUE JA EXISTIA — nenhuma lista nova, nenhuma segunda verdade'
);

select results_eq($$
  select valor, metadados ->> 'sigla' from public.config_listas
   where lista = 'metodologias' and metadados ->> 'sigla' in ('EO', 'AP', 'PP', 'PE')
   order by metadados ->> 'sigla'
$$, $$values ('Aula Prática', 'AP'), ('Exposição Oral', 'EO'), ('Prova Escrita', 'PE'),
             ('Prova Prática', 'PP')$$,
  'H1 · as QUATRO siglas que caem em linha JA EXISTENTE casam pelo valor COM ACENTO');

-- ⚠️ **A ASSERCAO DO `PE` VIROU DE LADO EM 05/10/2026, e o registro e o que importa.** Ela era:
--
--        select is_empty($$ select valor from public.config_listas
--          where lista = 'metodologias' and metadados ->> 'sigla' = 'PE' $$,
--          'H1 · `PE` NAO entra — fica de fora ate Bernardo confirmar o nome');
--
--    Eu a escrevi com a justificativa de que *"nenhum lancamento a usa hoje"* — **e isso estava
--    errado**: `Prova Escrita` tem **67 usos** na origem, o segundo valor mais usado de
--    `Avaliacoes.Metodologia`. Bernardo confirmou o nome (F-4), e agora a assercao cobra o
--    VINCULO, nao a ausencia: `PE` tem de estar em `Prova Escrita` e em mais nada.
select results_eq($$
  select valor from public.config_listas
   where lista = 'metodologias' and metadados ->> 'sigla' = 'PE'
$$, $$values ('Prova Escrita')$$,
  'F-4 · `PE` e de `Prova Escrita`, e de nenhum outro valor — 67 usos na origem, decisao de 05/10/2026');

select is(
  (select count(*)::int from public.config_listas
    where lista = 'tipos_atividade' and metadados ? 'categoria'),
  10,
  'H2 · DEZ subtipos com categoria normativa — e por ela que o seletor filtra em vez de oferecer a lista inteira'
);

select results_eq($$
  select metadados ->> 'categoria', count(*)::int from public.config_listas
   where lista = 'tipos_atividade' and metadados ? 'categoria'
   group by 1 order by 1
$$, $$values ('AEC', 4), ('Estudo_Individual', 2), ('TAD', 2), ('TR', 2)$$,
  'H2 · a reparticao e 4 AEC, 2 TAD, 2 TR e 2 Estudo Individual — a `CHT = CHD + AEC + TAD + TR`');

-- ⚠️ `Licença de Pagamento` fica SEM categoria: ela vem do calendario (Q-16), como o feriado.
select is_empty($$
  select valor from public.config_listas
   where lista = 'tipos_atividade' and valor = 'Licença de Pagamento' and metadados ? 'categoria'
$$, 'Q-16 · `Licença de Pagamento` fica SEM categoria e nao aparece no DSA — ela vem do calendario');

-- ⚠️ **A SEMENTE NAO CARIMBA PROCEDENCIA, e isso e o porteiro da AMBIENTE-2.**
--    `carregar.dados_ja_carregados()` conta linhas COM `origem_migracao_v1` em toda tabela da
--    ordem, e `config_listas` e a PRIMEIRA. Marcar procedencia aqui faria `--primeira-carga`
--    recusar um destino que so tem semente de migration.
-- ⚠️ **A LISTA E DOS NOVE VALORES QUE SO A MIGRATION INTRODUZ, e o recorte foi MEDIDO, nao
--    escolhido por gosto.** Dos 19 que a semente grava, **9 a planilha TAMBEM traz** — e nesses
--    a procedencia `Config_Listas:%` e o registro CORRETO depois da carga, porque a linha veio
--    da planilha de fato (a migration so chegou antes). Uma assercao sobre "toda linha com
--    metadados" passaria na base recriada e REPROVARIA na base carregada, e o arquivo
--    precisa valer nas duas.
select is_empty($$
  select lista || '/' || valor from public.config_listas
   where origem_migracao_v1 is not null
     and (lista, valor) in (
       ('metodologias', 'Prova Mista'), ('metodologias', 'Prova Objetiva'),
       ('metodologias', 'Observação de Desempenho'), ('metodologias', 'Trabalho Individual'),
       ('metodologias', 'Trabalho em Grupo'), ('metodologias', 'Estudo Individual'),
       ('tipos_atividade', 'Visita Técnica'), ('tipos_atividade', 'Estudo Individual'),
       ('tipos_atividade', 'Monitoria')
     )
$$, 'AMBIENTE-2 · os nove valores que SO a migration introduz nao carimbam procedencia — senao `--primeira-carga` recusaria');

select is_empty($$
  select chave from public.config_parametros
   where chave like 'dsa.%' and origem_migracao_v1 is not null
$$, 'AMBIENTE-2 · nem os parametros carimbam procedencia — eles sao semeados pelo schema');

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- I · E-1 · O COMENTARIO DE `impacto_feriado` PASSA A DIZER O QUE A REGRA DIZ
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- ⚠️ A REGRA NAO MUDOU. O comentario dizia *"`parcial` reduz"* e a `RN-EVT-02` diz que
--    impacto parcial ou informativo NAO DESCONTA NADA. Quem muda e o comentario, que estava
--    errado — e ele importa porque e o que quem programa le primeiro.
select ok(
  (select obj_description('public.impacto_feriado'::regtype, 'pg_type') ~ 'NAO descontam nada'),
  'E-1 · o comentario de `impacto_feriado` agora diz que `parcial` NAO desconta (RN-EVT-02)'
);

select ok(
  (select obj_description('public.impacto_feriado'::regtype, 'pg_type') !~ '`parcial` reduz;'),
  'E-1 · e a frase antiga («`parcial` reduz;») saiu — o PONTO E VIRGULA e o que a distingue da citacao dela'
);

select * from finish();
rollback;
