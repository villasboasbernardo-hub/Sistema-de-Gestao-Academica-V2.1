-- =================================================================================
-- 094 — A ordem de antiguidade no caminho de leitura, e a carga prevista por instrutor
--
-- O QUÊ  : prova a `RN-ANT-01` — *Risco: Alto* — sobre a view que as telas leem, com amostra
--          semeada aqui mesmo e desfeita no `rollback`; e guarda o lugar da carga prevista.
--
-- ⚠️ A ASSERÇÃO É SOBRE A ORDEM, NÃO SOBRE A EXISTÊNCIA DA COLUNA. A primeira versão da tarefa só
--    conferia que `ordem_antiguidade` existia, o que é cobertura fingida de regra de risco alto
--    (análise C2, 15/09/2026). Uma coluna que existe e ordena errado passaria nela.
--
-- ⚠️ A CARGA PREVISTA ENTROU EM 15/09/2026, com a T011 respondida; só a semanal do instrutor segue
--    pendente, como `todo`. O parágrafo abaixo é o registro de quando tudo esperava:
-- ⚠️ A CARGA PREVISTA ESTAVA PENDENTE, E A PENDÊNCIA ERA EXPLÍCITA. `ta_previsto_ano` depende da T011
--    — qual data põe uma atribuição num ano —, que Bernardo ainda não respondeu. As asserções dela
--    ficam como `todo` do pgTAP: rodam, reprovam, e o relatório as mostra como pendentes, em vez de
--    sumirem ou de passarem com `ok(true)`.
--
-- Contrato: specs/006-cadastro-de-instrutores/contracts/carga-horaria-e-alertas.md · FR-001, FR-002
-- =================================================================================

begin;
select plan(14);

-- ---------------------------------------------------------------------------------
-- A amostra. Pesos da `escala_antiguidade`: CMG=1, CT=4, SC=13, SCNS=13; posto fora da escala
-- recebe 999 de `app.fn_peso_posto`. A antiguidade declarada desempata dentro do mesmo peso, e
-- quem não a declara recebe 99999 — o fim do próprio posto, nunca fora dele.
-- ---------------------------------------------------------------------------------
insert into public.instrutores
  (codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om, antiguidade_declarada)
values
  ('T094-CT-2',   'CT',   '-EF', 'Zeta Capitao Tenente Dois', 'Militar', 'CIAARA', '2'),
  ('T094-SC-2',   'SC',   '-',   'Alfa Civil Dois',           'Civil',   'CIAARA', '2'),
  ('T094-XYZ',    'XYZ',  '-',   'Aaa Posto Desconhecido',    'Militar', 'CIAARA', '1'),
  ('T094-CT-SEM', 'CT',   '-EF', 'Aaa Capitao Sem Declarada', 'Militar', 'CIAARA', null),
  ('T094-SCNS-1', 'SCNS', '-',   'Zeta Civil Um',             'Civil',   'CIAARA', '1'),
  ('T094-CMG',    'CMG',  '-EF', 'Zeta Capitao Mar Guerra',   'Militar', 'CIAARA', '9'),
  ('T094-CT-1',   'CT',   '-EF', 'Zeta Capitao Tenente Um',   'Militar', 'CIAARA', '1');

-- ---------------------------------------------------------------------------------
-- 1. A coluna existe na view que as telas leem.
-- ---------------------------------------------------------------------------------
select has_column(
  'public', 'vw_instrutores', 'ordem_antiguidade',
  'RN-ANT-01 · vw_instrutores expoe ordem_antiguidade — a consulta pede a ordem ao banco'
);

-- ---------------------------------------------------------------------------------
-- 2. Todo militar vem antes de todo civil.
--    Nomes escolhidos para que a ordem ALFABÉTICA desse o resultado oposto: "Alfa Civil" viria
--    antes de "Zeta Capitao". Uma view que ordenasse por nome reprovaria aqui.
-- ---------------------------------------------------------------------------------
select is_empty(
  $$select 1
     where (select max(ordem_antiguidade) from public.vw_instrutores
             where codigo in ('T094-CMG', 'T094-CT-1', 'T094-CT-2', 'T094-CT-SEM'))
         > (select min(ordem_antiguidade) from public.vw_instrutores
             where codigo in ('T094-SC-2', 'T094-SCNS-1'))$$,
  'RN-ANT-01 · todo militar vem antes de todo civil (SC e SCNS, peso 13)'
);

