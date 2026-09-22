-- =================================================================================
-- Migration 4 de 7 — Epico 5, fatia (a): as linhas de disciplina nascem com a turma
--
-- O QUE  : `app.turma_disciplina_codigo_seq` e o gerador `TDI-NNNNNN` que so chama `nextval`;
--          e o gatilho `AFTER INSERT` em `turmas` que faz nascer uma `turma_disciplina` por
--          disciplina ATIVA do curso, herdando o periodo da grade quando a condicao vale.
--
-- ORIGEM : FR-032, FR-032.1, FR-032.2, FR-032.3, FR-046 · spec `009-cursos-e-turmas` · R-5, R-6.
--          Decisoes de Bernardo Villas Boas de 16/09/2026 (Q-24) e 17/09/2026.
--
-- ⚠️ A CONDICAO DE HERANCA E COMPORTAMENTO EXISTENTE, lida no codigo que criou as 210 linhas da
--    v2.0 — `SIS11/CIAARA-11-v2/migracao/criar_turma_disciplina.py`, linhas 153-157:
--        herda = grade_ini and janela_ini and janela_fim and janela_ini <= grade_ini <= janela_fim
--    O comentario do proprio script diz por que: *"e o que impede a data da T1 de ser copiada para
--    a T2 do mesmo curso"*. Portar e reescrever preservando o comportamento (regra 1 do CLAUDE.md).
--    Turma sem datas, ou com janela incompleta, NAO permite avaliar a condicao: a linha nasce
--    `nao_informado` — e isso e texto do requisito, nao consequencia da implementacao.
--
-- ⚠️ SO DISCIPLINA ATIVA, e isso DIFERE do script da v2.0 de proposito (FR-032.3). E de la que vem a
--    linha da disciplina inativa `ALH-II` em `C-Esp-ALH 2026`: 9 linhas para 8 disciplinas ativas.
--    Aquela linha e FATO HISTORICO — nao se remove e nao se replica.
--
-- ⚠️ `SECURITY DEFINER`, E O MOTIVO E ACOPLAMENTO, NAO CONVENIENCIA (R-6). A policy de insercao em
--    `turma_disciplina` exige `disciplinas.editar`, e os quatro perfis que criam turma a tem HOJE —
--    e so por isso o gatilho funcionaria com os direitos de quem cria. As linhas sao CONSEQUENCIA
--    ESTRUTURAL da turma, nao escrita discricionaria: a autorizacao que importa ja foi decidida
--    quando a policy `turmas_criar` aceitou a turma. Com direitos do chamador, retirar
--    `disciplinas.editar` de um perfil — uma linha de `perfil_permissao`, decisao de negocio
--    legitima — QUEBRARIA A CRIACAO DE TURMA sem que ninguem ligasse uma coisa a outra.
--    A auditoria nao perde o autor: `app.set_auditoria()` le o usuario da sessao pelo JWT, que
--    continua o mesmo dentro da funcao.
--    ⚠️ E a prova disso tem DUAS METADES, em sessao autenticada real — `cursos-e-turmas.test.ts`:
--    sem `disciplinas.editar` o perfil CRIA TURMA e as linhas nascem; e o MESMO perfil, na MESMA
--    sessao, e RECUSADO ao escrever direto na tabela. Sem a segunda, o teste provaria apenas que a
--    permissao e irrelevante, que e conclusao diferente e errada (exigencia de 17/09/2026).
--
-- ⚠️ O GERADOR E `nextval` E NADA MAIS (R-5). `app.proximo_codigo_vinculo()`, da fatia (c), faz
--    `nextval` e depois `max(...)+1` se a sequencia estiver atras — duas sessoes simultaneas com a
--    sequencia atrasada leem o mesmo `max` e devolvem o MESMO codigo. E raro e barulhento, mas e o
--    padrao que esta decisao proibe; corrigi-lo la e a pendencia T132 da spec 006, de Bernardo.
--    O caso que a sequencia sozinha nao cobre — carga do ETL gravando codigos explicitos e deixando
--    a sequencia para tras — e resolvido NO ETL (T073), com um passo final de `setval`, e a
--    invariante *"a sequencia nunca esta atras do maior codigo gravado"* esta no `102`.
-- =================================================================================

-- ---------------------------------------------------------------- 1. a sequencia, com setval UNICO
create sequence app.turma_disciplina_codigo_seq as bigint;

comment on sequence app.turma_disciplina_codigo_seq is
  'FR-032.2 (R-5): numeracao de `turma_disciplina.codigo` no formato TDI-NNNNNN. Avancada por '
  '`nextval` e so por ele. Buraco na numeracao quando uma transacao e desfeita e CUSTO ACEITO — o '
  'codigo identifica, nao conta.';

do $$
declare
  v_maior bigint;
begin
  select coalesce(max(substring(codigo from 5)::bigint), 0)
    into v_maior
    from public.turma_disciplina
   where codigo ~ '^TDI-[0-9]+$';

  if v_maior = 0 then
    -- Tabela vazia (e o caso de `pnpm db:reset`): o proximo `nextval` devolve 1.
    perform setval('app.turma_disciplina_codigo_seq', 1, false);
  else
    perform setval('app.turma_disciplina_codigo_seq', v_maior, true);
  end if;

  raise notice 'FR-032.2 · sequencia TDI- posicionada em %, a partir do maior codigo gravado.', v_maior;
end;
$$;

