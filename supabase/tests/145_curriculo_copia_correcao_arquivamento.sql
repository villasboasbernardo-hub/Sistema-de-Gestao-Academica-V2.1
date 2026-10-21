-- =================================================================================
-- 145 — Spec 021, Bloco 6, PR 2: a CÓPIA (RC-7, RC-2), a CORREÇÃO do currículo em uso (RC-6) e o ARQUIVAMENTO (RC-10).
--
-- O caso que discrimina (DoD 8): no currículo SEGUIDO por turma com lançamento, a mesma mudança de CH que passava no
-- PR 1 passa a ser recusada sem justificativa e aceita com ela (para o trio), com a trilha guardando o valor anterior; e
-- no currículo que ninguém usa ela segue livre. Completar o vazio é livre nos dois.
--
-- ⚠️ A sessão é simulada (`request.jwt.claim.sub`) e a justificativa vem pelo cabeçalho simulado (`request.headers`): o
--    gatilho decide por `auth.uid()`, `app.pode` e o cabeçalho. Quem pode o quê com sessão REAL está em
--    `tests/invariantes/rls/curriculos.test.ts`.
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
create function pg_temp.justificar(p_texto text) returns void language sql as $f$
  select set_config('request.headers',
                    jsonb_build_object('x-justificativa-de-correcao', encode(convert_to(p_texto, 'UTF8'), 'base64'))::text,
                    true);
$f$;
create function pg_temp.sem_justificativa() returns void language sql as $f$
  select set_config('request.headers', '{}', true);
$f$;

-- ── contas: um Admin e um Operador (escopo geral só para a amostra; o recorte por classificação é da RLS) ──
insert into auth.users (id, email, aud, role) values
  ('a1450000-0000-0000-0000-000000000001', 't145-admin@ciaara.teste', 'authenticated', 'authenticated'),
  ('a1450000-0000-0000-0000-000000000002', 't145-ope@ciaara.teste', 'authenticated', 'authenticated');
insert into public.usuarios (codigo, auth_user_id, email, nome, perfil, escopo_curso) values
  ('T145-ADM', 'a1450000-0000-0000-0000-000000000001', 't145-admin@ciaara.teste', 'Admin T145', 'admin', 'geral'),
  ('T145-OPE', 'a1450000-0000-0000-0000-000000000002', 't145-ope@ciaara.teste', 'Ope T145', 'operador', 'regular');

-- ── estrutura ──
select ok(
  exists (select 1 from public.perfil_permissao where recurso = 'correcao_de_curriculo' and acao = 'editar')
  and (select array_agg(perfil::text order by perfil::text) from public.perfil_permissao
        where recurso = 'correcao_de_curriculo' and permitido)
      = array['admin', 'ajudante_administracao_academica', 'encarregado_administracao_academica'],
  'RC-6 · corrigir currículo em uso: o trio, e só ele');
select ok(
  (select array_agg(perfil::text order by perfil::text) from public.perfil_permissao
    where recurso = 'arquivamento_de_curriculo' and permitido)
  = array['admin', 'ajudante_administracao_academica', 'encarregado_administracao_academica'],
  'RC-10 · arquivar currículo: o trio, e só ele');
select ok(
  not has_table_privilege('authenticated', 'public.correcoes_de_curriculo', 'INSERT')
  and not has_table_privilege('authenticated', 'public.correcoes_de_curriculo', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.correcoes_de_curriculo', 'DELETE'),
  'RC-6 · a trilha não se escreve pela sessão (só pelo gatilho)');
select is((select count(*)::int from pg_policy where polcmd = 'd'), 0, 'Regra 4 · nenhuma policy de DELETE');

-- ── a amostra: curso, currículo 1, duas disciplinas, uma turma com lançamento ──
select public.criar_curso_com_regime(
  '{"codigo":"T145-CUR","nome_curso":"Curso T145","classificacao":"regular",
    "modalidade":"presencial","duracao_dias":300,"duracao_semanas":40,"proposito":"Propósito T145"}'::jsonb,
  '{"regime_tempos":8,"ta_duracao_min":45,"intervalo_manha_min":10,"intervalo_tarde_min":10,
    "hora_inicio_manha":"07:30","hora_inicio_tarde":"13:30","vigente_de":"2046-01-01"}'::jsonb);
