-- =================================================================================
-- 110 — O RATEIO da CH entre os instrutores da turma, nos CINCO casos
--
-- O QUE  : prova a decisao A-1 (Bernardo Villas Boas, 25/09/2026) — `FR-041.1` a
--          `FR-041.7` e `FR-043` da spec 010 —, pelos dois lados: o que fecha passa, o que
--          nao fecha e recusado PELO BANCO, e a view devolve os mesmos numeros da funcao
--          pura de `lib/dominio/rateio-de-carga.ts`.
--
-- ⚠️ TRES CASOS QUE DISCRIMINAM, e cada um pega uma coisa diferente:
--    1. Por TA: 4/3/3 numa disciplina de 10 tempos PASSA e 4/3/2 FALHA — e falha SO NO
--       `COMMIT`. E o que prova que a conferencia e adiada: um gatilho por linha reprovaria
--       a gravacao correta no meio do caminho, quando so a primeira parcela esta gravada.
--    2. Por UE: deixar uma UE SEM instrutor e recusado. Sem esse caso, o modo por UE
--       passaria com metade das unidades atribuidas e a CH do instrutor sairia menor sem
--       que nada acusasse.
--    3. Divisao padrao: 10 tempos entre 3 devolve 4, 3, 3 — INTEIROS. A view anterior
--       devolvia 3.33 tres vezes (somando 9.99), e nenhuma assercao pegava.
--
-- ⚠️ A ORDEM DO RESTO E POR ANTIGUIDADE (`app.fn_antiguidade_ordem`, RN-ANT-02), nao pela
--    ordem de insercao: o instrutor mais antigo recebe o tempo que sobra.
-- =================================================================================
begin;
select plan(11);

insert into public.cursos (id, codigo, nome_curso, classificacao, modalidade, duracao_dias) values
  ('b0200000-0000-0000-0000-000000000001', 'T110-CUR', 'Curso T110', 'regular', 'presencial', 30);

insert into public.curso_regime_historico
  (curso_id, tipo_regime, regime_tempos, ta_duracao_min, intervalo_manha_min,
   intervalo_tarde_min, hora_inicio_manha, hora_inicio_tarde, vigente_de)
values
  ('b0200000-0000-0000-0000-000000000001', 'padrao', 8, 45, 10, 10, '07:30', '13:30', '2020-01-01');

insert into public.turmas (id, codigo, curso_id, turma, ano_letivo, status, modalidade,
                           data_inicio, data_termino)
values ('b0500000-0000-0000-0000-000000000001', 'T110-CUR T1 2026',
        'b0200000-0000-0000-0000-000000000001', 'T1', 2026, 'planejada', 'presencial',
        '2026-03-02', '2026-06-30');

-- Tres instrutores de postos DIFERENTES: o CMG e o mais antigo, o MN o mais moderno.
insert into public.instrutores (id, codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om) values
  ('b0100000-0000-0000-0000-000000000001', 'T110-CMG', 'CMG', '-EF', 'Instrutor Mais Antigo',  'Militar', 'CIAARA'),
  ('b0100000-0000-0000-0000-000000000002', 'T110-CT',  'CT',  '-EF', 'Instrutor Do Meio',      'Militar', 'CIAARA'),
  ('b0100000-0000-0000-0000-000000000003', 'T110-MN',  'MN',  '-EF', 'Instrutor Mais Moderno', 'Militar', 'CIAARA');

-- Disciplina de 10 tempos, com UEs de 4 + 3 + 3 (para o caso 5 fechar).
insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina,
                                carga_horaria_tempos, previsao_inicio, previsao_termino) values
  ('b0300000-0000-0000-0000-000000000001', 'T110-DEZ', 'b0200000-0000-0000-0000-000000000001',
   'I', 'Disciplina de dez tempos', 10, '2026-03-02', '2026-03-30'),
  ('b0300000-0000-0000-0000-000000000002', 'T110-SIM', 'b0200000-0000-0000-0000-000000000001',
   'II', 'Disciplina simultanea', 12, '2026-03-02', '2026-03-30');

update public.disciplinas set modo_atribuicao_padrao = 'simultaneo'
 where id = 'b0300000-0000-0000-0000-000000000002';

insert into public.unidades_ensino (id, disciplina_id, curso_id, numero_ue, topico, ch_prevista_tempos) values
  ('b0400000-0000-0000-0000-000000000001', 'b0300000-0000-0000-0000-000000000001',
   'b0200000-0000-0000-0000-000000000001', 1, 'Primeira unidade', 4),
  ('b0400000-0000-0000-0000-000000000002', 'b0300000-0000-0000-0000-000000000001',
   'b0200000-0000-0000-0000-000000000001', 2, 'Segunda unidade', 3),
  ('b0400000-0000-0000-0000-000000000003', 'b0300000-0000-0000-0000-000000000001',
   'b0200000-0000-0000-0000-000000000001', 3, 'Terceira unidade', 3);

