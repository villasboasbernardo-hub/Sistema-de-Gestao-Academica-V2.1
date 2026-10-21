-- =================================================================================
-- 127 — Spec 014, PR 4: as avaliações do currículo, o ajuste por turma, o arbitrado protegido e as sessões
--       de vista (migration E-4); a carga D-4 por invariantes.
--
-- RN-AVAL-02 (Risco Alto): UM FATO POR AVALIAÇÃO — a sessão de vista é filha da avaliação, nunca outro fato.
-- RN-EVT-03 (Risco Alto): CHD = aula + aplicação + TODAS as sessões de vista (provado em 128).
-- ⚠️ pgTAP de dado nunca pula: na base limpa, o valor que prova a abstenção da D-4 (0 itens com a procedência).
-- =================================================================================
begin;
select plan(24);

insert into auth.users (id, email, aud, role) values
  ('a0000000-0000-0000-0000-000000000127', 't127-admin@ciaara.teste', 'authenticated', 'authenticated');
insert into public.usuarios (codigo, auth_user_id, email, nome, perfil) values
  ('T127-USR-ADM', 'a0000000-0000-0000-0000-000000000127', 't127-admin@ciaara.teste', 'Admin T127', 'admin');
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000127', true);

select public.criar_curso_com_regime(
  '{"codigo":"T127-CUR","nome_curso":"Curso T127","classificacao":"regular",
    "modalidade":"presencial","duracao_dias":300}'::jsonb,
  '{"regime_tempos":8,"ta_duracao_min":45,"intervalo_manha_min":10,"intervalo_tarde_min":10,
    "hora_inicio_manha":"07:30","hora_inicio_tarde":"13:30","vigente_de":"2045-01-01"}'::jsonb);
create temporary table _t127 as select id as curso_id from public.cursos where codigo = 'T127-CUR';
insert into public.config_listas (lista, valor, rotulo_exibicao) values ('tipos_avaliacao', 'Prova T127', 'Prova T127')
  on conflict do nothing;
insert into public.config_listas (lista, valor, rotulo_exibicao, metadados)
  values ('instrumentos_avaliacao', 'PM', 'Prova Mista', '{"natureza":"prova"}') on conflict do nothing;
insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos) values
  ('20270000-0000-0000-0000-000000000001', 'T127-D1', (select curso_id from _t127), 'T127', 'Disciplina T127', 30),
  ('20270000-0000-0000-0000-000000000002', 'T127-D2', (select curso_id from _t127), 'T127B', 'Outra T127', 30);
insert into public.unidades_ensino (id, codigo, curso_id, disciplina_id, numero_ue, topico, ch_prevista_tempos) values
  ('27270000-0000-0000-0000-000000000001', 'T127-UE1', (select curso_id from _t127), '20270000-0000-0000-0000-000000000001', 1, 'UE T127', 30);
insert into public.turmas (id, curso_id, turma, ano_letivo, status, modalidade, data_inicio, data_termino) values
  ('50270000-0000-0000-0000-000000000001', (select curso_id from _t127), 'T1', 2045,
   'ativa', 'presencial', '2045-01-05', '2045-11-30');

insert into public.instrutores (id, codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om) values
  ('27279999-0000-0000-0000-000000000001', 'T127-INS', 'CT', '-EF', 'Instrutor T127', 'Militar', 'CIAARA');

-- ── estrutura ──
select ok(
  (select bool_and(relrowsecurity) from pg_class
    where oid in ('public.avaliacoes_curriculo'::regclass, 'public.avaliacoes_curriculo_turma'::regclass,
                  'public.vistas_de_avaliacao'::regclass)),
  'E-4 · as três tabelas novas têm RLS');
select is(
  (select count(*)::int from pg_policy
    where polrelid in ('public.avaliacoes_curriculo'::regclass, 'public.avaliacoes_curriculo_turma'::regclass,
                       'public.vistas_de_avaliacao'::regclass) and polcmd = 'd'),
  0, 'Regra 4 · nenhuma policy de DELETE nas tabelas novas');
select ok(
  not has_table_privilege('authenticated', 'public.avaliacoes_curriculo', 'DELETE')
  and not has_table_privilege('authenticated', 'public.vistas_de_avaliacao', 'TRUNCATE'),
  'Regra 4 · authenticated sem DELETE e sem TRUNCATE');
select ok(
  not has_table_privilege('authenticated', 'public.avaliacoes_planejadas', 'INSERT')
  and not has_table_privilege('authenticated', 'public.avaliacoes_planejadas', 'UPDATE')
  and has_table_privilege('authenticated', 'public.avaliacoes_planejadas', 'SELECT'),
  'FR-039.1 · avaliacoes_planejadas fica só de leitura (histórico da RN-AVAL-01)');
