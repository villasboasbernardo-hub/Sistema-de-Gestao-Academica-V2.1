-- =================================================================================
-- 154 — Mais de um instrutor por aula (spec 031, Bloco 16, item 6 · FR-006, RD-9, emenda da RN-INST-04)
--
-- O QUE  : prova a estrutura e a regra de banco da migration `20261030224204_instrutores_adicionais_da_aula`:
--          `registros_aula.instrutores_adicionais uuid[]` (vazia por padrão), o gatilho que recusa adicional
--          inexistente (23503), repetido e o próprio quem ministra (23514), e `vw_instrutor_carga_anual` dando a cada
--          adicional os TA INTEIROS da aula — enquanto a CH da TURMA conta a aula uma vez só.
--
-- ⚠️ O CASO QUE DISCRIMINA (DoD 8): a aula de 3 TA com quem ministra A e adicional B. ANTES da migration, B tem 0 TA
--    ministrados (a view só lê `instrutor_id`); DEPOIS, 3. E A continua com 3, não 1,5: nada é rateado.
-- ⚠️ O CONTROLE da CH da turma: `vw_carga_horaria_turma` soma 3 TA para a aula — a mesma soma que daria sem adicional.
-- ⚠️ 2048 e códigos próprios (`T154-…`), longe do dado real: vale na base limpa e na carregada. Sem sessão — quem pode o
--    quê não se prova em pgTAP; a habilitação dos adicionais é da Server Action (RD-1, D-11 da spec 031).
-- =================================================================================
begin;
select plan(11);

-- ── estrutura ────────────────────────────────────────────────────────────────────
select col_type_is('public', 'registros_aula', 'instrutores_adicionais', 'uuid[]',
  'RD-9 · registros_aula.instrutores_adicionais é uuid[]');
select col_not_null('public', 'registros_aula', 'instrutores_adicionais',
  'RD-9 · a coluna é NOT NULL (vazia, nunca nula)');
select col_default_is('public', 'registros_aula', 'instrutores_adicionais', '{}'::text,
  'RD-9 · o padrão é a lista vazia: o que já existia nasce sem adicional');
select has_trigger('public', 'registros_aula', 'trg_registros_aula_instrutores_adicionais',
  'RD-9 · o gatilho que confere os adicionais existe');
select ok(
  coalesce((select 'security_invoker=true' = any (reloptions) from pg_class
             where oid = 'public.vw_instrutor_carga_anual'::regclass), false),
  'gotcha 10 · vw_instrutor_carga_anual continua security_invoker depois de recriada'
);

-- ── a amostra ────────────────────────────────────────────────────────────────────
insert into public.cursos (id, codigo, nome_curso, classificacao, modalidade, duracao_dias) values
  ('a1542000-0000-0000-0000-000000000001', 'T154-CUR', 'Curso T154', 'regular', 'presencial', 30);
insert into public.curso_regime_historico
  (curso_id, tipo_regime, regime_tempos, ta_duracao_min, intervalo_manha_min,
   intervalo_tarde_min, hora_inicio_manha, hora_inicio_tarde, vigente_de)
values
  ('a1542000-0000-0000-0000-000000000001', 'padrao', 8, 45, 10, 10, '07:30', '13:30', '2020-01-01');
insert into public.turmas (id, codigo, curso_id, turma, ano_letivo, status, modalidade, data_inicio, data_termino)
values ('a1545000-0000-0000-0000-000000000001', 'T154-CUR T1 2048', 'a1542000-0000-0000-0000-000000000001',
        'T1', 2048, 'ativa', 'presencial', '2048-03-02', '2048-06-30');
insert into public.disciplinas
  (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos, previsao_inicio, previsao_termino)
values
  ('a1543000-0000-0000-0000-000000000001', 'T154-DIS', 'a1542000-0000-0000-0000-000000000001', 'I',
   'Disciplina T154', 20, '2048-03-02', '2048-06-26');
insert into public.turma_disciplina (turma_id, disciplina_id)
select 'a1545000-0000-0000-0000-000000000001', 'a1543000-0000-0000-0000-000000000001'
 where not exists (select 1 from public.turma_disciplina td
                    where td.turma_id = 'a1545000-0000-0000-0000-000000000001'
                      and td.disciplina_id = 'a1543000-0000-0000-0000-000000000001');
