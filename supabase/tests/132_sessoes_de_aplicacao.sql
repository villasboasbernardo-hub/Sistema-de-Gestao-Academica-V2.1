-- =================================================================================
-- 132 — Spec 014, emenda de 15/10/2026 (desenho aprovado em 16/10/2026): as SESSÕES DE APLICAÇÃO, o instrumento
--       da prova, a vista obrigatória pelo instrumento e a janela (migrations E-6 `20261016092307` e D-9
--       `20261016092315`).
--
-- RN-AV-12: a prova em N sessões é UMA avaliação (RN-AVAL-02, Risco Alto) — a sessão 2..N é filha dela, e o TA de
--           cada sessão entra na CHD.
-- RN-AV-13: a vista é obrigatória pelo INSTRUMENTO — PM, PO e PE (16/10/2026). O caso que discrimina (DoD 8): a PP
--           com tempo de vista no item, aplicada há 8 dias e sem vista, era «atrasada» pela regra antiga (o tempo de
--           vista do item) e é «concluida» pela nova; a PM SEM tempo de vista no item é o inverso.
-- ⚠️ Autorização NÃO se prova aqui (pgTAP roda como dono): a RLS da tabela nova e o porteiro de juntar com sessão
--    real estão em `tests/invariantes/rls/sessoes-de-aplicacao.test.ts`. Aqui, só o porteiro que falha FECHADO sem
--    sessão (gotcha 15) e a regra do banco.
-- =================================================================================
begin;
select plan(30);

select public.criar_curso_com_regime(
  '{"codigo":"T132-CUR","nome_curso":"Curso T132","classificacao":"regular",
    "modalidade":"presencial","duracao_dias":300}'::jsonb,
  '{"regime_tempos":8,"ta_duracao_min":45,"intervalo_manha_min":10,"intervalo_tarde_min":10,
    "hora_inicio_manha":"07:30","hora_inicio_tarde":"13:30","vigente_de":"2047-01-01"}'::jsonb);
create temporary table _t132 as select id as curso_id from public.cursos where codigo = 'T132-CUR';
insert into public.config_listas (lista, valor, rotulo_exibicao) values ('tipos_avaliacao', 'Prova T132', 'Prova T132')
  on conflict do nothing;
insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos) values
  ('20320000-0000-0000-0000-000000000001', 'T132-D1', (select curso_id from _t132), 'T132', 'Disciplina T132', 40);
insert into public.turmas (id, curso_id, turma, ano_letivo, status, modalidade, data_inicio, data_termino) values
  ('50320000-0000-0000-0000-000000000001', (select curso_id from _t132), 'T1', 2047,
   'ativa', 'presencial', '2047-01-05', '2047-11-30');
insert into public.instrutores (id, codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om) values
  ('32329999-0000-0000-0000-000000000001', 'T132-INS', 'CT', '-EF', 'Instrutor T132', 'Militar', 'CIAARA');

create temporary table _i132 as
  select valor, id from public.config_listas where lista = 'instrumentos_avaliacao';

-- Itens do currículo (sem sessão: a carga não passa pelo porteiro do arbitrado).
insert into public.avaliacoes_curriculo (id, disciplina_id, curso_id, ordem, instrumento_id, numero, origem_item,
                                         fonte_arquivo, fonte_pagina, ta_aplicacao, origem_ta_aplicacao, ta_vista, origem_ta_vista)
select v.id::uuid, '20320000-0000-0000-0000-000000000001', curso_id, v.ordem, (select id from _i132 where valor = v.instr),
       1, 'curriculo', 'T132.pdf', 1, 2, 'curriculo', v.vista, case when v.vista is null then null else 'curriculo' end
  from _t132, (values ('32320000-0000-0000-0000-0000000000a1', 1, 'PP', 2),     -- PP COM tempo de vista
                      ('32320000-0000-0000-0000-0000000000a2', 2, 'PM', null),  -- PM SEM tempo de vista
                      ('32320000-0000-0000-0000-0000000000a3', 3, 'PE', 1)) as v(id, ordem, instr, vista);

-- Avaliações aplicadas em 01/10/2047, sem vista (hoje = 09/10 → 8º dia).
insert into public.avaliacoes (id, codigo, turma_id, disciplina_id, curso_id, tipo_avaliacao, data_avaliacao, ta_inicial,
                               tempos_consumidos, instrutor_responsavel_id, fiscal_id, avaliacao_curriculo_id, instrumento_id)
select v.id::uuid, v.codigo, '50320000-0000-0000-0000-000000000001', '20320000-0000-0000-0000-000000000001', curso_id,
       'Prova T132', '2047-10-01', v.ta, 2, '32329999-0000-0000-0000-000000000001', null, v.item::uuid,
       (select id from _i132 where valor = v.instr)
  from _t132, (values ('32320000-0000-0000-0000-000000000001', 'T132-PP', 1, '32320000-0000-0000-0000-0000000000a1', null),
                      ('32320000-0000-0000-0000-000000000002', 'T132-PM', 3, '32320000-0000-0000-0000-0000000000a2', null),
                      ('32320000-0000-0000-0000-000000000003', 'T132-PE', 5, '32320000-0000-0000-0000-0000000000a3', null),
                      ('32320000-0000-0000-0000-000000000004', 'T132-SEM-PP', 7, null, 'PP'),
                      ('32320000-0000-0000-0000-000000000005', 'T132-SEM-NADA', 1, null, null)) as v(id, codigo, ta, item, instr);

