-- =================================================================================
-- A ordem de antiguidade no caminho de leitura das telas
--
-- O QUE  : acrescenta `ordem_antiguidade` ao FIM de `vw_instrutores`, calculada por
--          `app.fn_antiguidade_ordem(i.id)` — a mesma chave que `vw_instrutor_carga_anual` ja expoe.
--
-- PARA QUE: a `RN-ANT-01` e *Risco: Alto* e transversal: toda lista, seletor e filtro de instrutor
--          sai em antiguidade. O contrato de parametros da spec 006 exige que a CONSULTA peca essa
--          ordem ao banco, e que `?ordem=` so reordene por cima, na apresentacao. Ate aqui a view
--          que as telas leem nao tinha a coluna — so a de carga anual tinha, e ela so traz linha em
--          ano com fato (achado D-5 do tasks.md da spec 006).
--
-- ⚠️ A CHAVE E UMA SO, E NAO UMA COPIA DA FORMULA. `peso * 100000 + declarada` ja vive em
--    `app.fn_antiguidade_ordem`; reescreve-la aqui seria uma segunda fonte de verdade para a regra
--    mais transversal do sistema. Posto fora da escala recebe peso 999 e vai para o fim; quem nao
--    declara antiguidade recebe 99999 e fica no fim do proprio posto.
--
-- ⚠️ SO A ORDEM ENTRA AQUI. A carga prevista por instrutor (`ta_previsto_ano`, FR-014) espera a
--    T011 — qual data poe uma atribuicao num ano —, e vem em migration propria quando ela fechar.
--
-- ⚠️ `create or replace view` SO ACEITA COLUNA NOVA NO FIM, e a lista abaixo e a da migration
--    `20260908120000`, na mesma ordem, com a coluna nova por ultimo. Reordenar qualquer uma faria o
--    motor recusar a substituicao.
-- =================================================================================

create or replace view public.vw_instrutores with (security_invoker = true) as
select
  i.id,
  i.codigo,
  i.posto_graduacao,
  i.esp_hab_obs,
  i.nome_completo,
  i.categoria,
  i.om,
  i.nome_guerra,
  i.nome_normalizado,
  i.nip,
  i.data_nascimento,
  i.dep_divisao,
  i.data_assuncao_setor,
  i.email,
  i.regime_trabalho,
  i.nivel_escolaridade,
  i.formacao_principal_secundaria,
  i.capacitacao_didatica,
  i.data_inicio_docencia_mb,
  i.data_inicio_docencia_ciaara,
  i.ultima_avaliacao_desempenho,
  i.data_avaliacao_desempenho,
  i.preferencia,
  i.disciplinas_ministradas_legado_v1,
  i.antiguidade_declarada,
  i.antiguidade_declarada_num,
  i.status,
  i.origem_migracao_v1,
  i.criado_por,
  i.criado_em,
  i.editado_por,
  i.editado_em,
  i.area_conhecimento,
  app.fn_antiguidade_ordem(i.id) as ordem_antiguidade
from public.instrutores i;

comment on column public.vw_instrutores.ordem_antiguidade is
  'Chave de ordenacao por antiguidade (RN-ANT-01/02): peso do posto como criterio primario, '
  'antiguidade declarada como desempate. Posto fora da escala = 999 (fim da lista). Toda consulta '
  'de lista de instrutor ordena por ela; ordenacao de apresentacao vem por cima, nunca no lugar.';

-- ⚠️ TODA VIEW RECRIADA REPETE O REVOKE. Hoje `create or replace` preserva os privilegios da view
--    antiga, que ja estavam certos; o revoke fica mesmo assim, porque a regra do projeto e nao
--    depender de lembrar se a view foi criada ou substituida.
revoke insert, update, delete, truncate on public.vw_instrutores from authenticated;

-- =================================================================================
-- PLANO DE REVERSAO
--
--   Recriar `public.vw_instrutores` com a definicao de `20260908120000_recorte_dado_pessoal_instrutor.sql`
--   — `create or replace` nao remove coluna, entao a reversao e `drop view` seguido de `create view`,
--   do `grant select` e dos quatro `revoke` daquela migration.
--
-- ⚠️ A reversao tira a ordem de antiguidade da consulta das telas de instrutor, que voltariam a
--    depender de ordenar em memoria.
-- =================================================================================
