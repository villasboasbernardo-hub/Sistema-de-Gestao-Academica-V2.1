-- =================================================================================
-- 156 — O módulo de Atividades (spec 033, Bloco 18): o «Conta como», as AEC previstas do currículo, a APOINST planejada,
-- a marcação à mão e o vínculo do lançamento (migrations `20261103140231` e `20261103140512`).
--
-- O CASO QUE DISCRIMINA (DoD 8): a MESMA Palestra conta como AEC com `conta_como` nulo e como TAD com `conta_como =
-- 'TAD'`; o MESMO Reforço (TR) sai do TR e entra na CHD da turma, da disciplina e do instrutor com `conta_como = 'CHD'` —
-- e com a coluna nula tudo conta como antes (o efeito zero, medido na cópia do remoto em `specs/033-…/medicao-efeito-
-- zero.md`). A P-3 do pgTAP 135 continua batendo com o ramo novo.
-- ⚠️ Quem pode o quê se prova com sessão REAL em `tests/invariantes/rls/atividades-bloco-18.test.ts`; aqui a sessão é
--    simulada só para a trilha da RC-6 (como no 145).
-- ⚠️ 2049 e códigos próprios (`T156-…`): vale na base limpa e na carregada.
-- =================================================================================
begin;
select plan(52);

create function pg_temp.recusa(p_sql text) returns jsonb
language plpgsql as $f$
declare
  v_hint text;
  v_constraint text;
begin
  execute p_sql;
  return jsonb_build_object('recusou', false);
exception when others then
  get stacked diagnostics v_hint = pg_exception_hint, v_constraint = constraint_name;
  return jsonb_build_object('recusou', true, 'sqlstate', sqlstate, 'hint', v_hint, 'restricao', v_constraint);
end;
$f$;

-- ── estrutura ──────────────────────────────────────────────────────────────────────
select has_table('public', 'aec_previstas_curriculo', 'RA-2 · a tabela das AEC previstas do currículo existe');
select has_table('public', 'apoinst_planejadas', 'RA-6 · a tabela da APOINST planejada existe');
select has_table('public', 'marcacoes_de_atividade', 'RA-5 · a tabela da marcação à mão existe');
select ok(
  (select bool_and(relrowsecurity) from pg_class
    where oid in ('public.aec_previstas_curriculo'::regclass, 'public.apoinst_planejadas'::regclass,
                  'public.marcacoes_de_atividade'::regclass)),
  'as três com RLS ligada'
);
select is(
  (select count(*)::int from pg_policy
    where polrelid in ('public.aec_previstas_curriculo'::regclass, 'public.apoinst_planejadas'::regclass,
                       'public.marcacoes_de_atividade'::regclass) and polcmd = 'd'),
  0,
  'regra 4 · nenhuma policy de DELETE nas três'
);
select ok(
  not has_table_privilege('authenticated', 'public.marcacoes_de_atividade', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.marcacoes_de_atividade', 'DELETE')
  and not has_table_privilege('authenticated', 'public.apoinst_planejadas', 'DELETE')
  and not has_table_privilege('authenticated', 'public.aec_previstas_curriculo', 'DELETE'),
  'regra 4 · authenticated sem DELETE nas três, e sem UPDATE na marcação (só de acréscimo)'
);
select ok(
  (select array_agg(perfil::text order by perfil::text) from public.perfil_permissao
    where recurso = 'planejamento_de_atividades' and acao = 'editar' and permitido)
  = array['admin', 'ajudante_administracao_academica', 'encarregado_administracao_academica']
  and (select count(*) from public.perfil_permissao where recurso = 'planejamento_de_atividades') = 9,
  'D-5 · planejar APOINST e marcar à mão: o trio, e só ele, com linha nos nove perfis'
);
select is(
  (select count(*)::int from public.config_listas
    where lista = 'tipos_atividade'
      and (valor, metadados ->> 'categoria') in (('Desportiva', 'AEC'), ('DeCAT', 'TR'), ('Reforço', 'TR'), ('Outra', 'AEC'))),
  4,
  'decisão 3 · os quatro tipos novos, cada um com a classificação padrão'
);
select ok(
  exists (select 1 from public.config_listas
           where lista = 'tipos_atividade' and valor = 'Atividade Extracurricular'
             and rotulo_exibicao = 'Atividade Extraclasse' and metadados ->> 'categoria' = 'AEC'),
  'decisão 4 · o RÓTULO é «Atividade Extraclasse», o valor e a classificação ficam'
);
select ok(
  app.fn_parametro_numerico('apoinst.ano_inicial', 2049::smallint) = 2027
  and app.fn_parametro_numerico('atividades.aviso_aec_semanas', 2049::smallint) = 4,
  'regra 8 · os dois parâmetros (ano inicial da APOINST e semanas do aviso)'
);
select ok(
  (select bool_and('security_invoker=true' = any (reloptions)) from pg_class
    where relname in ('vw_ocupacao_ta', 'vw_ocupacao_do_dsa', 'vw_chd_por_fato', 'vw_carga_horaria_turma',
                      'vw_disciplinas_execucao', 'vw_instrutor_carga_anual')),
  'gotcha 10 · as seis views recriadas continuam security_invoker'
);

-- ── a amostra ──────────────────────────────────────────────────────────────────────
insert into public.cursos (id, codigo, nome_curso, classificacao, modalidade, duracao_dias) values
  ('a1562000-0000-0000-0000-000000000001', 'T156-CUR', 'Curso T156', 'regular', 'presencial', 30),
  ('a1562000-0000-0000-0000-000000000002', 'T156-OUT', 'Curso T156 outro', 'regular', 'presencial', 30);
insert into public.turmas (id, codigo, curso_id, turma, ano_letivo, status, modalidade, data_inicio, data_termino)
values ('a1565000-0000-0000-0000-000000000001', 'T156-CUR T1 2049', 'a1562000-0000-0000-0000-000000000001',
        'T1', 2049, 'ativa', 'presencial', '2049-03-01', '2049-06-30'),
       ('a1565000-0000-0000-0000-000000000002', 'T156-OUT T1 2049', 'a1562000-0000-0000-0000-000000000002',
        'T1', 2049, 'ativa', 'presencial', '2049-03-01', '2049-06-30');
insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos) values
  ('a1563000-0000-0000-0000-000000000001', 'T156-DIS', 'a1562000-0000-0000-0000-000000000001', 'I', 'D T156', 20),
  ('a1563000-0000-0000-0000-000000000002', 'T156-DOU', 'a1562000-0000-0000-0000-000000000002', 'I', 'D T156o', 20);