-- ── estrutura (A1) ──
select has_table('public', 'sessoes_de_aplicacao', 'A1 · a tabela das sessões de aplicação existe');
select ok((select relrowsecurity from pg_class where oid = 'public.sessoes_de_aplicacao'::regclass),
  'A1 · RLS ligada');
select is((select count(*)::int from pg_policy where polrelid = 'public.sessoes_de_aplicacao'::regclass), 3,
  'A1 · três policies (ler, criar, editar), como as de vistas_de_avaliacao');
select is((select count(*)::int from pg_policy where polcmd = 'd'), 0,
  'Regra 4 · zero policy de DELETE no catálogo inteiro, com a tabela nova');
select ok(not has_table_privilege('authenticated', 'public.sessoes_de_aplicacao', 'DELETE')
          and not has_table_privilege('authenticated', 'public.sessoes_de_aplicacao', 'TRUNCATE'),
  'Regra 4 · authenticated sem DELETE e sem TRUNCATE na tabela nova');
select throws_ok($$insert into public.sessoes_de_aplicacao (avaliacao_id, numero, data, ta_inicial, tempos_consumidos)
                   values ('32320000-0000-0000-0000-000000000001', 1, '2047-10-02', 1, 2)$$,
  '23514', null, 'RN-AV-12 · a sessão 1 é a própria avaliação: a tabela só aceita 2..N');
select throws_ok($$insert into public.sessoes_de_aplicacao (avaliacao_id, numero, data, ta_inicial, tempos_consumidos)
                   values ('32320000-0000-0000-0000-000000000001', 2, '2047-09-30', 1, 2)$$,
  '23514', null, 'RN-AV-12 · sessão antes da 1ª aplicação recusada');

-- ── o instrumento da prova (A2) ──
select throws_ok($$update public.avaliacoes set instrumento_id = (select id from public.config_listas where lista = 'tipos_avaliacao' limit 1)
                    where id = '32320000-0000-0000-0000-000000000005'$$,
  '23514', null, 'A2 · instrumento fora de instrumentos_avaliacao recusado');
select throws_ok($$update public.avaliacoes set instrumento_id = (select id from _i132 where valor = 'PM')
                    where id = '32320000-0000-0000-0000-000000000001'$$,
  '23514', null, 'A2 · com item ligado, instrumento diferente do do item recusado');
select lives_ok($$update public.avaliacoes set instrumento_id = (select id from _i132 where valor = 'PP')
                   where id = '32320000-0000-0000-0000-000000000001'$$,
  'A2 · com item ligado, o mesmo instrumento do item é aceito (controle positivo)');
update public.avaliacoes set instrumento_id = null where id = '32320000-0000-0000-0000-000000000001';

-- ── o dado da D-9 ──
select is((select string_agg(valor, ',' order by valor) from public.config_listas
            where lista = 'instrumentos_avaliacao' and (metadados ->> 'vista_obrigatoria')::boolean),
  'PE,PM,PO', 'D-9 · RN-AV-13 (16/10/2026): a vista é obrigatória para PE, PM e PO');
select is((select count(*)::int from public.config_listas
            where lista = 'instrumentos_avaliacao' and metadados ->> 'vista_obrigatoria' is null), 0,
  'D-9 · todo instrumento traz a marca (true ou false), nenhum sem');
select is(app.fn_parametro_numerico('avaliacao.janela_sessoes_dias')::int, 7,
  'D-9 · RN-AV-12: a janela das sessões é dado, 7 dias');

-- ── RN-AV-13: a situação pelo instrumento (A4) ──
select is(app.fn_status_vista('32320000-0000-0000-0000-000000000001', '2047-10-09', 7), 'concluida',
  'RN-AV-13 · DISCRIMINA: PP com tempo de vista no item, 8º dia sem vista — concluída (era atrasada pelo tempo)');
select is(app.fn_status_vista('32320000-0000-0000-0000-000000000002', '2047-10-09', 7), 'atrasada',
  'RN-AV-13 · DISCRIMINA: PM SEM tempo de vista no item, 8º dia sem vista — atrasada (era concluída pelo tempo)');
select is(app.fn_status_vista('32320000-0000-0000-0000-000000000003', '2047-10-09', 7), 'atrasada',
  'RN-AV-13 · PE exige vista (decisão de 16/10/2026)');
select is(app.fn_status_vista('32320000-0000-0000-0000-000000000004', '2047-10-09', 7), 'concluida',
  'RN-AV-13 · prova SEM item com instrumento PP (avaliacoes.instrumento_id) não exige vista');
