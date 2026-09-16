-- =================================================================================
-- A autoria da CRIACAO vem da sessao, e nao do corpo da escrita
--
-- O QUE  : muda UMA condicao de `app.set_auditoria()`. Com sessao autenticada, `criado_por` passa a
--          ser sempre o usuario da sessao, qualquer que seja o valor mandado. Sem sessao — ETL,
--          psql, manutencao —, o comportamento de antes continua: o valor informado e respeitado.
--
-- PARA QUE: o `FR-027` da spec 004 manda preencher a autoria "a partir da identidade autenticada,
--          nunca de campo enviado pelo cliente", e o `FR-029` da spec 006 repete. MEDIDO em
--          15/09/2026 com sessao autenticada de verdade (`tests/invariantes/rls/rls.test.ts`,
--          bloco `FR-029`): um INSERT em `instrutores` mandando `criado_por` com um uuid qualquer
--          GRAVOU aquele uuid. O `editado_por` ja era forcado pelo motor; o `criado_por` nao.
--
-- ⚠️ POR QUE A CONDICAO ANTIGA EXISTIA, e por que ela continua valendo onde precisa. O gatilho so
--    preenchia `criado_por` quando ele vinha nulo porque o ETL do Epico 2 precisa gravar o autor
--    HISTORICO da linha migrada. O ETL roda sem sessao — `app.uid_atual()` devolve NULL —, e e
--    exatamente nesse caso que o valor informado continua sendo aceito. O que muda e so o caso da
--    sessao autenticada, que e o caso da tela e da interface de dados, onde quem escreve controla o
--    corpo da requisicao e um autor escolhido por ele e autoria falsificavel.
--
-- ⚠️ ALCANCE: O GATILHO E UNIVERSAL. A mudanca vale para as tabelas que usam `set_auditoria()`, e
--    nao so para `instrutores`. Nenhuma tela do sistema manda `criado_por`; o que deixa de ser
--    possivel e mandar autor falso por fora da tela.
--
-- ⚠️ ACHADO FORA DO PLANO DA FATIA 5c, corrigido aqui porque a tarefa T033 e o `FR-029` o exigem,
--    e registrado para revisao.
-- =================================================================================

create or replace function app.set_auditoria()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_novo    jsonb;
  v_antigo  jsonb;
  v_uid     uuid := app.uid_atual();
  v_agora   timestamptz := now();     -- now() = instante da TRANSAÇÃO: todas as linhas de
                                      -- um mesmo lote recebem o mesmo carimbo, o que torna
                                      -- o lote reconhecível na auditoria.
begin
  v_novo := to_jsonb(new);

  if tg_op = 'INSERT' then
    -- Carimbo de criação. Sem sessão (ETL, psql), `criado_por` informado é respeitado: o ETL
    -- Python (BRIEF §1) precisa poder gravar o autor histórico da linha. COM sessão autenticada,
    -- o autor é sempre o da sessão — nunca o que veio no corpo da escrita (FR-027 da spec 004).
    if v_novo ? 'criado_em' then
      v_novo := jsonb_set(v_novo, '{criado_em}', app.jsonb_valor(to_jsonb(v_agora)));
    end if;
    if v_novo ? 'criado_por' and ((v_novo ->> 'criado_por') is null or v_uid is not null) then
      v_novo := jsonb_set(v_novo, '{criado_por}', app.jsonb_valor(to_jsonb(v_uid)));
    end if;
    -- Numa criação não existe edição: o par de edição nasce vazio, sempre.
    if v_novo ? 'editado_em' then
      v_novo := jsonb_set(v_novo, '{editado_em}', 'null'::jsonb);
    end if;
    if v_novo ? 'editado_por' then
      v_novo := jsonb_set(v_novo, '{editado_por}', 'null'::jsonb);
    end if;

  elsif tg_op = 'UPDATE' then
    v_antigo := to_jsonb(old);
    -- Carimbo de criação é IMUTÁVEL: devolve à força o valor original.
    if v_novo ? 'criado_em' then
      v_novo := jsonb_set(v_novo, '{criado_em}', app.jsonb_valor(v_antigo -> 'criado_em'));
    end if;
    if v_novo ? 'criado_por' then
      v_novo := jsonb_set(v_novo, '{criado_por}', app.jsonb_valor(v_antigo -> 'criado_por'));
    end if;
    -- Carimbo de edição é sempre reescrito pelo motor, nunca aceito da aplicação.
    if v_novo ? 'editado_em' then
      v_novo := jsonb_set(v_novo, '{editado_em}', app.jsonb_valor(to_jsonb(v_agora)));
    end if;
    if v_novo ? 'editado_por' then
      v_novo := jsonb_set(v_novo, '{editado_por}', app.jsonb_valor(to_jsonb(v_uid)));
    end if;
  end if;

  -- Reconstrói o registro tipado a partir do jsonb ajustado.
  new := jsonb_populate_record(new, v_novo);
  return new;
end;
$$;

comment on function app.set_auditoria() is
  'Gatilho BEFORE INSERT OR UPDATE que preenche criado_por/criado_em/editado_por/editado_em. '
  'Genérico por inspeção jsonb: serve a qualquer tabela, preenchendo apenas as colunas que '
  'ela tiver. O carimbo de CRIAÇÃO é imutável em UPDATE. Com sessão autenticada, criado_por é '
  'sempre o da sessão; sem sessão (ETL), o valor informado é respeitado. '
  'Substitui a convenção C-06 da v2.0 por garantia do motor.';

-- =================================================================================
-- PLANO DE REVERSAO
--
--   Reaplicar a definicao de `app.set_auditoria()` de
--   `20260829232840_fundacao_tipos_e_auditoria.sql`, em que a condicao do INSERT e
--   `v_novo ? 'criado_por' and (v_novo ->> 'criado_por') is null`.
--
-- ⚠️ Reverter devolve a qualquer sessao autenticada a possibilidade de gravar autoria falsa numa
--    criacao, por fora da tela.
-- =================================================================================