insert into public.turma_disciplina (id, codigo, turma_id, disciplina_id)
select 'a1564000-0000-0000-0000-000000000001', 'T156-TDI', 'a1565000-0000-0000-0000-000000000001',
       'a1563000-0000-0000-0000-000000000001'
 where not exists (select 1 from public.turma_disciplina
                    where turma_id = 'a1565000-0000-0000-0000-000000000001'
                      and disciplina_id = 'a1563000-0000-0000-0000-000000000001');
insert into public.instrutores (id, codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om) values
  ('a1561000-0000-0000-0000-00000000000a', 'T156-A', 'CT', '-EF', 'Instrutor T156 A', 'Militar', 'CIAARA'),
  ('a1561000-0000-0000-0000-00000000000b', 'T156-B', 'CT', '-EF', 'Instrutor T156 B', 'Militar', 'CIAARA');
insert into public.turma_disciplina_instrutor (codigo, turma_disciplina_id, instrutor_id, status)
select 'T156-TDI#T156-A', td.id, 'a1561000-0000-0000-0000-00000000000a', 'ativo'
  from public.turma_disciplina td
 where td.turma_id = 'a1565000-0000-0000-0000-000000000001'
   and td.disciplina_id = 'a1563000-0000-0000-0000-000000000001';

-- um tipo de teste (AEC) para a recategorização, sem tocar nos tipos reais
insert into public.config_listas (lista, valor, rotulo_exibicao, ordem, ativo, metadados)
values ('tipos_atividade', 'T156 Tipo', 'T156 Tipo', 999, true, '{"categoria": "AEC"}');

create temporary table _t as
select (select id from public.config_listas where lista = 'tipos_atividade' and valor = 'Palestra') as palestra,
       (select id from public.config_listas where lista = 'tipos_atividade' and valor = 'Reforço') as reforco,
       (select id from public.config_listas where lista = 'tipos_atividade' and valor = 'Monitoria') as monitoria,
       (select id from public.config_listas where lista = 'tipos_atividade' and valor = 'Administração') as administracao,
       (select id from public.config_listas where lista = 'tipos_atividade' and valor = 'T156 Tipo') as teste;

-- Palestra sem escolha (AEC) e a mesma Palestra contando como TAD — o caso que discrimina da RA-1
insert into public.atividades_nao_letivas (id, codigo, turma_id, escopo, data, ta_inicial, tempos_consumidos,
                                           tipo_atividade_id, categoria_normativa, descricao, conta_como)
