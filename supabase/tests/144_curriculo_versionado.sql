-- =================================================================================
-- 144 — Spec 021, Bloco 6 (`20261021030049` e `20261021030050`): o CURRÍCULO VERSIONADO.
--
-- O caso que discrimina (DoD 8): com DUAS versões do mesmo curso, a CH curricular, a execução por disciplina e o
-- limite declarado de cada turma são os da versão DELA — a junção pelo curso, que vigorava antes, somaria as duas.
-- E as travas: a versão da turma muda só sem lançamento (RF-HOR-05); lançamento de disciplina de outra versão do mesmo
-- curso é recusado (RN-MAT-01 com a versão); a versão em uso por turma com lançamento não muda número pela tela;
-- sem sessão (migration, ETL) passa.
--
-- ⚠️ Quem pode ler e editar a versão se prova com sessão real em `tests/invariantes/rls/`. Aqui, estrutura e regra; a
--    sessão é simulada (`request.jwt.claim.sub`) só para a trava, que olha `auth.uid()`.
-- =================================================================================
begin;
select plan(31);

create function pg_temp.recusa(p_sql text) returns jsonb
language plpgsql as $f$
declare
  v_hint text;
begin
  execute p_sql;
  return jsonb_build_object('recusou', false);
exception when others then
  get stacked diagnostics v_hint = pg_exception_hint;
  return jsonb_build_object('recusou', true, 'sqlstate', sqlstate, 'hint', v_hint);
end;
$f$;

-- ── estrutura ──
select ok((select relrowsecurity from pg_class where oid = 'public.curriculos'::regclass),
  'a tabela das versões tem RLS ligada');
select ok(
  not has_table_privilege('authenticated', 'public.curriculos', 'INSERT')
  and not has_table_privilege('authenticated', 'public.curriculos', 'DELETE')
  and not has_table_privilege('authenticated', 'public.curriculos', 'TRUNCATE'),
  'Regra 4 · a versão não nasce por INSERT de sessão (só pela cópia) e nunca sai');
select set_eq(
  $$select polname || ':' || polcmd::text from pg_policy where polrelid = 'public.curriculos'::regclass$$,
  $$values ('curriculos_ler:r'), ('curriculos_editar:w')$$,
  'as policies da versão: ler e editar, e nada mais');
select is((select count(*)::int from pg_policy where polcmd = 'd'), 0,
  'Regra 4 · nenhuma policy de DELETE no catálogo');
select ok(
  (select bool_and('security_invoker=true' = any (reloptions)) from pg_class
    where oid in ('public.vw_carga_horaria_turma'::regclass, 'public.vw_disciplinas_execucao'::regclass,
                  'public.vw_conformidade_tetos'::regclass)),
  'gotcha 10 · as três views recriadas continuam security_invoker');
select ok(
  (select bool_and(not attnotnull is false) from pg_attribute
    where (attrelid, attname) in (('public.turmas'::regclass, 'curriculo_id'),
                                  ('public.disciplinas'::regclass, 'curriculo_id'),
                                  ('public.limites_curriculo'::regclass, 'curriculo_id'),
                                  ('public.disciplinas'::regclass, 'linhagem_id'),
                                  ('public.unidades_ensino'::regclass, 'linhagem_id'),
                                  ('public.avaliacoes_curriculo'::regclass, 'linhagem_id'))),
  'turma, disciplina e limite têm versão; disciplina, UE e avaliação têm linhagem — todos NOT NULL');
select ok(
  exists (select 1 from pg_indexes where indexname = 'uq_disciplinas_curriculo_cod_ativo')
  and not exists (select 1 from pg_indexes where indexname = 'uq_disciplinas_curso_cod_ativo')
  and exists (select 1 from pg_indexes where indexname = 'limite_unico_na_versao')
  and not exists (select 1 from pg_indexes where indexname = 'limite_unico'),
  'RF-DADOS-06 (emendado) · a unicidade do código e do limite é por VERSÃO, não mais por curso');
