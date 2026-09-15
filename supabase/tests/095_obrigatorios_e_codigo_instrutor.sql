-- =================================================================================
-- 095 — Os cinco obrigatórios de instrutor e o código gerado
--
-- O QUÊ  : prova que o BANCO recusa cadastro sem posto, especialidade, nome, categoria ou OM —
--          inclusive só com espaços — e que instrutor inserido sem código recebe inteiro simples.
--
-- ⚠️ `NOT NULL` NÃO COBRE O `FR-005`. Texto só com espaço passa por `NOT NULL` e é ausência
--    disfarçada. A recusa é `CHECK`, e é do banco porque o `FR-006` exige que ela valha por qualquer
--    caminho, não só pela tela.
--
-- ⚠️ O CÓDIGO PRECISA ALCANÇAR O QUE O ETL GRAVOU. No corte, as migrations rodam antes da carga, e
--    o ETL grava os códigos 1 a 177 explicitamente. Uma sequência que não os enxergasse começaria em
--    1 e colidiria no primeiro cadastro pela tela. A asserção 13 simula exatamente isso.
--
-- Contrato: specs/006-cadastro-de-instrutores/data-model.md · FR-005 a FR-007, RN-INST-03, RN-CRUD-03
-- =================================================================================

begin;
select plan(13);

-- ---------------------------------------------------------------------------------
-- 1 a 10. Cada obrigatório, vazio e só com espaços, é recusado com violação de CHECK (23514).
-- ---------------------------------------------------------------------------------
select throws_ok(
  $$insert into public.instrutores (codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om)
    values ('T095-01', '', '-EF', 'Nome', 'Militar', 'CIAARA')$$,
  '23514', null, 'RN-INST-03 · posto_graduacao vazio e recusado pelo banco');
select throws_ok(
  $$insert into public.instrutores (codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om)
    values ('T095-02', '   ', '-EF', 'Nome', 'Militar', 'CIAARA')$$,
  '23514', null, 'RN-INST-03 · posto_graduacao so com espacos e recusado pelo banco');
select throws_ok(
  $$insert into public.instrutores (codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om)
    values ('T095-03', 'CT', '', 'Nome', 'Militar', 'CIAARA')$$,
  '23514', null, 'RN-INST-03 · esp_hab_obs vazio e recusado pelo banco');
select throws_ok(
  $$insert into public.instrutores (codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om)
    values ('T095-04', 'CT', '   ', 'Nome', 'Militar', 'CIAARA')$$,
  '23514', null, 'RN-INST-03 · esp_hab_obs so com espacos e recusado pelo banco');
select throws_ok(
  $$insert into public.instrutores (codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om)
    values ('T095-05', 'CT', '-EF', '', 'Militar', 'CIAARA')$$,
  '23514', null, 'RN-INST-03 · nome_completo vazio e recusado pelo banco');
select throws_ok(
  $$insert into public.instrutores (codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om)
    values ('T095-06', 'CT', '-EF', '   ', 'Militar', 'CIAARA')$$,
  '23514', null, 'RN-INST-03 · nome_completo so com espacos e recusado pelo banco');
select throws_ok(
  $$insert into public.instrutores (codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om)
    values ('T095-07', 'CT', '-EF', 'Nome', '', 'CIAARA')$$,
  '23514', null, 'RN-INST-03 · categoria vazia e recusada pelo banco');
select throws_ok(
  $$insert into public.instrutores (codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om)
    values ('T095-08', 'CT', '-EF', 'Nome', '   ', 'CIAARA')$$,
  '23514', null, 'RN-INST-03 · categoria so com espacos e recusada pelo banco');
select throws_ok(
  $$insert into public.instrutores (codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om)
    values ('T095-09', 'CT', '-EF', 'Nome', 'Militar', '')$$,
  '23514', null, 'RN-INST-03 · om vazia e recusada pelo banco');
select throws_ok(
  $$insert into public.instrutores (codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om)
    values ('T095-10', 'CT', '-EF', 'Nome', 'Militar', '   ')$$,
  '23514', null, 'RN-INST-03 · om so com espacos e recusada pelo banco');

-- ---------------------------------------------------------------------------------
-- 11. Controle positivo: os cinco preenchidos passam. Sem ele, um CHECK que recusasse tudo
--     passaria nas dez asserções acima.
-- ---------------------------------------------------------------------------------
select lives_ok(
  $$insert into public.instrutores (codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om)
    values ('500', 'CT', '-EF', 'Instrutor Com Os Cinco', 'Militar', 'CIAARA')$$,
  'RN-INST-03 · controle positivo — os cinco preenchidos sao aceitos');

-- ---------------------------------------------------------------------------------
-- 12 e 13. O código gerado.
--     A linha '500' acima simula o que o ETL grava com código explícito. A próxima inserção sem
--     código precisa sair acima dela, e como inteiro simples, sem prefixo.
-- ---------------------------------------------------------------------------------
insert into public.instrutores (posto_graduacao, esp_hab_obs, nome_completo, categoria, om)
values ('CT', '-EF', 'Instrutor Com Codigo Gerado', 'Militar', 'CIAARA');

select matches(
  (select codigo from public.instrutores where nome_completo = 'Instrutor Com Codigo Gerado'),
  '^[0-9]+$',
  'RN-CRUD-03 · instrutor inserido sem codigo recebe inteiro simples, sem prefixo'
);

select cmp_ok(
  (select codigo::bigint from public.instrutores where nome_completo = 'Instrutor Com Codigo Gerado'),
  '>',
  500::bigint,
  'RN-CRUD-03 · o codigo gerado sai acima do maior existente, inclusive o gravado com codigo explicito'
);

select * from finish();
rollback;