select 'a1566000-0000-0000-0000-000000000001'::uuid, 'T156-A1', 'a1565000-0000-0000-0000-000000000001'::uuid, 'turma'::public.escopo_atividade,
       '2049-03-10'::date, 1, 2, palestra, 'AEC'::public.categoria_normativa, 'Palestra sem escolha', null::text from _t
union all
select 'a1566000-0000-0000-0000-000000000002'::uuid, 'T156-A2', 'a1565000-0000-0000-0000-000000000001'::uuid, 'turma',
       '2049-03-10', 3, 3, palestra, 'AEC', 'Palestra contando como TAD', 'TAD' from _t;

select is(
  (select array_agg(categoria_normativa::text order by codigo) from public.atividades_nao_letivas
    where codigo in ('T156-A1', 'T156-A2')),
  array['AEC', 'TAD'],
  'RA-1 · a escolha do operador vira a categoria; nula, vale a do tipo'
);
select ok(
  (select ta_aec = 2 and ta_tad = 3 from public.vw_carga_horaria_turma
    where turma_id = 'a1565000-0000-0000-0000-000000000001'),
  'RA-1 · na CH da turma, a Palestra escolhida como TAD conta no TAD, e a outra no AEC'
);

-- Reforço (TR) contando como TA DA DISCIPLINA, com o instrutor do cadastro
insert into public.atividades_nao_letivas (id, codigo, turma_id, escopo, data, ta_inicial, tempos_consumidos,
                                           tipo_atividade_id, categoria_normativa, descricao, conta_como,
                                           disciplina_id, instrutor_id)
select 'a1566000-0000-0000-0000-000000000003', 'T156-A3', 'a1565000-0000-0000-0000-000000000001', 'turma',
       '2049-03-11', 1, 4, reforco, 'TR', 'Reforço na disciplina', 'CHD',
       'a1563000-0000-0000-0000-000000000001', 'a1561000-0000-0000-0000-00000000000a' from _t;

select is(
  (select categoria_normativa::text from public.atividades_nao_letivas where codigo = 'T156-A3'),
  'TR',
  'RA-4 · o «TA da disciplina» guarda a categoria do tipo (a coluna conta_como é que o move)'
);
select ok(
  (select ta_tr = 0 and ta_atividade_na_disciplina = 4 and chd_executada = 4 and cht_executada = 9
     from public.vw_carga_horaria_turma where turma_id = 'a1565000-0000-0000-0000-000000000001'),
  'RA-4 · o «TA da disciplina» sai do TR e entra na CHD da turma (CHT = 4 + 2 + 3)'
);
select ok(
  (select ta_executados = 4 and ta_atividade_executados = 4 and ta_saldo = 16 and data_real_inicio = '2049-03-11'
     from public.vw_disciplinas_execucao
    where turma_id = 'a1565000-0000-0000-0000-000000000001' and disciplina_id = 'a1563000-0000-0000-0000-000000000001'),
  'RA-4 · e na execução da disciplina (TA, saldo e data real)'
);
select is(
  (select count(*)::int from public.vw_chd_por_fato
    where turma_id = 'a1565000-0000-0000-0000-000000000001' and origem = 'atividade_na_disciplina' and tempos = 4),
  1,
  'RA-4 · é fato da CHD (vw_chd_por_fato)'
);
select is(
  (select ta_ministrado_ano::int from public.vw_instrutor_carga_anual
    where instrutor_id = 'a1561000-0000-0000-0000-00000000000a' and ano = 2049),
  4,
  'RA-4 · e soma na carga ministrada do instrutor, no ano da turma'
);
select is(
  (select disciplina_id from public.vw_ocupacao_ta where fato_id = 'a1566000-0000-0000-0000-000000000003'),
  'a1563000-0000-0000-0000-000000000001'::uuid,
  'RA-4 · ocupa como aula, com a disciplina'
);
select is(
  (select disciplina_id from public.vw_ocupacao_ta where fato_id = 'a1566000-0000-0000-0000-000000000001'),
  null,
  'RA-4 · a atividade sem escolha continua sem disciplina na ocupação (como antes)'
);
select ok(
  (select c.chd_executada from public.vw_carga_horaria_turma c
    where c.turma_id = 'a1565000-0000-0000-0000-000000000001')
  = (select x.chd_executada from public.chd_da_turma_ate(date '2099-12-31') x
      where x.turma_id = 'a1565000-0000-0000-0000-000000000001'),
  'P-3 (pgTAP 135) · a CHD da turma bate entre a view e a função «até» com o ramo novo'
);