create temporary table _c as select id from public.cursos where codigo = 'T145-CUR';
create temporary table _v1 as select c.id from public.curriculos c where c.curso_id = (select id from _c) and c.versao = 1;
update public.curriculos set vigente_de = date '2046-01-01' where id = (select id from _v1);
insert into public.disciplinas (curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos)
select id, v.cod, v.nome, v.ch from _c, (values ('I', 'Disciplina I', 40), ('II', 'Disciplina II', 60)) v(cod, nome, ch);
insert into public.unidades_ensino (disciplina_id, curso_id, numero_ue, topico, ch_prevista_tempos)
select d.id, d.curso_id, 1, 'UE 1 da I', 40 from public.disciplinas d where d.curriculo_id = (select id from _v1) and d.cod_disciplina = 'I';
insert into public.limites_curriculo (curso_id, categoria, tempos, fonte_arquivo, fonte_pagina) select id, 'AEC', 10, 't145.pdf', 1 from _c;
insert into public.avaliacoes_planejadas (codigo, curso_id, nome_disciplina, formula_mf) select 'T145-AVP', id, 'Disciplina I', 'MF = PP' from _c;
insert into public.instrutores (codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om, status)
values ('T145-INS', 'CT', '-EF', 'Instrutor T145', 'Militar', 'OM-T145', 'ativo');
insert into public.instrutor_disciplina (instrutor_id, disciplina_id, modo_atribuicao)
select (select id from public.instrutores where codigo = 'T145-INS'), d.id, 'dividido'
  from public.disciplinas d where d.curriculo_id = (select id from _v1) and d.cod_disciplina = 'I';
insert into public.turmas (curso_id, ano_letivo, turma, modalidade, status, data_inicio, data_termino, codigo)
select id, 2046, null, 'presencial', 'ativa', date '2046-02-01', date '2046-11-30', 'T145-CUR 2046' from _c;
create temporary table _t as select id from public.turmas where codigo = 'T145-CUR 2046';
insert into public.config_listas (lista, valor, rotulo_exibicao, ordem)
select 'tipos_avaliacao', 'Prova Escrita', 'Prova Escrita', 1
 where not exists (select 1 from public.config_listas where lista = 'tipos_avaliacao' and valor = 'Prova Escrita');
insert into public.avaliacoes (codigo, turma_id, disciplina_id, curso_id, tipo_avaliacao, data_avaliacao, instrutor_responsavel_id)
select 'T145-AVL', (select id from _t), d.id, d.curso_id, 'Prova Escrita', '2046-03-10',
       (select id from public.instrutores where codigo = 'T145-INS')
  from public.disciplinas d where d.curriculo_id = (select id from _v1) and d.cod_disciplina = 'I';
select is(app.curriculo_em_uso_com_lancamento((select id from _v1)), true, 'o currículo 1 é seguido por turma com lançamento');

-- ── A CÓPIA (RC-7) ──
select is(
  pg_temp.recusa($$select public.criar_curriculo((select id from _c), date '2047-01-01', 'sem sessão', date '2046-10-21')$$) ->> 'hint',
  'curriculo_sem_permissao', 'sem sessão a cópia é recusada (o porteiro não falha aberto, gotcha 15)');
select set_config('request.jwt.claim.sub', 'a1450000-0000-0000-0000-000000000002', true);
select is(
  pg_temp.recusa($$select public.criar_curriculo((select id from _c), date '2047-01-01', 'operador', date '2046-10-21')$$) ->> 'hint',
  'curriculo_sem_permissao', 'o Operador não cria currículo (cursos.editar)');
select set_config('request.jwt.claim.sub', 'a1450000-0000-0000-0000-000000000001', true);
create temporary table _v2 as
  select public.criar_curriculo((select id from _c), date '2047-01-01', 'T145 · três semanas a menos', date '2046-10-21') as id;
select results_eq(
  $$select versao::int, vigente_de, proposito, duracao_semanas::int, duracao_dias, copiada_de = (select id from _v1),
           pdf_carregado_em
      from public.curriculos where id = (select id from _v2)$$,
  $$values (2, date '2047-01-01', 'Propósito T145'::text, 40, 300, true, null::timestamptz)$$,
  'RC-7 · o currículo 2 nasce cópia do vigente: propósito, duração e modelo — o PDF não (RC-11)');