insert into public.turma_disciplina (id, turma_id, disciplina_id, origem_periodo) values
  ('b0600000-0000-0000-0000-000000000001', 'b0500000-0000-0000-0000-000000000001',
   'b0300000-0000-0000-0000-000000000001', 'nao_informado'),
  ('b0600000-0000-0000-0000-000000000002', 'b0500000-0000-0000-0000-000000000001',
   'b0300000-0000-0000-0000-000000000002', 'nao_informado');

-- -- 1 — CASO 3 (padrao): tres instrutores, nenhuma parcela gravada
-- ⚠️ `codigo` e composto, como o ETL o monta (`<td>#<instrutor>`): a coluna e NOT NULL e
--    nao tem DEFAULT, porque um DEFAULT nao enxerga outra coluna da linha.
insert into public.turma_disciplina_instrutor (codigo, turma_disciplina_id, instrutor_id, status)
select td.codigo || '#' || i.codigo, td.id, i.id, 'ativo'
  from public.turma_disciplina td
  join public.instrutores i on i.codigo in ('T110-CMG', 'T110-CT', 'T110-MN')
 where td.id = 'b0600000-0000-0000-0000-000000000001';

select results_eq(
  $$select i.codigo, v.tempos_previstos::integer
      from public.vw_instrutor_carga_prevista v
      join public.instrutores i on i.id = v.instrutor_id
     where v.turma_disciplina_id = 'b0600000-0000-0000-0000-000000000001'
     order by v.tempos_previstos desc, i.codigo$$,
  $$values ('T110-CMG', 4), ('T110-CT', 3), ('T110-MN', 3)$$,
  'FR-041.3 · 10 tempos entre 3 da 4 + 3 + 3 INTEIROS, e o resto vai ao MAIS ANTIGO (o CMG)'
);

-- -- 2 — e a soma fecha com a CH da disciplina, que a versao anterior nunca fazia
select is(
  (select sum(tempos_previstos)::integer from public.vw_instrutor_carga_prevista
    where turma_disciplina_id = 'b0600000-0000-0000-0000-000000000001'),
  10,
  'FR-041.7 · a soma da view fecha com a CH — antes eram 3.33 x 3 = 9.99'
);

-- -- 3 — CASO 4: 4/3/3 digitado PASSA
select lives_ok(
  $$update public.turma_disciplina_instrutor set ch_prevista_tempos =
      case instrutor_id
        when 'b0100000-0000-0000-0000-000000000001'::uuid then 4
        when 'b0100000-0000-0000-0000-000000000002'::uuid then 3
        else 3 end
    where turma_disciplina_id = 'b0600000-0000-0000-0000-000000000001'$$,
  'FR-041.4 · parcelas digitadas que somam a CH da disciplina sao aceitas'
);

-- -- 4 — O CASO QUE DISCRIMINA: 4/3/2 falha, e falha NO COMMIT
select throws_ok(
  -- ⚠️ O bloco `DO` e o que permite observar o ADIAMENTO: `set constraints all immediate`
  --    forca a conferencia AQUI, dentro da mesma transacao do teste. Sem ele, a recusa so
  --    viria no `COMMIT`, que o pgTAP nunca chega a executar (ele termina com `rollback`).
  $$do $t$ begin
      update public.turma_disciplina_instrutor set ch_prevista_tempos = 2
       where turma_disciplina_id = 'b0600000-0000-0000-0000-000000000001'
         and instrutor_id = 'b0100000-0000-0000-0000-000000000003';
      set constraints all immediate;
    end $t$ $$,
  '23514',
  null,
  'FR-043 · 4/3/2 numa disciplina de 10 e recusado — e a recusa chega no fim da transacao, nao por linha'
);

-- -- 5 — mistura de parcela preenchida com vazia e recusada
select throws_ok(
  $$do $t$ begin
      update public.turma_disciplina_instrutor set ch_prevista_tempos = null
       where turma_disciplina_id = 'b0600000-0000-0000-0000-000000000001'
         and instrutor_id = 'b0100000-0000-0000-0000-000000000003';
      set constraints all immediate;
    end $t$ $$,
  '23514',
  null,
  'FR-043 · parcela preenchida em uns e vazia em outros nao e caso nenhum — recusado'
);

