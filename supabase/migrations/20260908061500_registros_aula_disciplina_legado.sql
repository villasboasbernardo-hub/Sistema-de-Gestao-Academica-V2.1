-- =================================================================================
-- Quarentena da disciplina legada em `registros_aula`
--
-- O QUÊ  : uma coluna de texto que guarda o `ID_Grade` da v2.0, verbatim.
--
-- PARA QUÊ: preservar a evidência histórica que a combinação de três decisões corretas
--          faria desaparecer. Nenhuma delas está errada; a interação é que produz a
--          perda, e ela só ficou visível quando as três passaram a coexistir:
--
--            1. Decisão UE-1 (26/08): `registros_aula` no grão de Unidade de Ensino.
--               A disciplina passa a ser alcançada por `unidade_ensino_id →
--               unidades_ensino.disciplina_id`. Sem `disciplina_id` na tabela —
--               guardar as duas seria a segunda fonte de verdade que a rota (b)
--               eliminou (FR-020, protegido por `hasnt_column` em 050).
--            2. Decisão de 07/09: a UE fica **nula** nos cursos sem planilha da v1.0,
--               porque inventar UE sintética foi vetado.
--            3. Medição de 08/09: o cruzamento fecha em **901 de 1.566** casados.
--
--          Resultado: **665 registros ficariam sem vínculo com disciplina nenhuma** —
--          42% do histórico —, apesar de o `ID_Grade` existir e estar preenchido na
--          origem. Isso contraria o FR-001 ("100% do histórico").
--
-- COMO   : coluna de **quarentena**, no padrão que este schema já usa para dado legado
--          (`instrutores_atribuidos_legado_v1`, `tipo_legado_v1`,
--          `disciplinas_ministradas_legado_v1`). Guarda **o que foi**, não o que é.
--
-- POR QUE ISTO NÃO REABRE A ROTA (b): é `text`, não `uuid`; não tem FK; não é
--          consultável como vínculo; e o nome diz `legado_v1`. Ninguém a confunde com
--          fonte de verdade — que é exatamente a diferença entre preservar evidência e
--          criar uma segunda fonte. O `hasnt_column('disciplina_id')` do teste 050
--          continua valendo, intocado.
--
-- Decisão de Bernardo, 08/09/2026 (opção C de três apresentadas).
-- =================================================================================

alter table public.registros_aula
  add column disciplina_codigo_legado_v1 text;

comment on column public.registros_aula.disciplina_codigo_legado_v1 is
  'QUARENTENA: o ID_Grade da v2.0, verbatim. Guarda O QUE FOI, nao o que e. '
  'Existe porque a disciplina, no grao de UE, e alcancada por unidade_ensino_id — e a '
  'UE e nula em 665 dos 1.566 registros historicos, que perderiam o vinculo. '
  'NAO e FK, NAO e uuid, NAO e fonte de verdade: e evidencia. '
  'A fonte de verdade continua sendo unidades_ensino.disciplina_id, via a UE. '
  'Decisao de Bernardo, 08/09/2026.';

-- Índice parcial: só as linhas de quarentena interessam, e são a minoria que perdeu o
-- vínculo. Parcial porque consultar por aqui é excecao — auditoria, nao operacao.
create index idx_reg_aula_disciplina_legado
  on public.registros_aula (disciplina_codigo_legado_v1)
  where disciplina_codigo_legado_v1 is not null and unidade_ensino_id is null;

-- =================================================================================
-- PLANO DE REVERSÃO
--
--   drop index if exists public.idx_reg_aula_disciplina_legado;
--   alter table public.registros_aula drop column if exists disciplina_codigo_legado_v1;
--
-- ⚠️ Depois da primeira carga real, reverter **apaga a única evidência** do vínculo
--    disciplina↔registro dos 665 sem UE. A partir daí a reversão desta migration deixa
--    de ser operação técnica e passa a ser decisão sobre descartar histórico.
-- =================================================================================