select results_eq(
  $$select (select count(*) from public.disciplinas where curriculo_id = (select id from _v2))::int,
           (select count(*) from public.unidades_ensino u join public.disciplinas d on d.id = u.disciplina_id
             where d.curriculo_id = (select id from _v2))::int,
           (select count(*) from public.limites_curriculo where curriculo_id = (select id from _v2))::int,
           (select count(*) from public.avaliacoes_planejadas where curriculo_id = (select id from _v2))::int,
           (select count(*) from public.instrutor_disciplina v join public.disciplinas d on d.id = v.disciplina_id
             where d.curriculo_id = (select id from _v2))::int$$,
  $$values (2, 1, 1, 1, 1)$$,
  'RC-7 · leva disciplinas, UEs, limites, regras de avaliação e habilitações');
select is(
  (select count(*)::int from public.disciplinas d2
     where d2.curriculo_id = (select id from _v2)
       and not exists (select 1 from public.disciplinas d1 where d1.curriculo_id = (select id from _v1)
                          and d1.linhagem_id = d2.linhagem_id)),
  0, 'cada disciplina copiada tem par de linhagem no currículo 1');
select is((select count(*)::int from public.turmas where curriculo_id = (select id from _v2)), 0,
  'RC-4 · nenhuma turma passa sozinha para o currículo novo');
select is(
  pg_temp.recusa($$select public.criar_curriculo((select id from _c), date '2048-01-01', 'segundo futuro', date '2046-10-21')$$) ->> 'hint',
  'ja_ha_curriculo_futuro', 'RC-2 · com um futuro, não se cria outro: edita-se o futuro');
select is(
  pg_temp.recusa($$select public.criar_curriculo((select id from _c), date '2046-06-01', 'antes do mais novo', date '2047-06-01')$$) ->> 'hint',
  'curriculo_antes_do_mais_novo', 'RC-2 · o currículo novo começa depois do mais novo');

-- ── A CORREÇÃO DO CURRÍCULO EM USO (RC-6) ──
select pg_temp.sem_justificativa();
select is(
  pg_temp.recusa($$update public.disciplinas set carga_horaria_tempos = 38
                    where curriculo_id = (select id from _v2) and cod_disciplina = 'I'$$) ->> 'recusou',
  'false', 'no currículo que ninguém usa (o 2), mudar a CH segue livre — RC-7');
select set_config('request.jwt.claim.sub', 'a1450000-0000-0000-0000-000000000002', true);
select is(
  pg_temp.recusa($$update public.disciplinas set carga_horaria_tempos = 42
                    where curriculo_id = (select id from _v1) and cod_disciplina = 'I'$$) ->> 'hint',
  'curriculo_em_uso', 'RC-6 · o Operador não corrige o currículo em uso');
select is(
  pg_temp.recusa($$update public.disciplinas set nome_no_dsa = 'Disc I'
                    where curriculo_id = (select id from _v1) and cod_disciplina = 'I'$$) ->> 'recusou',
  'false', 'RC-6 · completar o que estava vazio é livre, inclusive para o Operador');
select set_config('request.jwt.claim.sub', 'a1450000-0000-0000-0000-000000000001', true);
select is(
  pg_temp.recusa($$update public.disciplinas set carga_horaria_tempos = 42
                    where curriculo_id = (select id from _v1) and cod_disciplina = 'I'$$) ->> 'hint',
  'justificativa_obrigatoria', 'RC-6 · o Admin, sem justificativa, é recusado');
select pg_temp.justificar('Correção da CH conforme a página 12 do currículo aprovado');
select is(
  pg_temp.recusa($$update public.disciplinas set carga_horaria_tempos = 42
                    where curriculo_id = (select id from _v1) and cod_disciplina = 'I'$$) ->> 'recusou',
  'false', 'RC-6 · com justificativa, o Admin corrige');