-- -- 6 — parcela FRACIONARIA e recusada pelo CHECK (A-1: sempre inteira)
select throws_ok(
  $$update public.turma_disciplina_instrutor set ch_prevista_tempos = 2.5
     where turma_disciplina_id = 'b0600000-0000-0000-0000-000000000001'
       and instrutor_id = 'b0100000-0000-0000-0000-000000000003'$$,
  '23514',
  null,
  'FR-041 · parcela fracionaria (2.5) e recusada — a parcela e sempre em TA inteiros'
);

-- -- 7 — CASO 2 (simultaneo): cada um recebe a CH integral
insert into public.turma_disciplina_instrutor (codigo, turma_disciplina_id, instrutor_id, status)
select td.codigo || '#' || i.codigo, td.id, i.id, 'ativo'
  from public.turma_disciplina td
  join public.instrutores i on i.codigo in ('T110-CMG', 'T110-CT')
 where td.id = 'b0600000-0000-0000-0000-000000000002';

select results_eq(
  $$select distinct tempos_previstos::integer from public.vw_instrutor_carga_prevista
     where turma_disciplina_id = 'b0600000-0000-0000-0000-000000000002'$$,
  $$values (12)$$,
  'FR-041.2 · no modo simultaneo CADA instrutor recebe a CH integral (RN-MAT-05)'
);

-- -- 8 — CASO 5 (por UE): as tres UEs atribuidas, a CH de cada um e a soma das suas
update public.turma_disciplina_instrutor set ch_prevista_tempos = null
 where turma_disciplina_id = 'b0600000-0000-0000-0000-000000000001';

insert into public.turma_disciplina_unidade
  (turma_disciplina_id, disciplina_id, unidade_ensino_id, instrutor_id) values
  ('b0600000-0000-0000-0000-000000000001', 'b0300000-0000-0000-0000-000000000001',
   'b0400000-0000-0000-0000-000000000001', 'b0100000-0000-0000-0000-000000000001'),
  ('b0600000-0000-0000-0000-000000000001', 'b0300000-0000-0000-0000-000000000001',
   'b0400000-0000-0000-0000-000000000002', 'b0100000-0000-0000-0000-000000000002'),
  ('b0600000-0000-0000-0000-000000000001', 'b0300000-0000-0000-0000-000000000001',
   'b0400000-0000-0000-0000-000000000003', 'b0100000-0000-0000-0000-000000000003');

select results_eq(
  $$select i.codigo, v.tempos_previstos::integer
      from public.vw_instrutor_carga_prevista v
      join public.instrutores i on i.id = v.instrutor_id
     where v.turma_disciplina_id = 'b0600000-0000-0000-0000-000000000001'
     order by i.codigo$$,
  $$values ('T110-CMG', 4), ('T110-CT', 3), ('T110-MN', 3)$$,
  'FR-041.5 · por UE, a CH de cada instrutor e a SOMA da CH das UEs dele'
);

-- -- 9 — O CASO QUE DISCRIMINA do por UE: UE sem instrutor e recusado
select throws_ok(
  $$do $t$ begin
      update public.turma_disciplina_unidade set status = 'inativo'
       where unidade_ensino_id = 'b0400000-0000-0000-0000-000000000003';
      set constraints all immediate;
    end $t$ $$,
  '23514',
  null,
  'FR-041.5 · deixar uma UE sem instrutor e recusado — todas tem de estar atribuidas'
);

-- -- 10 — a mesma UE para dois instrutores e recusada PELA UNIQUE
select throws_ok(
  $$insert into public.turma_disciplina_unidade
      (turma_disciplina_id, disciplina_id, unidade_ensino_id, instrutor_id)
    values ('b0600000-0000-0000-0000-000000000001', 'b0300000-0000-0000-0000-000000000001',
            'b0400000-0000-0000-0000-000000000001', 'b0100000-0000-0000-0000-000000000002')$$,
  '23505',
  null,
  'FR-041.5 · cada UE com EXATAMENTE UM instrutor — a segunda atribuicao colide na unique'
);

-- -- 11 — casos 4 e 5 nao coexistem
select throws_ok(
  $$do $t$ begin
      update public.turma_disciplina_instrutor set ch_prevista_tempos = 10
       where turma_disciplina_id = 'b0600000-0000-0000-0000-000000000001'
         and instrutor_id = 'b0100000-0000-0000-0000-000000000001';
      set constraints all immediate;
    end $t$ $$,
  '23514',
  null,
  'FR-041.6 · rateio por UE e por TA ao mesmo tempo e recusado — no caso 5 a parcela e derivada'
);

select * from finish();
rollback;
