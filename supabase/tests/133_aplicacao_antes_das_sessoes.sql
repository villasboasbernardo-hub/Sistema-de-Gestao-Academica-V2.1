-- =================================================================================
-- 133 — Spec 014, E-7 (`20261016153228`, 16/10/2026): a 1ª APLICAÇÃO não passa das SESSÕES, e o NÚCLEO do «juntar».
--
-- RN-AV-12: a prova em N sessões é UMA avaliação — a 1ª sessão é a própria avaliação, e as seguintes não podem vir
--           antes dela. A E-6 recusava a SESSÃO antes da 1ª aplicação; a E-7 recusa o outro lado: MOVER a 1ª
--           aplicação para depois de uma sessão ativa (pedido de Bernardo Villas Boas, 16/10/2026).
-- ⚠️ O GATILHO É ADIADO (fim da transação), e o pgTAP roda numa transação só: cada caso abre `deferred` e força a
--    conferência com `set constraints all immediate` dentro de um bloco `DO` (throws_ok não aceita comando de
--    transação) — e o `deferred` no início de cada bloco importa: o modo `immediate` dura até o fim da transação.
-- ⚠️ O CASO QUE DISCRIMINA (DoD 8): mover a 1ª aplicação para DEPOIS da sessão passava antes da E-7 e é recusado
--    agora; o mesmo dia, a prova inteira deslocada numa transação e a avaliação cancelada continuam aceitos.
-- ⚠️ Autorização não se prova aqui (pgTAP roda como dono); o porteiro do «juntar» com sessão real segue em
--    `tests/invariantes/rls/sessoes-de-aplicacao.test.ts`, que passa pelo núcleo desde a E-7.
-- =================================================================================
begin;
select plan(14);

select public.criar_curso_com_regime(
  '{"codigo":"T133-CUR","nome_curso":"Curso T133","classificacao":"regular",
    "modalidade":"presencial","duracao_dias":300}'::jsonb,
  '{"regime_tempos":8,"ta_duracao_min":45,"intervalo_manha_min":10,"intervalo_tarde_min":10,
    "hora_inicio_manha":"07:30","hora_inicio_tarde":"13:30","vigente_de":"2047-01-01"}'::jsonb);
create temporary table _t133 as select id as curso_id from public.cursos where codigo = 'T133-CUR';
insert into public.config_listas (lista, valor, rotulo_exibicao) values ('tipos_avaliacao', 'Prova T133', 'Prova T133')
  on conflict do nothing;
insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos) values
  ('20330000-0000-0000-0000-000000000001', 'T133-D1', (select curso_id from _t133), 'T133', 'Disciplina T133', 60);
insert into public.turmas (id, curso_id, turma, ano_letivo, status, modalidade, data_inicio, data_termino) values
  ('50330000-0000-0000-0000-000000000001', (select curso_id from _t133), 'T1', 2047,
   'ativa', 'presencial', '2047-01-05', '2047-11-30');
insert into public.instrutores (id, codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om) values
  ('33339999-0000-0000-0000-000000000001', 'T133-INS', 'CT', '-EF', 'Instrutor T133', 'Militar', 'CIAARA');

-- A prova em 01/06/2047 com a sessão 2 em 03/06; e duas avaliações soltas para o «juntar» (10/06 e 20/06).
insert into public.avaliacoes (id, codigo, turma_id, disciplina_id, curso_id, tipo_avaliacao, data_avaliacao, ta_inicial,
                               tempos_consumidos, instrutor_responsavel_id)
select v.id::uuid, v.codigo, '50330000-0000-0000-0000-000000000001', '20330000-0000-0000-0000-000000000001', curso_id,
       'Prova T133', v.dia::date, 1, 2, '33339999-0000-0000-0000-000000000001'
  from _t133, (values ('33330000-0000-0000-0000-000000000001', 'T133-PROVA', '2047-06-01'),
                      ('33330000-0000-0000-0000-000000000002', 'T133-SOLTA', '2047-06-10'),
                      ('33330000-0000-0000-0000-000000000003', 'T133-OUTRA', '2047-06-20')) as v(id, codigo, dia);
insert into public.sessoes_de_aplicacao (id, avaliacao_id, numero, data, ta_inicial, tempos_consumidos) values
  ('33331111-0000-0000-0000-000000000002', '33330000-0000-0000-0000-000000000001', 2, '2047-06-03', 1, 2),
  ('33331111-0000-0000-0000-000000000003', '33330000-0000-0000-0000-000000000003', 2, '2047-06-21', 1, 2);

-- ── estrutura ──
select has_function('app', 'aplicacao_antes_das_sessoes', 'E-7 · a função do gatilho existe');
select ok((select tgdeferrable and tginitdeferred from pg_trigger
            where tgname = 'trg_avaliacoes_aplicacao_antes_das_sessoes'
              and tgrelid = 'public.avaliacoes'::regclass),
  'E-7 · o gatilho é de restrição, ADIADO para o fim da transação (a sincronização grava a prova e depois as sessões)');