select ok(
  (select bool_and(lower(regexp_replace(prosrc, '--[^\n]*', '', 'g'))
                   !~ '(current_date|now\s*\(|current_timestamp|localtimestamp)')
     from pg_proc
    where oid in ('app.curriculo_vigente(uuid,date)'::regprocedure,
                  'app.guardar_curriculo_da_turma()'::regprocedure,
                  'app.trocar_linhas_da_versao()'::regprocedure,
                  'app.guardar_curriculo_em_uso()'::regprocedure,
                  'app.conferir_versao_da_turma()'::regprocedure)),
  'D20 · nada do currículo versionado lê o relógio do servidor');
select ok(
  not has_function_privilege('authenticated', 'app.guardar_curriculo_em_uso()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'app.trocar_linhas_da_versao()', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.curriculo_padrao_da_turma(uuid,date,integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.curriculo_padrao_da_turma(uuid,date,integer)', 'EXECUTE'),
  'os gatilhos ficam fechados; a versão padrão da turma, só para authenticated');

-- ── a amostra: um curso, que nasce com a versão 1 ──
select public.criar_curso_com_regime(
  '{"codigo":"T144-CUR","nome_curso":"Curso T144","classificacao":"regular",
    "modalidade":"presencial","duracao_dias":300}'::jsonb,
  '{"regime_tempos":8,"ta_duracao_min":45,"intervalo_manha_min":10,"intervalo_tarde_min":10,
    "hora_inicio_manha":"07:30","hora_inicio_tarde":"13:30","vigente_de":"2046-01-01"}'::jsonb);
create temporary table _c as select id from public.cursos where codigo = 'T144-CUR';
select results_eq(
  $$select versao::int, vigente_de from public.curriculos where curso_id = (select id from _c)$$,
  $$values (1, date '2020-01-01')$$,
  'o curso novo nasce com a VERSÃO 1, vigente desde sempre');

insert into public.disciplinas (curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos)
select id, v.cod, v.nome, v.ch from _c, (values ('I', 'Disciplina I', 40), ('II', 'Disciplina II', 60)) v(cod, nome, ch);
create temporary table _v1 as select c.id from public.curriculos c where c.curso_id = (select id from _c) and c.versao = 1;
select is(
  (select count(*)::int from public.disciplinas where curriculo_id = (select id from _v1)),
  2, 'a disciplina gravada sem versão vai para a ÚNICA versão do curso');
insert into public.limites_curriculo (curso_id, categoria, tempos, fonte_arquivo, fonte_pagina) select id, 'AEC', 10, 't144.pdf', 1 from _c;

insert into public.turmas (curso_id, ano_letivo, turma, modalidade, status, data_inicio, data_termino, codigo)
select id, 2046, null, 'presencial', 'planejada', date '2046-02-01', date '2046-11-30', 'T144-CUR 2046' from _c;
create temporary table _t46 as select id from public.turmas where codigo = 'T144-CUR 2046';
select results_eq(
  $$select t.curriculo_id = (select id from _v1),
           (select count(*)::int from public.turma_disciplina td where td.turma_id = t.id and td.status = 'ativo')
      from public.turmas t where t.id = (select id from _t46)$$,
  $$values (true, 2)$$,
  'a turma nasce na versão vigente na data de início, com as linhas da versão');

-- ── a VERSÃO 2: as mesmas disciplinas (a mesma linhagem), I com 30 em vez de 40, vigente em 2047 ──
insert into public.curriculos (curso_id, versao, vigente_de, descricao)
select id, 2, date '2047-01-01', 'T144 · 10 TA a menos na I' from _c;
create temporary table _v2 as select c.id from public.curriculos c where c.curso_id = (select id from _c) and c.versao = 2;
insert into public.disciplinas (curso_id, curriculo_id, linhagem_id, cod_disciplina, nome_disciplina, carga_horaria_tempos)
select d.curso_id, (select id from _v2), d.linhagem_id, d.cod_disciplina, d.nome_disciplina,
       case d.cod_disciplina when 'I' then 30 else d.carga_horaria_tempos end
  from public.disciplinas d where d.curriculo_id = (select id from _v1);
insert into public.limites_curriculo (curso_id, curriculo_id, categoria, tempos, fonte_arquivo, fonte_pagina) select id, (select id from _v2), 'AEC', 7, 't144.pdf', 2 from _c;
select is(
  (select count(*)::int from public.disciplinas where curso_id = (select id from _c) and cod_disciplina = 'I' and status = 'ativo'),
  2, 'RF-DADOS-06 (emendado) · o mesmo código ativo em duas VERSÕES do curso é aceito');