select is(
  (select array_agg(perfil::text order by perfil::text) from public.perfil_permissao
    where recurso = 'avaliacoes_curriculo_arbitrado' and acao = 'editar' and permitido),
  array['admin', 'encarregado_administracao_academica'],
  'FR-031.7 · o arbitrado é do Admin e do Encarregado');
select ok(
  'substituida_pela_planilha' = any (enum_range(null::public.status_avaliacao)::text[]),
  'FR-047 · status_avaliacao tem substituida_pela_planilha');

-- ── o item do currículo ──
insert into public.avaliacoes_curriculo (id, disciplina_id, curso_id, ordem, instrumento_id, numero, unidade_ensino_id,
  origem_ue, ta_aplicacao, origem_ta_aplicacao, ta_vista, origem_ta_vista, origem_item, fonte_arquivo, fonte_pagina)
select '27271111-0000-0000-0000-000000000001', '20270000-0000-0000-0000-000000000001', curso_id, 1,
       (select id from public.config_listas where lista = 'instrumentos_avaliacao' and valor = 'PM'), 1,
       '27270000-0000-0000-0000-000000000001', 'curriculo', 2, 'curriculo', 1, 'curriculo', 'curriculo', 't127.pdf', 9
  from _t127;
select matches((select codigo from public.avaliacoes_curriculo where id = '27271111-0000-0000-0000-000000000001'),
  '^AVC-[0-9]{6}$', 'FR-040 · o item ganha código AVC- pela sequência');
select throws_ok(
  $$insert into public.avaliacoes_curriculo (disciplina_id, curso_id, ordem, instrumento_id, numero, origem_item)
    select '20270000-0000-0000-0000-000000000001', curso_id, 2,
           (select id from public.config_listas where lista = 'instrumentos_avaliacao' and valor = 'PM'), 1, 'arbitrado' from _t127$$,
  '23505', null, 'avc_numero_unico · o mesmo instrumento e número na disciplina recusa');
select throws_ok(
  $$insert into public.avaliacoes_curriculo (disciplina_id, curso_id, ordem, instrumento_id, numero, origem_item)
    select '20270000-0000-0000-0000-000000000001', curso_id, 3,
           (select id from public.config_listas where lista = 'instrumentos_avaliacao' and valor = 'PM'), 9, 'curriculo' from _t127$$,
  '23514', null, 'avc_fonte_se_curriculo · item de origem currículo sem arquivo e página recusa');
select throws_ok(
  $$insert into public.avaliacoes_curriculo (disciplina_id, curso_id, ordem, instrumento_id, numero, ta_aplicacao, origem_item)
    select '20270000-0000-0000-0000-000000000001', curso_id, 3,
           (select id from public.config_listas where lista = 'instrumentos_avaliacao' and valor = 'PM'), 8, 2, 'arbitrado' from _t127$$,
  '23514', null, 'avc_ta_com_origem · tempo sem origem recusa (FR-031.6)');
select throws_ok(
  $$insert into public.avaliacoes_curriculo (disciplina_id, curso_id, ordem, instrumento_id, numero, unidade_ensino_id, origem_ue, origem_item)
    select '20270000-0000-0000-0000-000000000002', curso_id, 1,
           (select id from public.config_listas where lista = 'instrumentos_avaliacao' and valor = 'PM'), 1,
           '27270000-0000-0000-0000-000000000001', 'curriculo', 'arbitrado' from _t127$$,
  '23503', null, 'avc_ue_da_disciplina · UE de outra disciplina recusa (FK composta)');
select throws_ok(
  $$insert into public.avaliacoes_curriculo (disciplina_id, curso_id, ordem, instrumento_id, numero, unidade_ensino_id, origem_item)
    select '20270000-0000-0000-0000-000000000001', curso_id, 4,
           (select id from public.config_listas where lista = 'instrumentos_avaliacao' and valor = 'PM'), 7,
           '27270000-0000-0000-0000-000000000001', 'arbitrado' from _t127$$,
  '23514', null, 'avc_origem_ue_coerente · UE sem origem recusa (FR-031.3)');

-- ── a avaliação ligada ao item, e a sessão de vista ──
insert into public.avaliacoes (id, codigo, turma_id, disciplina_id, curso_id, tipo_avaliacao, data_avaliacao, ta_inicial,
                               tempos_consumidos, avaliacao_curriculo_id)
select '27272222-0000-0000-0000-000000000001', 'T127-AVA', '50270000-0000-0000-0000-000000000001',
       '20270000-0000-0000-0000-000000000001', curso_id, 'Prova T127', '2045-04-10', 1, 2,
       '27271111-0000-0000-0000-000000000001' from _t127;
select throws_ok(
  $$update public.avaliacoes set disciplina_id = '20270000-0000-0000-0000-000000000002' where id = '27272222-0000-0000-0000-000000000001'$$,
  '23503', null, 'FR-039 · a avaliação só se liga a item da MESMA disciplina (FK composta)');