select ok(not has_function_privilege('authenticated', 'app.aplicacao_antes_das_sessoes()', 'EXECUTE'),
  'E-7 · a função de gatilho não é executável por authenticated (revoke, como toda função de gatilho)');

-- ── a regra ──
select throws_ok($t$do $b$ begin
    set constraints all deferred;
    update public.avaliacoes set data_avaliacao = '2047-06-05' where id = '33330000-0000-0000-0000-000000000001';
    set constraints all immediate;
  end $b$ $t$,
  '23514', null,
  'RN-AV-12 · CASO QUE DISCRIMINA: a 1ª aplicação movida para DEPOIS da sessão 2 é recusada (passava antes da E-7)');
select throws_ok($t$do $b$ begin
    set constraints all deferred;
    update public.avaliacoes set data_avaliacao = '2047-06-04' where id = '33330000-0000-0000-0000-000000000001';
    set constraints all immediate;
  end $b$ $t$,
  '23514', 'A 1ª aplicação da prova (2047-06-04) não pode ficar depois da sessão de aplicação de 2047-06-03 — as sessões são a 2ª, 3ª… da mesma prova.',
  'RN-AV-12 · a recusa nomeia a data da 1ª aplicação e a da sessão');
select lives_ok($t$do $b$ begin
    set constraints all deferred;
    update public.avaliacoes set data_avaliacao = '2047-06-03' where id = '33330000-0000-0000-0000-000000000001';
    set constraints all immediate;
  end $b$ $t$,
  'RN-AV-12 · a 1ª aplicação no MESMO dia da sessão é aceita (como do outro lado, na E-6)');
select lives_ok($t$do $b$ begin
    set constraints all deferred;
    update public.avaliacoes set data_avaliacao = '2047-06-08' where id = '33330000-0000-0000-0000-000000000001';
    update public.sessoes_de_aplicacao set data = '2047-06-09' where id = '33331111-0000-0000-0000-000000000002';
    set constraints all immediate;
  end $b$ $t$,
  'E-7 · a prova INTEIRA deslocada para frente numa transação (a 1ª antes, a sessão depois) é aceita: o gatilho decide pelo estado final');
select is((select data_avaliacao from public.avaliacoes where id = '33330000-0000-0000-0000-000000000001'), '2047-06-08'::date,
  'E-7 · e o deslocamento ficou gravado');
select lives_ok($t$do $b$ begin
    set constraints all deferred;
    update public.sessoes_de_aplicacao set status = 'inativo' where id = '33331111-0000-0000-0000-000000000002';
    update public.avaliacoes set data_avaliacao = '2047-06-10' where id = '33330000-0000-0000-0000-000000000001';
    set constraints all immediate;
  end $b$ $t$,
  'E-7 · a sessão INATIVA não conta: sem sessão ativa, a 1ª aplicação vai para qualquer dia');
select lives_ok($t$do $b$ begin
    set constraints all deferred;
    update public.avaliacoes set status = 'cancelada', data_avaliacao = '2047-06-30' where id = '33330000-0000-0000-0000-000000000003';
    set constraints all immediate;
  end $b$ $t$,
  'E-7 · avaliação CANCELADA não é conferida (só a viva: pendente, em andamento, concluída, atrasada)');

-- ── o núcleo do «juntar» (sem sessão: o caminho do script de manutenção) ──
select throws_ok($$select public.juntar_como_sessao('33330000-0000-0000-0000-000000000001', '33330000-0000-0000-0000-000000000002')$$,
  '42501', null, 'Gotcha 15 · a RPC da tela continua recusando quem não tem sessão (o porteiro ficou nela)');
select isnt((select app.juntar_como_sessao_nucleo('33330000-0000-0000-0000-000000000001', '33330000-0000-0000-0000-000000000002')),
  null, 'E-7 · o núcleo junta sem sessão (script de manutenção): devolve o id da sessão nova');
select results_eq(
  $$select s.numero::int, s.data, s.juntada_por is null, s.juntada_em is not null, s.avaliacao_juntada_antes ->> 'codigo',
           a.status::text, a.observacoes like '[JUNTADA COMO SESSAO 2 DE T133-PROVA]%'
      from public.sessoes_de_aplicacao s join public.avaliacoes a on a.id = s.juntada_de_avaliacao_id
     where s.avaliacao_id = '33330000-0000-0000-0000-000000000001' and s.status = 'ativo'$$,
  $$values (2, '2047-06-10'::date, true, true, 'T133-SOLTA', 'cancelada', true)$$,
  'E-7 · a trilha diz a verdade: juntada_por NULO («carga sem sessão»), quando e o retrato; a juntada fica cancelada com a marca');
select ok(not has_function_privilege('anon', 'app.juntar_como_sessao_nucleo(uuid, uuid)', 'EXECUTE')
          and regexp_replace((select prosrc from pg_proc where oid = 'public.juntar_como_sessao(uuid, uuid)'::regprocedure),
                             '--[^\n]*', '', 'g') ~ 'app\.juntar_como_sessao_nucleo',
  'E-7 · anon não executa o núcleo, e a RPC da tela é porteiro + núcleo (um corpo só, lido sem comentário)');

select * from finish();
rollback;
