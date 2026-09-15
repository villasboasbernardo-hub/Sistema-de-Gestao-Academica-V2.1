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
-- ⚠️ A CARGA PREVISTA ESTÁ PENDENTE, E A PENDÊNCIA É EXPLÍCITA. `ta_previsto_ano` depende da T011
--    — qual data põe uma atribuição num ano —, que Bernardo ainda não respondeu. As asserções dela
--    ficam como `todo` do pgTAP: rodam, reprovam, e o relatório as mostra como pendentes, em vez de
--    sumirem ou de passarem com `ok(true)`.
--
-- Contrato: specs/006-cadastro-de-instrutores/contracts/carga-horaria-e-alertas.md · FR-001, FR-002
-- =================================================================================

begin;
select plan(8);

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
-- 7 e 8. PENDENTES DA T011 — carga prevista por instrutor (RN-INST-04, FR-014).
--
-- ⚠️ `ta_previsto_ano` só entra quando a T011 (c) disser qual data põe uma atribuição num ano. E
--    `vw_instrutor_carga_anual` só perde o INSERT e o UPDATE de `authenticated` quando for recriada
--    junto com essa coluna — hoje ela os tem, e é um dos dez casos do achado R-8.
-- ---------------------------------------------------------------------------------
select todo('T011 pendente: a carga prevista por instrutor espera a decisao de Bernardo', 2);

select has_column(
  'public', 'vw_instrutor_carga_anual', 'ta_previsto_ano',
  'RN-INST-04 · vw_instrutor_carga_anual traz ta_previsto_ano ao lado de ta_ministrado_ano'
);

select is_empty(
  $$select privilege_type from information_schema.table_privileges
     where table_schema = 'public' and table_name = 'vw_instrutor_carga_anual'
       and grantee = 'authenticated'
       and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')$$,
  'I-8 · vw_instrutor_carga_anual nao concede escrita a authenticated'
);

select * from finish();
rollback;