select throws_ok(
  $$insert into public.vistas_de_avaliacao (avaliacao_id, numero, data, ta_inicial, tempos_consumidos)
    values ('27272222-0000-0000-0000-000000000001', 1, '2045-04-09', 3, 1)$$,
  '23514', null, 'Sessão de vista ANTES da aplicação é recusada pelo gatilho');
insert into public.vistas_de_avaliacao (avaliacao_id, numero, data, ta_inicial, tempos_consumidos)
  values ('27272222-0000-0000-0000-000000000001', 1, '2045-04-12', 3, 1),
         ('27272222-0000-0000-0000-000000000001', 2, '2045-04-14', 3, 1);
select is((select count(*)::int from public.vistas_de_avaliacao where avaliacao_id = '27272222-0000-0000-0000-000000000001'),
  2, 'FR-041 · uma avaliação tem N sessões de vista');
select is((select count(*)::int from public.avaliacoes where id = '27272222-0000-0000-0000-000000000001'),
  1, 'RN-AVAL-02 · as sessões são filhas: continua UM fato por avaliação');
select throws_ok(
  $$insert into public.vistas_de_avaliacao (avaliacao_id, numero, data, conduz_instrutor_id, conduz_nome_externo)
    values ('27272222-0000-0000-0000-000000000001', 3, '2045-04-15', '27279999-0000-0000-0000-000000000001', 'Externo T127')$$,
  '23514', null, 'vst_conduz_exclusivo · instrutor e nome externo juntos recusa');
select matches((select min(codigo) from public.vistas_de_avaliacao where avaliacao_id = '27272222-0000-0000-0000-000000000001'),
  '^VST-[0-9]{6}$', 'FR-040 · a sessão ganha código VST- pela sequência');

-- ── o arbitrado ──
-- Com sessão de Admin, o gatilho deixa; o caso que discrimina (Operador) está em tests/invariantes/rls.
-- ⚠️ SPEC 021 (Bloco 6), 21/10/2026 — REGRA DOS VALORES ESPERADOS: o comportamento MUDOU, por decisão do desenho
--    (avaliações do currículo são da versão, e a versão em uso por turma com lançamento não muda número, RF-HOR-05):
--    com a prova `T127-AVA` viva, a versão está em uso e o arbitrado do CURRÍCULO é recusado; o ajuste por TURMA
--    (`avaliacoes_curriculo_turma`) segue livre. Cancelada a prova, a versão sai da trava e o Admin arbitra.
select throws_ok(
  $$update public.avaliacoes_curriculo set ta_vista = 2, origem_ta_vista = 'arbitrado' where id = '27271111-0000-0000-0000-000000000001'$$,
  '23514', null, 'Spec 021 · com lançamento na turma, a versão trava: o arbitrado do currículo é recusado');
update public.avaliacoes set status = 'cancelada' where id = '27272222-0000-0000-0000-000000000001';
select lives_ok(
  $$update public.avaliacoes_curriculo set ta_vista = 2, origem_ta_vista = 'arbitrado' where id = '27271111-0000-0000-0000-000000000001'$$,
  'FR-031.7 · o Admin arbitra o tempo (versão sem lançamento)');
select set_config('request.jwt.claim.sub', '', true);
select lives_ok(
  $$update public.avaliacoes_curriculo set ta_vista = 1, origem_ta_vista = 'curriculo' where id = '27271111-0000-0000-0000-000000000001'$$,
  'A carga roda sem sessão e não é afetada pelo gatilho do arbitrado');
select ok(
  (select prosrc ~ 'coalesce\(app\.pode\(''avaliacoes_curriculo_arbitrado'', ''editar''\), false\) is not true'
     from pg_proc where proname = 'proteger_arbitrado'),
  'Gotcha 15 · o porteiro do arbitrado tem a forma que não falha aberto');

-- ── D-4 por invariantes ──
select is(
  (select count(*)::int from public.avaliacoes_curriculo
    where origem_migracao_v1 like 'spec014-D4:%' and status = 'ativo' and (fonte_arquivo is null or fonte_pagina is null)),
  0, 'D-4 · todo item da carga tem arquivo e página (na base limpa: nenhum item)');
select is(
  (select count(*)::int from (
     select d.id from public.avaliacoes_curriculo a join public.disciplinas d on d.id = a.disciplina_id
      where a.status = 'ativo' and a.origem_item = 'curriculo'
      group by d.id, d.carga_horaria_tempos
     having sum(coalesce(a.ta_aplicacao, 0) + coalesce(a.ta_vista, 0)) > d.carga_horaria_tempos) x),
  0, 'FR-031.2 · Σ dos tempos de origem currículo ≤ CH em toda disciplina (sobre o catálogo)');

select * from finish();
rollback;