select is(
  pg_temp.recusa($$insert into public.atividades_nao_letivas (codigo, turma_id, escopo, data, ta_inicial,
                    tempos_consumidos, tipo_atividade_id, categoria_normativa, descricao, conta_como)
                    select 'T156-X1', 'a1565000-0000-0000-0000-000000000001', 'turma', '2049-03-12', 1, 1, reforco,
                           'TR', 'sem disciplina', 'CHD' from _t$$) ->> 'restricao',
  'ativ_conta_como_chd_com_disciplina',
  'RA-4 · «TA da disciplina» sem disciplina é recusado'
);
select is(
  pg_temp.recusa($$insert into public.atividades_nao_letivas (codigo, turma_id, escopo, data, ta_inicial,
                    tempos_consumidos, tipo_atividade_id, categoria_normativa, descricao, disciplina_id)
                    select 'T156-X2', 'a1565000-0000-0000-0000-000000000001', 'turma', '2049-03-12', 1, 1,
                           administracao, 'TAD', 'TAD com disciplina', 'a1563000-0000-0000-0000-000000000001'
                      from _t$$) ->> 'restricao',
  'ativ_disciplina_so_aec_da_turma',
  'regressão do 121 · a TAD sem escolha continua sem disciplina (o CHECK ampliado não passa com o NULO)'
);
select is(
  pg_temp.recusa($$insert into public.atividades_nao_letivas (codigo, turma_id, escopo, data, ta_inicial,
                    tempos_consumidos, tipo_atividade_id, categoria_normativa, descricao, conta_como,
                    quantidade_alunos)
                    select 'T156-X3', 'a1565000-0000-0000-0000-000000000001', 'turma', '2049-03-12', 1, 1, monitoria,
                           'Apoio_Individualizado', 'Monitoria', 'AEC', 2 from _t$$) ->> 'hint',
  'conta_como_fora_da_cht',
  'decisão 2 · Monitoria (Apoio Individualizado) não troca a classificação'
);

-- a recategorização do tipo respeita a escolha do operador
insert into public.atividades_nao_letivas (id, codigo, turma_id, escopo, data, ta_inicial, tempos_consumidos,
                                           tipo_atividade_id, categoria_normativa, descricao, conta_como)
select 'a1566000-0000-0000-0000-000000000004'::uuid, 'T156-A4', 'a1565000-0000-0000-0000-000000000001'::uuid, 'turma'::public.escopo_atividade,
       '2049-03-13'::date, 1, 1, teste, 'AEC'::public.categoria_normativa, 'Teste sem escolha', null::text from _t
union all
select 'a1566000-0000-0000-0000-000000000005'::uuid, 'T156-A5', 'a1565000-0000-0000-0000-000000000001'::uuid, 'turma',
       '2049-03-13', 2, 1, teste, 'AEC', 'Teste escolhido TR', 'TR' from _t;
update public.config_listas set metadados = '{"categoria": "TAD"}' where lista = 'tipos_atividade' and valor = 'T156 Tipo';
select is(
  (select array_agg(categoria_normativa::text order by codigo) from public.atividades_nao_letivas
    where codigo in ('T156-A4', 'T156-A5')),
  array['TAD', 'TR'],
  'RA-1 · trocar a classificação padrão do tipo recategoriza a linha sem escolha e preserva a escolhida'
);
select ok(
  (select editado_em is null from public.atividades_nao_letivas where codigo = 'T156-A5'),
  'RA-1 · a recategorização nem toca a linha com escolha (o filtro da M2, não o gatilho, a preserva)'
);

-- a recategorização pula a linha da turma ARQUIVADA (revisão do Bloco 18): sem o filtro, a trava da arquivada recusaria a
-- linha e a troca inteira do catálogo seria desfeita
insert into public.turmas (id, codigo, curso_id, turma, ano_letivo, status, modalidade, data_inicio, data_termino)
values ('a1565000-0000-0000-0000-000000000009', 'T156-CUR T9 2049', 'a1562000-0000-0000-0000-000000000001',
        'T9', 2049, 'concluida', 'presencial', '2049-03-01', '2049-06-30');
insert into public.atividades_nao_letivas (id, codigo, turma_id, escopo, data, ta_inicial, tempos_consumidos,
                                           tipo_atividade_id, categoria_normativa, descricao)