create or replace function app.proximo_codigo_turma_disciplina()
returns text
language sql
security definer
set search_path = pg_catalog, public
as $$
  select 'TDI-' || lpad(nextval('app.turma_disciplina_codigo_seq')::text, 6, '0');
$$;

comment on function app.proximo_codigo_turma_disciplina() is
  'FR-032.2 (R-5): devolve o proximo TDI-NNNNNN. SO `nextval` — NENHUMA leitura de `max()` em tempo '
  'de execucao. `nextval` e atomica e nao transacional: cada chamada devolve um valor que nenhuma '
  'outra sessao recebe, mesmo com as duas transacoes abertas ao mesmo tempo.';

-- ⚠️ O `DEFAULT` e avaliado com os direitos de QUEM INSERE, entao `authenticated` precisa de
--    EXECUTE — sem isso, toda criacao de turma falharia com `permission denied for function`. E o
--    mesmo padrao de `app.proximo_codigo_vinculo()` na fatia (c).
revoke all on function app.proximo_codigo_turma_disciplina() from public, anon;
grant execute on function app.proximo_codigo_turma_disciplina() to authenticated, service_role;

alter table public.turma_disciplina
  alter column codigo set default app.proximo_codigo_turma_disciplina();

-- ---------------------------------------------------------------- 2. o nascimento das linhas
create or replace function app.fazer_nascer_disciplinas_da_turma()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.turma_disciplina (turma_id, disciplina_id, previsao_inicio, previsao_termino, origem_periodo)
  select
    new.id,
    g.id,
    case when g.herda then g.previsao_inicio  end,
    case when g.herda then g.previsao_termino end,
    case when g.herda then 'herdado_grade'::origem_periodo else 'nao_informado'::origem_periodo end
  from (
    select
      d.id,
      d.previsao_inicio,
      d.previsao_termino,
      -- A condicao da v2.0, verbatim: previsao de inicio na grade, janela COMPLETA da turma, e a
      -- previsao caindo dentro dela, pontas incluidas.
      (    d.previsao_inicio is not null
       and new.data_inicio   is not null
       and new.data_termino  is not null
       and new.data_inicio  <= d.previsao_inicio
       and d.previsao_inicio <= new.data_termino) as herda
    from public.disciplinas d
    where d.curso_id = new.curso_id
      and d.status   = 'ativo'
  ) g;

  return null;
end;
$$;

comment on function app.fazer_nascer_disciplinas_da_turma() is
  'FR-032: faz nascer uma linha de `turma_disciplina` por disciplina ATIVA do curso, na mesma '
  'transacao da turma — por gatilho, para cobrir QUALQUER caminho de criacao, e nao so a Server '
  'Action. Herda o periodo da grade pela condicao do script da v2.0 (FR-032.1). SECURITY DEFINER '
  'por R-6: as linhas sao consequencia estrutural, e a autorizacao ja foi decidida em `turmas_criar`.';

-- Funcao de gatilho nao e chamavel fora do gatilho; o `revoke` deixa isso escrito.
revoke all on function app.fazer_nascer_disciplinas_da_turma() from public, anon, authenticated;

create trigger trg_turmas_fazer_nascer_disciplinas
  after insert on public.turmas
  for each row execute function app.fazer_nascer_disciplinas_da_turma();

-- =================================================================================
-- PLANO DE REVERSAO — ESCRITO E EXECUTADO em 17/09/2026, numa base descartavel (T036)
-- (o carimbo do arquivo e UTC; o relogio da maquina marcava 17/09/2026)
--
-- COMO FOI EXECUTADO: `pnpm db:reset` SEM as quatro migrations, carga do ETL (APROVADA), as quatro
-- aplicadas sobre a base carregada. ⚠️ MEDIDO ALI: o `setval` desta migration posicionou a sequencia
-- em **210**, o maior codigo carregado — nesse caminho ela ja nasce correta; quem precisa do passo
-- da T073 e o caminho inverso, `db:reset` primeiro e carga depois, em que a sequencia fica em 1 e a
-- proxima turma colide com `23505`. E as 210 linhas continuaram sendo 210: a carga traz `turmas`
-- ANTES de `disciplinas` (conferencia 10), entao nenhuma nasceu pelo gatilho durante a carga.
--
-- CONFERIDO DEPOIS DA REVERSAO: turma nova (`CAHO T9 2099`) nasce com **ZERO** linhas, as 210 ficam
-- intactas, e os 21 arquivos pgTAP anteriores ficaram verdes — so o `102` reprova, que e o esperado.
--
--   drop trigger if exists trg_turmas_fazer_nascer_disciplinas on public.turmas;
--   drop function if exists app.fazer_nascer_disciplinas_da_turma();
--
--   alter table public.turma_disciplina alter column codigo drop default;
--   drop function if exists app.proximo_codigo_turma_disciplina();
--   drop sequence if exists app.turma_disciplina_codigo_seq;
--
-- ⚠️ AS LINHAS JA NASCIDAS FICAM. Elas sao a grade real das turmas criadas depois desta migration,
--    e apaga-las seria reverter DADO, nao migration (regra 4 do CLAUDE.md).
--
-- ⚠️ REVERTER DEVOLVE DUAS COISAS: turma volta a nascer SEM grade — e a diferenca entre turma nova
--    e turma migrada volta a existir para a fatia (b) e para a LIQ —, e `turma_disciplina.codigo`
--    volta a ser digitado a mao, sem gerador.
-- =================================================================================