-- ---------------------------------------------------------------------------------
-- 3. Mesmo posto: a antiguidade declarada decide, e quem não a declara fica no fim do posto.
-- ---------------------------------------------------------------------------------
select results_eq(
  $$select codigo from public.vw_instrutores
     where codigo in ('T094-CT-1', 'T094-CT-2', 'T094-CT-SEM')
     order by ordem_antiguidade$$,
  $$values ('T094-CT-1'::text), ('T094-CT-2'::text), ('T094-CT-SEM'::text)$$,
  'RN-ANT-01 · mesmo posto sai na ordem da antiguidade declarada; sem declarada, no fim do posto'
);

-- ---------------------------------------------------------------------------------
-- 4. Dois civis desempatam igual aos militares — pela declarada, não pelo nome.
-- ---------------------------------------------------------------------------------
select results_eq(
  $$select codigo from public.vw_instrutores
     where codigo in ('T094-SC-2', 'T094-SCNS-1')
     order by ordem_antiguidade$$,
  $$values ('T094-SCNS-1'::text), ('T094-SC-2'::text)$$,
  'RN-ANT-01 · dois civis desempatam pela antiguidade declarada, como os militares'
);

-- ---------------------------------------------------------------------------------
-- 5. Posto fora da escala vai para o FIM, depois dos civis — nunca para o topo.
--    Declarada '1' e nome "Aaa" de propósito: nenhum desempate pode trazê-lo para cima.
-- ---------------------------------------------------------------------------------
select is(
  (select codigo from public.vw_instrutores
    where codigo like 'T094-%'
    order by ordem_antiguidade desc
    limit 1),
  'T094-XYZ',
  'RN-ANT-01 · posto fora da escala vai para o fim da lista, depois dos civis (peso 999)'
);

-- ---------------------------------------------------------------------------------
-- 6. I-8 · a view de leitura não concede escrita a `authenticated`.
--    Toda view nova ou recriada nasce com os privilégios de volta — o revoke do Épico 1 é foto.
-- ---------------------------------------------------------------------------------
select is_empty(
  $$select privilege_type from information_schema.table_privileges
     where table_schema = 'public' and table_name = 'vw_instrutores'
       and grantee = 'authenticated'
       and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')$$,
  'I-8 · vw_instrutores nao concede insert, update, delete nem truncate a authenticated'
);

-- ---------------------------------------------------------------------------------
-- 7. RN-INST-04 · a carga ministrada acompanha o lançamento, sem ação adicional (US3, cenário 2).
--
-- ⚠️ A ASSERÇÃO É SOBRE A DIFERENÇA, E NÃO SOBRE O VALOR. A base local pode trazer lançamentos do
--    ETL no ano corrente; conferir "ficou 4" dependeria dela. Mede-se antes, lança-se 4 tempos para
--    o mesmo instrutor, e exige-se que a soma do ano tenha subido exatamente 4 — sem refresh, sem
--    recálculo, sem gatilho: a view lê o fato.
-- ---------------------------------------------------------------------------------
insert into public.cursos (id, codigo, nome_curso, classificacao) values
  ('11111111-0000-0000-0000-000000000094', 'T094-CUR', 'Curso T094', 'regular');
insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos) values
  ('22222222-0000-0000-0000-000000000094', 'T094-DIS', '11111111-0000-0000-0000-000000000094', 'T94', 'Disciplina T094', 30);
insert into public.unidades_ensino (id, codigo, disciplina_id, curso_id, numero_ue, topico, ch_prevista_tempos) values
  ('33333333-0000-0000-0000-000000000094', 'T094-UE1', '22222222-0000-0000-0000-000000000094', '11111111-0000-0000-0000-000000000094', 1, 'Unidade T094', 30);
insert into public.turmas (id, codigo, curso_id, turma, ano_letivo, status) values
  ('44444444-0000-0000-0000-000000000094', 'T094-TUR', '11111111-0000-0000-0000-000000000094', 'T1',
   extract(year from current_date)::smallint, 'ativa');

create temp table t094_antes on commit drop as
  select coalesce(sum(c.ta_ministrado_ano), 0) as ta
    from public.vw_instrutor_carga_anual c
    join public.instrutores i on i.id = c.instrutor_id
   where i.codigo = 'T094-CT-1' and c.ano = extract(year from current_date);

insert into public.registros_aula
  (codigo, data, turma_id, unidade_ensino_id, curso_id, tempos_consumidos, ta_inicial, categoria_normativa, instrutor_id)
select 'T094-REG-1', current_date, '44444444-0000-0000-0000-000000000094',
       '33333333-0000-0000-0000-000000000094', '11111111-0000-0000-0000-000000000094',
       4, 1, 'atividade_extraclasse', i.id
  from public.instrutores i where i.codigo = 'T094-CT-1';