select 'a1566000-0000-0000-0000-000000000009', 'T156-A9', 'a1565000-0000-0000-0000-000000000009', 'turma',
       '2049-03-13', 1, 1, teste, 'TAD', 'Na turma que vai ser arquivada' from _t;
insert into public.turma_arquivamentos (turma_id, acao, observacao)
values ('a1565000-0000-0000-0000-000000000009', 'arquivar', 'Encerrada (T156)');
select is(
  pg_temp.recusa($$update public.config_listas set metadados = '{"categoria": "TR"}'
                    where lista = 'tipos_atividade' and valor = 'T156 Tipo'$$) ->> 'recusou',
  'false',
  'RA-1 · trocar a classificação de um tipo com lançamento em turma arquivada passa'
);
select is(
  (select array_agg(categoria_normativa::text order by codigo) from public.atividades_nao_letivas
    where codigo in ('T156-A4', 'T156-A9')),
  array['TR', 'TAD'],
  'RT-8 · a linha da turma sem arquivo segue o tipo; a da arquivada fica com a categoria que tinha'
);

-- ── as AEC previstas do currículo (RA-2) ──────────────────────────────────────────
create temporary table _c as
select (select id from public.curriculos where curso_id = 'a1562000-0000-0000-0000-000000000001') as cur,
       (select id from public.curriculos where curso_id = 'a1562000-0000-0000-0000-000000000002') as outro;

insert into public.aec_previstas_curriculo (id, curso_id, curriculo_id, nome, tipo_atividade_id, ta_previstos, obrigatoria)
select 'a1567000-0000-0000-0000-000000000001', 'a1562000-0000-0000-0000-000000000001', cur, 'Amazônia Azul',
       (select palestra from _t), 4, true from _c;
insert into public.aec_previstas_curriculo (id, curso_id, nome, tipo_atividade_id, ta_previstos, obrigatoria)
select 'a1567000-0000-0000-0000-000000000002', 'a1562000-0000-0000-0000-000000000001', 'Visita sem TA',
       (select palestra from _t), null, false;
select ok(
  (select codigo like 'AEP-%' and curriculo_id = (select cur from _c)
     from public.aec_previstas_curriculo where id = 'a1567000-0000-0000-0000-000000000002'),
  'RA-2 · sem currículo, vai para o único ativo do curso; código AEP-; TA vazio aceito'
);
select is(
  pg_temp.recusa($$insert into public.aec_previstas_curriculo (curso_id, nome, tipo_atividade_id)
                   select 'a1562000-0000-0000-0000-000000000001', 'Tipo TAD', administracao from _t$$) ->> 'hint',
  'aec_prevista_tipo_sem_aec',
  'RA-2 · o tipo da AEC prevista tem de ser de classificação AEC'
);
select is(
  pg_temp.recusa($$insert into public.aec_previstas_curriculo (curso_id, nome, tipo_atividade_id, disciplina_id)
                   select 'a1562000-0000-0000-0000-000000000001', 'Disciplina de outro', palestra,
                          'a1563000-0000-0000-0000-000000000002' from _t$$) ->> 'hint',
  'disciplina_de_outra_versao',
  'RA-2 · a disciplina tem de ser do mesmo currículo'
);
select is(
  (select count(*)::int from public.correcoes_de_curriculo where tabela = 'aec_previstas_curriculo'
     and curriculo_id = (select cur from _c)),
  0,
  'D-5 da spec 021 · sem sessão (script, migration) a inclusão passa sem trilha'
);

-- RC-6 com sessão simulada: o currículo do T156-CUR já é EM USO (a turma tem atividade salva)
insert into auth.users (id, email, aud, role) values
  ('a1560000-0000-0000-0000-000000000001', 't156-enc@ciaara.teste', 'authenticated', 'authenticated');
insert into public.usuarios (codigo, auth_user_id, email, nome, perfil, escopo_curso) values
  ('T156-ENC', 'a1560000-0000-0000-0000-000000000001', 't156-enc@ciaara.teste', 'Encarregado T156',
   'encarregado_administracao_academica', 'geral');