select is(app.fn_status_vista('32320000-0000-0000-0000-000000000005', '2047-10-09', 7), 'atrasada',
  'RN-AV-13 · prova sem item e sem instrumento: exige, como antes da emenda (controle)');

-- ── RN-AV-12: a sessão 2 (A1, A3) ──
insert into public.sessoes_de_aplicacao (avaliacao_id, numero, data, ta_inicial, tempos_consumidos, local)
  values ('32320000-0000-0000-0000-000000000002', 2, '2047-10-06', 4, 3, 'Sala T132');
select is(app.fn_status_vista('32320000-0000-0000-0000-000000000002', '2047-10-09', 7), 'em_andamento',
  'RN-AV-12 · o prazo da vista conta da ÚLTIMA sessão (06/10): no dia 09/10 a PM está em andamento');
select is(app.fn_status_vista('32320000-0000-0000-0000-000000000002', '2047-10-14', 7), 'atrasada',
  'RN-AV-12 · 8º dia depois da última sessão: atrasada');
select is((select ta_avaliacao from public.vw_carga_horaria_turma where turma_id = '50320000-0000-0000-0000-000000000001'),
  (5 * 2 + 3)::bigint, 'RN-AV-12 · a CHD soma a aplicação das cinco avaliações (10) e a sessão 2 (3)');
select is((select ta_avaliacao_executados from public.vw_disciplinas_execucao
            where turma_id = '50320000-0000-0000-0000-000000000001' and disciplina_id = '20320000-0000-0000-0000-000000000001'),
  13::bigint, 'RN-AV-12 · vw_disciplinas_execucao soma a sessão');
select is((select (origem, numero_sessao, fiscal_id is null, instrutor_id)::text from public.vw_ocupacao_ta
            where fato_id = '32320000-0000-0000-0000-000000000002' and origem = 'sessao_aplicacao'),
  ('sessao_aplicacao', 2, true, '32329999-0000-0000-0000-000000000001')::text,
  'RN-AV-12 · vw_ocupacao_ta: a sessão ocupa o TA dela, com o aplicador da avaliação');
select is((select ta_ministrado_ano from public.vw_instrutor_carga_anual
            where instrutor_id = '32329999-0000-0000-0000-000000000001' and ano = 2047),
  13::numeric, 'RN-AV-12 · a carga do aplicador soma a sessão (10 + 3)');
select is(public.gravar_lancamentos_em_transacao(jsonb_build_array(jsonb_build_object(
            'acao', 'inserir', 'tabela', 'sessoes_de_aplicacao',
            'campos', jsonb_build_object('avaliacao_id', '32320000-0000-0000-0000-000000000002', 'numero', 3,
                                         'data', '2047-10-07', 'ta_inicial', 1, 'tempos_consumidos', 1)))),
  1, 'A3 · gravar_lancamentos_em_transacao aceita a sessão de aplicação');

-- ── juntar como sessão (a trilha) ──
select throws_ok($$select public.juntar_como_sessao('32320000-0000-0000-0000-000000000004', '32320000-0000-0000-0000-000000000005')$$,
  '42501', null, 'Gotcha 15 · juntar sem sessão é recusado: o porteiro falha FECHADO');
insert into public.sessoes_de_aplicacao (avaliacao_id, numero, data, ta_inicial, tempos_consumidos, juntada_de_avaliacao_id,
                                         juntada_em, avaliacao_juntada_antes)
  values ('32320000-0000-0000-0000-000000000004', 2, '2047-10-02', 1, 2, '32320000-0000-0000-0000-000000000005',
          now(), '{"codigo":"T132-SEM-NADA"}');
select throws_ok($$update public.sessoes_de_aplicacao set juntada_em = now() - interval '1 day'
                    where juntada_de_avaliacao_id = '32320000-0000-0000-0000-000000000005'$$,
  '42501', null, 'Trilha · quando a junção aconteceu não muda');
select throws_ok($$update public.sessoes_de_aplicacao set avaliacao_id = '32320000-0000-0000-0000-000000000002', numero = 9
                    where juntada_de_avaliacao_id = '32320000-0000-0000-0000-000000000005'$$,
  '42501', null, 'Trilha · a sessão juntada não troca de prova');
select lives_ok($$update public.sessoes_de_aplicacao set local = 'Outra sala'
                   where juntada_de_avaliacao_id = '32320000-0000-0000-0000-000000000005'$$,
  'Trilha · o resto da sessão juntada se edita (controle positivo)');

-- ── views com security_invoker (gotcha 10) ──
select is((select count(*)::int from pg_class
            where relname in ('vw_carga_horaria_turma', 'vw_ocupacao_ta', 'vw_disciplinas_execucao', 'vw_instrutor_carga_anual')
              and relnamespace = 'public'::regnamespace and reloptions @> array['security_invoker=true']),
  4, 'Gotcha 10 · as quatro views reescritas continuam com security_invoker');

select * from finish();
rollback;