select is(
  (select coalesce(sum(c.ta_ministrado_ano), 0) - (select ta from t094_antes)
     from public.vw_instrutor_carga_anual c
     join public.instrutores i on i.id = c.instrutor_id
    where i.codigo = 'T094-CT-1' and c.ano = extract(year from current_date)),
  4::numeric,
  'RN-INST-04 · lançamento novo muda ta_ministrado_ano sem ação adicional'
);

-- ---------------------------------------------------------------------------------
-- 8 a 14. A CARGA PREVISTA POR INSTRUTOR — T011 respondida por Bernardo em 15/09/2026.
--
-- Amostra: tres disciplinas do curso T094, com janela de 4 semanas (02/03 a 29/03 de 2026:
-- floor(27/7) + 1 = 4), e uma com inicio em 2027.
--   · T94-DIV  30 tempos, DIVIDIDO, designados CT-1 e CT-2 ativos e SC-2 INATIVO -> 15 e 15;
--   · T94-SIM  20 tempos, SIMULTANEO, designados CT-1 e CT-2 -> 20 e 20;
--   · T94-DEC  40 tempos, DIVIDIDO, CT-1 com 12 declarados e CT-2 sem declarar -> 12 e 20;
--   · T94-27   10 tempos, DIVIDIDO, so CT-1, inicio em 2027 -> 10 no ano de 2027.
-- CT-1 em 2026: 15 + 20 + 12 = 47. CT-2 em 2026: 15 + 20 + 20 = 55. SC-2: nada (inativa).
-- ---------------------------------------------------------------------------------
insert into public.disciplinas
  (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos,
   previsao_inicio, previsao_termino, modo_atribuicao_padrao)
values
  ('22222222-0000-0000-0000-0000000940d1', 'T094-DIV', '11111111-0000-0000-0000-000000000094',
   'T94-DIV', 'Dividida T094', 30, '2026-03-02', '2026-03-29', 'dividido'),
  ('22222222-0000-0000-0000-0000000940d2', 'T094-SIM', '11111111-0000-0000-0000-000000000094',
   'T94-SIM', 'Simultanea T094', 20, '2026-03-02', '2026-03-29', 'simultaneo'),
  ('22222222-0000-0000-0000-0000000940d3', 'T094-DEC', '11111111-0000-0000-0000-000000000094',
   'T94-DEC', 'Declarada T094', 40, '2026-03-02', '2026-03-29', 'dividido'),
  ('22222222-0000-0000-0000-0000000940d4', 'T094-27', '11111111-0000-0000-0000-000000000094',
   'T94-27', 'Ano seguinte T094', 10, '2027-03-01', '2027-03-28', 'dividido');

insert into public.turma_disciplina (id, codigo, turma_id, disciplina_id) values
  ('55555555-0000-0000-0000-0000000940a1', 'T094-TD-DIV', '44444444-0000-0000-0000-000000000094', '22222222-0000-0000-0000-0000000940d1'),
  ('55555555-0000-0000-0000-0000000940a2', 'T094-TD-SIM', '44444444-0000-0000-0000-000000000094', '22222222-0000-0000-0000-0000000940d2'),
  ('55555555-0000-0000-0000-0000000940a3', 'T094-TD-DEC', '44444444-0000-0000-0000-000000000094', '22222222-0000-0000-0000-0000000940d3'),
  ('55555555-0000-0000-0000-0000000940a4', 'T094-TD-27',  '44444444-0000-0000-0000-000000000094', '22222222-0000-0000-0000-0000000940d4');

insert into public.turma_disciplina_instrutor (codigo, turma_disciplina_id, instrutor_id, status, ch_prevista_tempos)
select v.codigo, v.td::uuid, i.id, v.status::public.status_registro, v.ch
  from (values
    ('T094-TDI-1', '55555555-0000-0000-0000-0000000940a1', 'T094-CT-1', 'ativo',   null::numeric),
    ('T094-TDI-2', '55555555-0000-0000-0000-0000000940a1', 'T094-CT-2', 'ativo',   null),
    ('T094-TDI-3', '55555555-0000-0000-0000-0000000940a1', 'T094-SC-2', 'inativo', null),
    ('T094-TDI-4', '55555555-0000-0000-0000-0000000940a2', 'T094-CT-1', 'ativo',   null),
    ('T094-TDI-5', '55555555-0000-0000-0000-0000000940a2', 'T094-CT-2', 'ativo',   null),
    ('T094-TDI-6', '55555555-0000-0000-0000-0000000940a3', 'T094-CT-1', 'ativo',   12),
    ('T094-TDI-7', '55555555-0000-0000-0000-0000000940a3', 'T094-CT-2', 'ativo',   null),
    ('T094-TDI-8', '55555555-0000-0000-0000-0000000940a4', 'T094-CT-1', 'ativo',   null)
  ) as v(codigo, td, instrutor, status, ch)
  join public.instrutores i on i.codigo = v.instrutor;