select ok(app.curriculo_em_uso_com_lancamento((select cur from _c)), 'RC-6 · o currículo da amostra está em uso');
select set_config('request.jwt.claim.sub', 'a1560000-0000-0000-0000-000000000001', true);
select is(
  pg_temp.recusa($$insert into public.aec_previstas_curriculo (curso_id, curriculo_id, nome, tipo_atividade_id)
                   select 'a1562000-0000-0000-0000-000000000001', (select cur from _c), 'Sem justificativa', palestra
                     from _t$$) ->> 'hint',
  'justificativa_obrigatoria',
  'RC-6 · incluir AEC prevista no currículo em uso pede a justificativa'
);
select set_config('request.headers',
                  jsonb_build_object('x-justificativa-de-correcao',
                                     encode(convert_to('Carga inicial das AEC previstas (teste)', 'UTF8'), 'base64'))::text,
                  true);
insert into public.aec_previstas_curriculo (id, curso_id, curriculo_id, nome, tipo_atividade_id, ta_previstos)
select 'a1567000-0000-0000-0000-000000000003', 'a1562000-0000-0000-0000-000000000001', (select cur from _c),
       'Com justificativa', palestra, 2 from _t;
select ok(
  exists (select 1 from public.correcoes_de_curriculo
           where tabela = 'aec_previstas_curriculo' and acao = 'incluir'
             and registro_id = 'a1567000-0000-0000-0000-000000000003'
             and justificativa = 'Carga inicial das AEC previstas (teste)'
             and autor_id = 'a1560000-0000-0000-0000-000000000001'),
  'RC-6 · com a justificativa, a inclusão grava a trilha (quem, o quê, a justificativa)'
);
select set_config('request.headers', '{}', true);

-- RC-7: o currículo novo copia as AEC previstas ATIVAS do vigente, com a linhagem (a cópia é do trio: cursos.editar)
create temporary table _copia as
select public.criar_curriculo('a1562000-0000-0000-0000-000000000001', date '2051-01-01', 'Cópia T156',
                              date '2050-06-01') as nova;
select ok(
  (select count(*) from public.aec_previstas_curriculo p
     join public.aec_previstas_curriculo o on o.linhagem_id = p.linhagem_id and o.curriculo_id = (select cur from _c)
    where p.curriculo_id = (select nova from _copia))
  = (select count(*) from public.aec_previstas_curriculo where curriculo_id = (select cur from _c) and status = 'ativo'),
  'RC-7 · Novo currículo copia as AEC previstas ativas, com a mesma linhagem'
);
select set_config('request.jwt.claim.sub', '', true);

-- a AEC prevista cujo tipo o Admin reclassificou depois continua editável (revisão do Bloco 18)
update public.config_listas set metadados = '{"categoria": "AEC"}' where lista = 'tipos_atividade' and valor = 'T156 Tipo';
insert into public.aec_previstas_curriculo (id, curso_id, nome, tipo_atividade_id)
select 'a1567000-0000-0000-0000-000000000009', 'a1562000-0000-0000-0000-000000000002', 'Do tipo de teste', teste from _t;
update public.config_listas set metadados = '{"categoria": "TAD"}' where lista = 'tipos_atividade' and valor = 'T156 Tipo';
select is(
  pg_temp.recusa($$update public.aec_previstas_curriculo set nome = 'Renomeada'
                    where id = 'a1567000-0000-0000-0000-000000000009'$$) ->> 'recusou',
  'false',
  'RA-2 · a classificação do tipo só se confere quando o tipo nasce ou muda — editar o nome passa'
);

-- ── o vínculo do lançamento (RA-4) ────────────────────────────────────────────────
insert into public.atividades_nao_letivas (id, codigo, turma_id, escopo, data, ta_inicial, tempos_consumidos,
                                           tipo_atividade_id, categoria_normativa, descricao, atividade_prevista_id,
                                           responsavel_externo, responsavel_externo_om)
select 'a1566000-0000-0000-0000-000000000006', 'T156-A6', 'a1565000-0000-0000-0000-000000000001', 'turma',
       '2049-03-14', 1, 4, palestra, 'AEC', 'Amazônia Azul', 'a1567000-0000-0000-0000-000000000001',
       'Palestrante T156', 'OM T156' from _t;