select results_eq(
  $$select tabela, acao, campos, antes, depois, justificativa, autor_id
      from public.correcoes_de_curriculo where curriculo_id = (select id from _v1)$$,
  $$values ('disciplinas'::text, 'alterar'::text, array['carga_horaria_tempos'], '{"carga_horaria_tempos": 40}'::jsonb,
            '{"carga_horaria_tempos": 42}'::jsonb, 'Correção da CH conforme a página 12 do currículo aprovado'::text,
            'a1450000-0000-0000-0000-000000000001'::uuid)$$,
  'RC-6 · a trilha guarda o quê, o valor anterior, o novo, a justificativa e quem');
select is(
  pg_temp.recusa($$insert into public.unidades_ensino (disciplina_id, curso_id, numero_ue, topico, ch_prevista_tempos)
                   select id, curso_id, 2, 'UE nova', 5 from public.disciplinas
                    where curriculo_id = (select id from _v1) and cod_disciplina = 'II'$$) ->> 'recusou',
  'false', 'RC-6 · acrescentar item ao currículo em uso, com justificativa, entra');
select is((select acao from public.correcoes_de_curriculo where tabela = 'unidades_ensino'), 'incluir',
  'e a inclusão fica na trilha');
select pg_temp.sem_justificativa();
select is(
  pg_temp.recusa($$update public.disciplinas set status = 'inativo'
                    where curriculo_id = (select id from _v1) and cod_disciplina = 'II'$$) ->> 'hint',
  'justificativa_obrigatoria', 'RC-6 · inativar item do currículo em uso também é correção');
select is(
  pg_temp.recusa($$update public.curriculos set duracao_semanas = 37 where id = (select id from _v1)$$) ->> 'hint',
  'justificativa_obrigatoria', 'RC-6 · a duração do currículo em uso também (o T da semana do curso)');
select set_config('request.jwt.claim.sub', '', true);
select is(
  pg_temp.recusa($$update public.disciplinas set carga_horaria_tempos = 43
                    where curriculo_id = (select id from _v1) and cod_disciplina = 'I'$$) ->> 'recusou',
  'false', 'D-5 · sem sessão (migration, ETL, script revisto) passa');
select throws_ok(
  $$update public.correcoes_de_curriculo set justificativa = 'reescrita'$$,
  '42501', null, 'Regra 4 · a trilha é imutável');

-- ── O ARQUIVAMENTO (RC-10) ──
select set_config('request.jwt.claim.sub', 'a1450000-0000-0000-0000-000000000001', true);
select is(
  pg_temp.recusa($$select public.arquivar_curriculo((select id from _v1), date '2046-10-21')$$) ->> 'hint',
  'curriculo_nao_passado', 'RC-10 · o vigente não se arquiva');
select is(
  pg_temp.recusa($$select public.arquivar_curriculo((select id from _v1), date '2047-06-01')$$) ->> 'hint',
  'curriculo_com_turma_nao_arquivada', 'RC-10 · o passado com turma não arquivada também não');
insert into public.turma_arquivamentos (turma_id, acao, observacao, autor_id)
values ((select id from _t), 'arquivar', 'T145', 'a1450000-0000-0000-0000-000000000001');
select is(
  pg_temp.recusa($$select public.arquivar_curriculo((select id from _v1), date '2047-06-01')$$) ->> 'recusou',
  'false', 'RC-10 · passado e com todas as turmas arquivadas: o trio arquiva');
select ok(
  (select arquivado_em is not null and arquivado_por = 'a1450000-0000-0000-0000-000000000001'
     from public.curriculos where id = (select id from _v1))
  and (select count(*) from public.curriculos where id = (select id from _v1)) = 1,
  'arquivado guarda quando e quem, e nunca sai (regra 4)');
select is(
  pg_temp.recusa($$select public.desarquivar_curriculo((select id from _v1))$$) ->> 'recusou',
  'false', 'D-28 · e desarquiva');

-- ── D-19 com a RC-6: a situação do currículo tem regra própria, e a recusa certa não vira pedido de justificativa ──
select set_config('request.headers',
  '{"x-justificativa-de-correcao": "' || encode(convert_to('Descartar por engano', 'UTF8'), 'base64') || '"}', true);
select is(
  pg_temp.recusa($$update public.curriculos set status = 'inativo' where id = (select id from _v1)$$) ->> 'hint',
  'versao_em_uso',
  'D-19 · o currículo seguido por turma não se descarta — e a recusa é a da situação, mesmo com justificativa');
select set_config('request.headers', '', true);

select * from finish();
rollback;