-- 8. A coluna existe, ao lado da ministrada.
select has_column(
  'public', 'vw_instrutor_carga_anual', 'ta_previsto_ano',
  'RN-INST-04 · vw_instrutor_carga_anual traz ta_previsto_ano ao lado de ta_ministrado_ano'
);

-- 9. I-8 · a view recriada perde a escrita que tinha desde o Epico 1.
select is_empty(
  $$select privilege_type from information_schema.table_privileges
     where table_schema = 'public' and table_name = 'vw_instrutor_carga_anual'
       and grantee = 'authenticated'
       and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')$$,
  'I-8 · vw_instrutor_carga_anual nao concede escrita a authenticated'
);

-- 10. So atribuicoes ativas, e no ano da data de inicio prevista.
select results_eq(
  $$select i.codigo, c.ano::int, c.ta_previsto_ano::numeric
      from public.vw_instrutor_carga_anual c
      join public.instrutores i on i.id = c.instrutor_id
     where i.codigo in ('T094-CT-1', 'T094-CT-2', 'T094-SC-2')
       and c.ta_previsto_ano > 0
     order by i.codigo, c.ano$$,
  $$values ('T094-CT-1'::text, 2026, 47.00::numeric), ('T094-CT-1', 2027, 10.00),
           ('T094-CT-2', 2026, 55.00)$$,
  'RN-INST-04 · ta_previsto_ano conta só atribuições ativas, no ano da data de início prevista'
);

-- 11. RN-MAT-05 · dividido reparte, simultaneo da a integral, declarado prevalece.
select results_eq(
  $$select p.nome_disciplina, i.codigo, p.tempos_previstos
      from public.vw_instrutor_carga_prevista p
      join public.instrutores i on i.id = p.instrutor_id
     where p.nome_disciplina in ('Dividida T094', 'Simultanea T094', 'Declarada T094')
     order by p.nome_disciplina, i.codigo$$,
  $$values ('Declarada T094'::text, 'T094-CT-1'::text, 12.00::numeric),
           ('Declarada T094', 'T094-CT-2', 20.00),
           ('Dividida T094',  'T094-CT-1', 15.00),
           ('Dividida T094',  'T094-CT-2', 15.00),
           ('Simultanea T094', 'T094-CT-1', 20.00),
           ('Simultanea T094', 'T094-CT-2', 20.00)$$,
  'RN-MAT-05 · modo dividido reparte e modo simultâneo dá a carga integral'
);

-- 12. T011 (b) · media semanal da atribuicao = tempos / semanas da janela prevista (4 semanas).
select results_eq(
  $$select p.nome_disciplina, i.codigo, p.semanas, p.media_semanal
      from public.vw_instrutor_carga_prevista p
      join public.instrutores i on i.id = p.instrutor_id
     where p.nome_disciplina in ('Dividida T094', 'Simultanea T094')
     order by p.nome_disciplina, i.codigo$$,
  $$values ('Dividida T094'::text, 'T094-CT-1'::text, 4, 3.75::numeric),
           ('Dividida T094', 'T094-CT-2', 4, 3.75),
           ('Simultanea T094', 'T094-CT-1', 4, 5.00),
           ('Simultanea T094', 'T094-CT-2', 4, 5.00)$$,
  'T011 b · média semanal da atribuição = tempos ÷ semanas da janela prevista'
);

-- 13. I-8 · a view nova nasce sem escrita.
select is_empty(
  $$select privilege_type from information_schema.table_privileges
     where table_schema = 'public' and table_name = 'vw_instrutor_carga_prevista'
       and grantee in ('authenticated', 'anon')
       and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')$$,
  'I-8 · vw_instrutor_carga_prevista nao concede escrita a authenticated nem a anon'
);

-- ---------------------------------------------------------------------------------
-- 14. PENDENTE — a semanal do INSTRUTOR (T014).
--
-- ⚠️ A decisao (b) define a media de uma disciplina. Como compor a de um instrutor com varias no
--    mesmo ano e pendencia registrada no contrato em 15/09/2026; ate la, a coluna nao existe.
-- ---------------------------------------------------------------------------------
select todo('T014 pendente: a composicao da semanal do instrutor espera a decisao de Bernardo', 1);

select has_column(
  'public', 'vw_instrutor_carga_anual', 'ta_previsto_semanal',
  'RN-2027-06 · ta_previsto_semanal segue a fórmula registrada'
);

select * from finish();
rollback;