select ok(
  exists (select 1 from public.atividades_nao_letivas where codigo = 'T156-A6'
             and atividade_prevista_id = 'a1567000-0000-0000-0000-000000000001'
             and responsavel_externo_om = 'OM T156'),
  'RA-4 · a palestra cumpre a AEC prevista do currículo da turma, com o palestrante de fora e a OM'
);
select is(
  pg_temp.recusa($$insert into public.atividades_nao_letivas (codigo, turma_id, escopo, data, ta_inicial,
                    tempos_consumidos, tipo_atividade_id, categoria_normativa, descricao, atividade_prevista_id)
                    select 'T156-X4', 'a1565000-0000-0000-0000-000000000002', 'turma', '2049-03-14', 1, 1, palestra,
                           'AEC', 'Outro currículo', 'a1567000-0000-0000-0000-000000000001' from _t$$) ->> 'hint',
  'vinculo_fora_do_curriculo_da_turma',
  'RA-4 · a AEC prevista de outro currículo é recusada'
);
select is(
  pg_temp.recusa($$insert into public.atividades_nao_letivas (codigo, escopo, data, ta_inicial, tempos_consumidos,
                    tipo_atividade_id, categoria_normativa, descricao, atividade_prevista_id)
                    select 'T156-X5', 'global', '2049-03-14', 1, 1, palestra, 'AEC', 'Global',
                           'a1567000-0000-0000-0000-000000000001' from _t$$) ->> 'sqlstate',
  '23514',
  -- ⚠️ Quem recusa primeiro é o porteiro do vínculo (gatilho BEFORE roda antes do CHECK `ativ_vinculo_so_de_turma`).
  'RA-4 · a atividade de todas as turmas não cumpre AEC prevista'
);
select is(
  pg_temp.recusa($$insert into public.atividades_nao_letivas (codigo, turma_id, escopo, data, ta_inicial,
                    tempos_consumidos, tipo_atividade_id, categoria_normativa, descricao, instrutor_id,
                    responsavel_externo_om)
                    select 'T156-X6', 'a1565000-0000-0000-0000-000000000001', 'turma', '2049-03-15', 1, 1, palestra,
                           'AEC', 'OM sem externo', 'a1561000-0000-0000-0000-00000000000a', 'DHN' from _t$$)
    ->> 'restricao',
  'ativ_om_so_do_externo',
  'RA-4 · a OM é só do responsável de fora'
);

-- desativada a AEC prevista, o vínculo NOVO é recusado, mas a SOMBRA do rascunho do lançamento já ligado passa (revisão
-- do Bloco 18: sem isso, o lançamento ficaria sem edição nem exclusão no DSA)
update public.aec_previstas_curriculo set status = 'inativo' where id = 'a1567000-0000-0000-0000-000000000001';
select is(
  pg_temp.recusa($$insert into public.atividades_nao_letivas (codigo, turma_id, escopo, data, ta_inicial,
                    tempos_consumidos, tipo_atividade_id, categoria_normativa, descricao, atividade_prevista_id)
                    select 'T156-X7', 'a1565000-0000-0000-0000-000000000001', 'turma', '2049-03-16', 1, 1, palestra,
                           'AEC', 'Vínculo novo com desativada', 'a1567000-0000-0000-0000-000000000001' from _t$$)
    ->> 'hint',
  'vinculo_fora_do_curriculo_da_turma',
  'RA-4 · vínculo NOVO com AEC prevista desativada é recusado'
);
select is(
  pg_temp.recusa($$insert into public.atividades_nao_letivas (codigo, turma_id, escopo, data, ta_inicial,
                    tempos_consumidos, tipo_atividade_id, categoria_normativa, descricao, atividade_prevista_id,
                    responsavel_externo, responsavel_externo_om, salvo, rascunho_de)
                    select 'T156-A6-S', turma_id, escopo, data, ta_inicial, tempos_consumidos, tipo_atividade_id,
                           categoria_normativa, descricao, atividade_prevista_id, responsavel_externo,
                           responsavel_externo_om, false, id
                      from public.atividades_nao_letivas where codigo = 'T156-A6'$$) ->> 'recusou',
  'false',
  'RA-4 · a sombra do rascunho que mantém o vínculo do salvo passa, com a AEC prevista desativada'
);

-- ── a APOINST planejada (RA-6) ─────────────────────────────────────────────────────
insert into public.apoinst_planejadas (id, turma_id, disciplina_id, instrutor_id, nome, inicio_previsto, fim_previsto,
                                       ta_previstos)
values ('a1568000-0000-0000-0000-000000000001', 'a1565000-0000-0000-0000-000000000001',
        'a1563000-0000-0000-0000-000000000001', 'a1561000-0000-0000-0000-00000000000a', 'Prática T156',
        '2049-04-01', '2049-04-30', 8);