select is(
  pg_temp.recusa($$insert into public.disciplinas (curso_id, curriculo_id, cod_disciplina, nome_disciplina, carga_horaria_tempos)
                   select curso_id, curriculo_id, 'I', 'Repetida', 5 from public.disciplinas
                    where curriculo_id = (select id from _v2) limit 1$$) ->> 'sqlstate',
  '23505', 'e o mesmo código duas vezes na MESMA versão é recusado');
select is(
  pg_temp.recusa($$insert into public.disciplinas (curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos)
                   select id, 'III', 'Sem versão', 5 from _c$$) ->> 'hint',
  'versao_obrigatoria', 'com duas versões, disciplina sem versão é recusada: o banco não adivinha');

insert into public.turmas (curso_id, ano_letivo, turma, modalidade, status, data_inicio, data_termino, codigo)
select id, 2047, null, 'presencial', 'planejada', date '2047-02-01', date '2047-11-30', 'T144-CUR 2047' from _c;
create temporary table _t47 as select id from public.turmas where codigo = 'T144-CUR 2047';
select ok((select curriculo_id = (select id from _v2) from public.turmas where id = (select id from _t47)),
  'a turma de 2047 nasce na versão 2 (a vigente na data de início dela)');

-- ── O CASO QUE DISCRIMINA: cada turma lê a SUA versão ──
select results_eq(
  $$select turma_codigo, chr_curricular::int from public.vw_carga_horaria_turma
     where curso_id = (select id from _c) order by 1$$,
  $$values ('T144-CUR 2046', 100), ('T144-CUR 2047', 90)$$,
  'a CH curricular é a da versão da turma (pelo curso seria 190 nas duas)');
select results_eq(
  $$select turma_codigo, count(*)::int, sum(carga_horaria_tempos)::int from public.vw_disciplinas_execucao
     where curso_id = (select id from _c) group by 1 order by 1$$,
  $$values ('T144-CUR 2046', 2, 100), ('T144-CUR 2047', 2, 90)$$,
  'a execução por disciplina traz as disciplinas da versão da turma (pelo curso seriam 4 em cada)');
select results_eq(
  $$select turma_codigo, limite_declarado::int from public.vw_conformidade_tetos
     where curso_id = (select id from _c) and categoria = 'AEC' order by 1$$,
  $$values ('T144-CUR 2046', 10), ('T144-CUR 2047', 7)$$,
  'o limite declarado é o da versão da turma');
select is(
  app.disciplina_e_da_turma((select id from public.disciplinas where curriculo_id = (select id from _v1) and cod_disciplina = 'I'),
                            (select id from _t47)),
  false, 'RN-MAT-01 com a versão · a disciplina da versão 1 não é da turma que segue a 2');

-- ── a TROCA de versão da turma sem lançamento: leva o que tem correspondência ──
update public.turma_disciplina
   set previsao_inicio = '2046-03-01', previsao_termino = '2046-04-30', origem_periodo = 'manual'
 where turma_id = (select id from _t46)
   and disciplina_id = (select id from public.disciplinas where curriculo_id = (select id from _v1) and cod_disciplina = 'I');
update public.turmas set curriculo_id = (select id from _v2) where id = (select id from _t46);
select results_eq(
  $$select c.versao::int, td.status::text, count(*)::int
      from public.turma_disciplina td join public.disciplinas d on d.id = td.disciplina_id
      join public.curriculos c on c.id = d.curriculo_id
     where td.turma_id = (select id from _t46) group by 1, 2 order by 1, 2$$,
  $$values (1, 'inativo', 2), (2, 'ativo', 2)$$,
  'trocar de versão: as linhas da versão 1 ficam inativas (nunca apagadas) e nascem as da versão 2');
select results_eq(
  $$select td.origem_periodo::text, td.previsao_inicio, td.previsao_termino
      from public.turma_disciplina td join public.disciplinas d on d.id = td.disciplina_id
     where td.turma_id = (select id from _t46) and td.status = 'ativo' and d.cod_disciplina = 'I'$$,
  $$values ('manual', date '2046-03-01', date '2046-04-30')$$,
  'a linha da mesma disciplina (a mesma linhagem) leva o período manual');