insert into public.instrutores (id, codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om) values
  ('a1541000-0000-0000-0000-00000000000a', 'T154-A', 'CT', '-EF', 'Instrutor T154 A', 'Militar', 'CIAARA'),
  ('a1541000-0000-0000-0000-00000000000b', 'T154-B', 'CT', '-EF', 'Instrutor T154 B', 'Militar', 'CIAARA');
insert into public.unidades_ensino (id, disciplina_id, curso_id, numero_ue, topico, ch_prevista_tempos) values
  ('a1547000-0000-0000-0000-000000000001', 'a1543000-0000-0000-0000-000000000001',
   'a1542000-0000-0000-0000-000000000001', 1, 'UE T154', 20);

-- ── o gatilho ────────────────────────────────────────────────────────────────────
select throws_ok(
  $$insert into public.registros_aula
      (codigo, data, turma_id, curso_id, unidade_ensino_id, instrutor_id, tempos_consumidos, ta_inicial, salvo,
       instrutores_adicionais)
    values ('T154-REG-X1', '2048-03-10', 'a1545000-0000-0000-0000-000000000001', 'a1542000-0000-0000-0000-000000000001',
            'a1547000-0000-0000-0000-000000000001', 'a1541000-0000-0000-0000-00000000000a', 3, 1, true,
            array['a1541000-0000-0000-0000-0000000000ff']::uuid[])$$,
  '23503', null,
  'RD-9 · adicional que não existe no cadastro é recusado (23503)'
);
select throws_ok(
  $$insert into public.registros_aula
      (codigo, data, turma_id, curso_id, unidade_ensino_id, instrutor_id, tempos_consumidos, ta_inicial, salvo,
       instrutores_adicionais)
    values ('T154-REG-X2', '2048-03-10', 'a1545000-0000-0000-0000-000000000001', 'a1542000-0000-0000-0000-000000000001',
            'a1547000-0000-0000-0000-000000000001', 'a1541000-0000-0000-0000-00000000000a', 3, 1, true,
            array['a1541000-0000-0000-0000-00000000000a']::uuid[])$$,
  '23514', null,
  'RD-9 · quem ministra não entra como adicional (23514)'
);
select throws_ok(
  $$insert into public.registros_aula
      (codigo, data, turma_id, curso_id, unidade_ensino_id, instrutor_id, tempos_consumidos, ta_inicial, salvo,
       instrutores_adicionais)
    values ('T154-REG-X3', '2048-03-10', 'a1545000-0000-0000-0000-000000000001', 'a1542000-0000-0000-0000-000000000001',
            'a1547000-0000-0000-0000-000000000001', 'a1541000-0000-0000-0000-00000000000a', 3, 1, true,
            array['a1541000-0000-0000-0000-00000000000b', 'a1541000-0000-0000-0000-00000000000b']::uuid[])$$,
  '23514', null,
  'RD-9 · o mesmo adicional duas vezes é recusado (23514)'
);

-- ── a carga: cada um com os TA inteiros; a turma, uma vez ─────────────────────────
insert into public.registros_aula
  (codigo, data, turma_id, curso_id, unidade_ensino_id, instrutor_id, tempos_consumidos, ta_inicial, salvo,
   instrutores_adicionais)
values
  ('T154-REG-1', '2048-03-10', 'a1545000-0000-0000-0000-000000000001', 'a1542000-0000-0000-0000-000000000001',
   'a1547000-0000-0000-0000-000000000001', 'a1541000-0000-0000-0000-00000000000a', 3, 1, true,
   array['a1541000-0000-0000-0000-00000000000b']::uuid[]);

select is(
  (select ta_ministrado_ano::int from public.vw_instrutor_carga_anual
    where instrutor_id = 'a1541000-0000-0000-0000-00000000000b' and ano = 2048),
  3,
  'DISCRIMINA · o adicional B leva os 3 TA inteiros da aula na carga ministrada (antes: 0)'
);
select is(
  (select ta_ministrado_ano::int from public.vw_instrutor_carga_anual
    where instrutor_id = 'a1541000-0000-0000-0000-00000000000a' and ano = 2048),
  3,
  'RD-9 · quem ministra A continua com os 3 TA — nada é rateado'
);
select is(
  (select coalesce(sum(r.tempos_consumidos), 0)::int from public.registros_aula r
    where r.turma_id = 'a1545000-0000-0000-0000-000000000001' and r.status = 'ativo' and r.salvo),
  3,
  'RD-9 · a CH da turma conta a aula uma vez (3 TA, não 6)'
);

select * from finish();
rollback;