select ok(
  (select codigo like 'APO-%' from public.apoinst_planejadas where id = 'a1568000-0000-0000-0000-000000000001'),
  'RA-6 · a APOINST da turma de 2049, com o instrutor designado, entra (código APO-)'
);
select is(
  pg_temp.recusa($$insert into public.apoinst_planejadas (turma_id, disciplina_id, instrutor_id, nome, inicio_previsto,
                   fim_previsto, ta_previstos)
                   values ('a1565000-0000-0000-0000-000000000001', 'a1563000-0000-0000-0000-000000000001',
                           'a1561000-0000-0000-0000-00000000000b', 'Não designado', '2049-04-01', '2049-04-30', 8)$$)
    ->> 'hint',
  'apoinst_instrutor_nao_designado',
  'RA-6 · o instrutor responsável tem de ser designado na disciplina da turma'
);
-- ⚠️ O ano inicial é PARÂMETRO (regra 8): para provar a recusa sem amostra de ano passado (cujo currículo dependeria
--    da data em que o teste roda), o parâmetro sobe para depois da turma, dentro da transação.
update public.config_parametros set valor = '2050' where chave = 'apoinst.ano_inicial' and status = 'ativo';
select is(
  pg_temp.recusa($$insert into public.apoinst_planejadas (turma_id, disciplina_id, instrutor_id, nome, inicio_previsto,
                   fim_previsto, ta_previstos)
                   values ('a1565000-0000-0000-0000-000000000001', 'a1563000-0000-0000-0000-000000000001',
                           'a1561000-0000-0000-0000-00000000000a', 'Antes do ano inicial', '2049-04-01', '2049-04-30', 8)$$)
    ->> 'hint',
  'apoinst_antes_do_ano_inicial',
  'RA-6 · turma de ano anterior ao parâmetro não recebe APOINST'
);
update public.config_parametros set valor = '2027' where chave = 'apoinst.ano_inicial' and status = 'ativo';
select is(
  pg_temp.recusa($$insert into public.apoinst_planejadas (turma_id, disciplina_id, instrutor_id, nome, inicio_previsto,
                   fim_previsto, ta_previstos)
                   values ('a1565000-0000-0000-0000-000000000001', 'a1563000-0000-0000-0000-000000000001',
                           'a1561000-0000-0000-0000-00000000000a', 'Fim antes do início', '2049-04-30', '2049-04-01', 8)$$)
    ->> 'restricao',
  'apoinst_periodo_valido',
  'RA-6 · o fim previsto não vem antes do início'
);
select is(
  pg_temp.recusa($$update public.apoinst_planejadas set turma_id = 'a1565000-0000-0000-0000-000000000002'
                    where id = 'a1568000-0000-0000-0000-000000000001'$$) ->> 'hint',
  'apoinst_de_outra_turma',
  'RA-6 · a APOINST não muda de turma'
);

-- ── a marcação à mão (RA-5) ─────────────────────────────────────────────────────────
insert into public.marcacoes_de_atividade (id, turma_id, atividade_prevista_id, situacao, justificativa)
values ('a1569000-0000-0000-0000-000000000001', 'a1565000-0000-0000-0000-000000000001',
        'a1567000-0000-0000-0000-000000000002', 'cumprida', 'Realizada na OM, sem lançamento no DSA.');
select ok(
  (select codigo like 'MAT-%' and autor_nome is null from public.marcacoes_de_atividade
    where id = 'a1569000-0000-0000-0000-000000000001'),
  'RA-5 · a marcação entra (código MAT-); sem sessão, o autor fica nulo'
);
select is(
  pg_temp.recusa($$update public.marcacoes_de_atividade set justificativa = 'Reescrevendo a trilha.'
                    where id = 'a1569000-0000-0000-0000-000000000001'$$) ->> 'sqlstate',
  '42501',
  'RA-5 · a marcação não se reescreve, nem pela service_role'
);
select is(
  pg_temp.recusa($$insert into public.marcacoes_de_atividade (turma_id, atividade_prevista_id, situacao, justificativa)
                   values ('a1565000-0000-0000-0000-000000000002', 'a1567000-0000-0000-0000-000000000002',
                           'cumprida', 'De outra turma, outro currículo.')$$) ->> 'hint',
  'marcacao_fora_da_turma',
  'RA-5 · a AEC prevista de outro currículo não se marca nesta turma'
);
select is(
  pg_temp.recusa($$insert into public.marcacoes_de_atividade (turma_id, apoinst_id, situacao, justificativa)
                   values ('a1565000-0000-0000-0000-000000000001', 'a1568000-0000-0000-0000-000000000001',
                           'cumprida', 'curta')$$) ->> 'sqlstate',
  '23514',
  'RA-5 · justificativa com menos de 10 caracteres é recusada'
);

select * from finish();
rollback;