update public.turmas set curriculo_id = (select id from _v1) where id = (select id from _t46);

-- ── o lançamento, e as travas que ele liga ──
insert into public.config_listas (lista, valor, rotulo_exibicao, ordem)
select 'tipos_avaliacao', 'Prova Escrita', 'Prova Escrita', 1
 where not exists (select 1 from public.config_listas where lista = 'tipos_avaliacao' and valor = 'Prova Escrita');
insert into public.instrutores (codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om, status)
values ('T144-INS', 'CT', '-EF', 'Instrutor T144', 'Militar', 'OM-T144', 'ativo');
select is(
  pg_temp.recusa($$insert into public.avaliacoes (codigo, turma_id, disciplina_id, curso_id, tipo_avaliacao, data_avaliacao,
                                                  instrutor_responsavel_id)
                   select 'T144-AVL-X', (select id from _t47), d.id, d.curso_id, 'Prova Escrita', '2047-03-10',
                          (select id from public.instrutores where codigo = 'T144-INS')
                     from public.disciplinas d where d.curriculo_id = (select id from _v1) and d.cod_disciplina = 'I'$$) ->> 'hint',
  'disciplina_de_outra_versao', 'lançamento de disciplina de OUTRA versão do mesmo curso é recusado');
insert into public.avaliacoes (codigo, turma_id, disciplina_id, curso_id, tipo_avaliacao, data_avaliacao, instrutor_responsavel_id)
select 'T144-AVL', (select id from _t47), d.id, d.curso_id, 'Prova Escrita', '2047-03-10',
       (select id from public.instrutores where codigo = 'T144-INS')
  from public.disciplinas d where d.curriculo_id = (select id from _v2) and d.cod_disciplina = 'I';
select is(
  pg_temp.recusa($$update public.turmas set curriculo_id = (select id from _v1) where id = (select id from _t47)$$) ->> 'hint',
  'curriculo_da_turma_travado', 'RF-HOR-05 · com lançamento, a versão da turma não muda mais');
select is(app.curriculo_em_uso_com_lancamento((select id from _v2)), true,
  'a versão 2 está em uso por turma com lançamento');

select set_config('request.jwt.claim.sub', '14400000-0000-0000-0000-000000000001', true);
select is(
  pg_temp.recusa($$update public.disciplinas set carga_horaria_tempos = 25
                    where curriculo_id = (select id from _v2) and cod_disciplina = 'I'$$) ->> 'hint',
  'curriculo_em_uso', 'RF-HOR-05 · pela tela, a CH da versão em uso não muda');
select is(
  pg_temp.recusa($$insert into public.unidades_ensino (disciplina_id, curso_id, numero_ue, topico, ch_prevista_tempos)
                   select id, curso_id, 1, 'UE nova', 5 from public.disciplinas
                    where curriculo_id = (select id from _v2) and cod_disciplina = 'II'$$) ->> 'hint',
  'curriculo_em_uso', 'RF-HOR-05 · nem UE nova entra na versão em uso');
select is(
  pg_temp.recusa($$update public.disciplinas set nome_no_dsa = 'Disc I'
                    where curriculo_id = (select id from _v2) and cod_disciplina = 'I'$$) ->> 'recusou',
  'false', 'o texto da versão em uso segue livre (nome no DSA)');
select is(
  pg_temp.recusa($$update public.disciplinas set carga_horaria_tempos = 30
                    where curriculo_id = (select id from _v1) and cod_disciplina = 'I'$$) ->> 'recusou',
  'false', 'e a versão 1, que nenhuma turma com lançamento segue, ainda se edita');
select set_config('request.jwt.claim.sub', '', true);
select is(
  pg_temp.recusa($$update public.disciplinas set carga_horaria_tempos = 31
                    where curriculo_id = (select id from _v2) and cod_disciplina = 'I'$$) ->> 'recusou',
  'false', 'sem sessão (migration, ETL, script revisto) a trava não se aplica');
select is(
  pg_temp.recusa($$update public.curriculos set status = 'inativo' where id = (select id from _v2)$$) ->> 'hint',
  'versao_em_uso', 'a versão seguida por turma não se inativa');

select * from finish();
rollback;
