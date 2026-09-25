-- =================================================================================
-- M1 da fatia (b) do Epico 5 — o codigo de disciplina e de unidade de ensino passa a
-- ser GERADO PELO BANCO.
--
-- O QUE  : sequencias `app.disciplinas_codigo_seq` e `app.unidades_ensino_codigo_seq`,
--          as funcoes que as consomem e o `DEFAULT` das duas colunas `codigo`.
-- ORIGEM : `FR-012` e `FR-061` da spec 010; Q-11 e N-5 (decisoes de Bernardo Villas
--          Boas, 24/09/2026 — "DIS- por sequencia em app", "comeca em 000001, com
--          assercao de que nenhum codigo legado usa o prefixo").
-- DATA   : 25/09/2026 (local). O carimbo do arquivo e UTC — dois carimbos, os dois certos.
--
-- ⚠️ POR QUE `DEFAULT` E NAO GATILHO: o gerador de tipos enxerga `DEFAULT` e nao enxerga
--    gatilho (gotcha 5.2 do `CLAUDE.md`). Com `DEFAULT`, `codigo` sai OPCIONAL em
--    `Insert` no tipo gerado, e e assim que se confere, de graca, que o mecanismo ficou
--    como se pretendia. `turma_disciplina.codigo` ja e assim.
--
-- ⚠️ E `DEFAULT` QUE CHAMA FUNCAO PRECISA DE `grant execute` A QUEM INSERE (gotcha 5.1):
--    o `DEFAULT` e avaliado com os direitos de quem faz o `INSERT`, mesmo sendo a funcao
--    `SECURITY DEFINER`. Sem o `grant`, a gravacao falha com `permission denied for
--    function` — e o erro aponta para a funcao, nao para a coluna.
--
-- ⚠️ O QUE ESTA MIGRATION NAO FAZ: nao mexe em nenhum dos 175 codigos existentes. Eles
--    guardam o `ID_Grade` da v2.0 verbatim (`53 - C-Ap-FR - XIII`) e continuam validos —
--    medido em 25/09/2026: ZERO dos 175 comeca com `DIS-`, logo nao ha colisao possivel
--    com a sequencia comecando em 1 (N-5).
--
-- REVERSAO (executada numa base descartavel antes do PR):
--    alter table public.disciplinas      alter column codigo drop default;
--    alter table public.unidades_ensino  alter column codigo drop default;
--    drop function if exists app.proximo_codigo_disciplina();
--    drop function if exists app.proximo_codigo_unidade_ensino();
--    drop sequence if exists app.disciplinas_codigo_seq;
--    drop sequence if exists app.unidades_ensino_codigo_seq;
--    As linhas criadas com codigo gerado FICAM com o codigo que receberam — e correto:
--    o codigo e identidade de negocio, nao detalhe do mecanismo.
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- 1. As sequencias, no schema `app` — como as quatro que ja existem
-- ---------------------------------------------------------------------------------
create sequence if not exists app.disciplinas_codigo_seq as bigint start 1 increment 1;
create sequence if not exists app.unidades_ensino_codigo_seq as bigint start 1 increment 1;

comment on sequence app.disciplinas_codigo_seq is
  'Numerador de `disciplinas.codigo` no padrao DIS-NNNNNN (FR-012, Q-11). Comeca em 1: '
  'medido em 25/09/2026, nenhum dos 175 codigos legados usa o prefixo DIS- (N-5). '
  'Entra em `carregar.SEQUENCIAS_DE_CODIGO` — quem restaura dado a avanca (gotcha 9).';

comment on sequence app.unidades_ensino_codigo_seq is
  'Numerador de `unidades_ensino.codigo` no padrao UE-NNNNNN (FR-061). A carga do PR 2 '
  'usa o DEFAULT como qualquer escrita, e avanca a sequencia ao final.';

-- ---------------------------------------------------------------------------------
-- 2. As funcoes — o molde e `app.proximo_codigo_turma_disciplina()`
-- ---------------------------------------------------------------------------------
create or replace function app.proximo_codigo_disciplina()
returns text
language sql
volatile
set search_path = pg_catalog, public
as $$
  select 'DIS-' || lpad(nextval('app.disciplinas_codigo_seq')::text, 6, '0');
$$;

create or replace function app.proximo_codigo_unidade_ensino()
returns text
language sql
volatile
set search_path = pg_catalog, public
as $$
  select 'UE-' || lpad(nextval('app.unidades_ensino_codigo_seq')::text, 6, '0');
$$;

comment on function app.proximo_codigo_disciplina() is
  'Proximo codigo de disciplina (FR-012). NUNCA MAX+1: sequencia, que nao colide sob '
  'concorrencia. Chamada pelo DEFAULT da coluna, com os direitos de quem insere.';

comment on function app.proximo_codigo_unidade_ensino() is
  'Proximo codigo de unidade de ensino (FR-061). Mesma razao da anterior.';

-- ⚠️ `grant execute` a quem INSERE, senao o DEFAULT falha (gotcha 5.1). A `service_role`
--    entra porque o ETL e a carga do PR 2 gravam por ela.
revoke all on function app.proximo_codigo_disciplina() from public, anon;
revoke all on function app.proximo_codigo_unidade_ensino() from public, anon;
grant execute on function app.proximo_codigo_disciplina() to authenticated, service_role;
grant execute on function app.proximo_codigo_unidade_ensino() to authenticated, service_role;

grant usage on sequence app.disciplinas_codigo_seq to authenticated, service_role;
grant usage on sequence app.unidades_ensino_codigo_seq to authenticated, service_role;

-- ---------------------------------------------------------------------------------
-- 3. O `DEFAULT` nas duas colunas
-- ---------------------------------------------------------------------------------
alter table public.disciplinas
  alter column codigo set default app.proximo_codigo_disciplina();

alter table public.unidades_ensino
  alter column codigo set default app.proximo_codigo_unidade_ensino();

comment on column public.disciplinas.codigo is
  'Chave de negocio. Nas 175 linhas migradas guarda o `ID_Grade` da v2.0 VERBATIM '
  '(`53 - C-Ap-FR - XIII`). Disciplina NOVA nasce `DIS-NNNNNN` pelo DEFAULT (FR-012, '
  'Q-11, 24/09/2026) — a pessoa nao digita, e o 23505 desta coluna e erro interno de '
  'numeracao, nao "escolha outro" (gotcha 9 do CLAUDE.md). Nenhuma FK aponta para ca.';

comment on column public.unidades_ensino.codigo is
  'Chave de negocio da UE, `UE-NNNNNN`, gerada pelo DEFAULT (FR-061). A carga do '
  'curriculo (PR 2) usa o mesmo caminho: nao inventa codigo.';
