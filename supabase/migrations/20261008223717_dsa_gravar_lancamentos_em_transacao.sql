-- =====================================================================================
-- 20261008223717_dsa_gravar_lancamentos_em_transacao.sql
-- Epico 6 · spec 013 · ajustes do PR #40 (conferencia de Bernardo Villas Boas, 08/10/2026)
-- Data local: 08/10/2026  (o carimbo do nome e UTC, gerado pela CLI; a diferenca e fuso)
-- -------------------------------------------------------------------------------------
-- D-DSA-3 · o bloco que cresce, e lancado ou movido sobre outro lancamento da MESMA turma no mesmo
--           dia EMPURRA os seguintes, em cascata — "Tudo numa transacao: ou todos movem, ou nada
--           muda. Cada empurrado e UPDATE do mesmo registro (id e auditoria preservados)".
--
-- ⚠️ POR QUE UMA FUNCAO: pela interface de dados cada UPDATE e uma transacao propria, e os empurrados
--    podem estar em tabelas diferentes (aula, avaliacao, atividade). Autorizada por Bernardo Villas
--    Boas em 08/10/2026, na pergunta feita durante a execucao do comando de ajustes ("Migration com
--    RPC"), porque o comando dizia "sem migration nova; se exigir, pare e pergunte".
--
-- ⚠️ ELA NAO DECIDE NADA. A cascata e regra pura em `lib/dominio/dsa/empurrar.ts`; teto de TFM,
--    feriado, etapa presencial e habilitacao sao conferidos pela Server Action ANTES. Aqui so se
--    APLICA uma lista de operacoes, numa transacao: a primeira que falhar desfaz todas.
--
-- ⚠️ SECURITY INVOKER — A RLS E OS PRIVILEGIOS SAO OS DE QUEM CHAMA. A funcao nao alcanca nada que a
--    sessao nao alcance pela interface de dados. Por isso o `UPDATE` que nao casa linha nenhuma (a
--    policy de UPDATE responde sucesso com zero linhas — gotcha 4) vira ERRO aqui: sem isso, o
--    empurrado fora do alcance seria pulado em silencio e a cascata ficaria pela metade.
--
-- ⚠️ SQL DINAMICO, E POR ISSO TRES GRADES: (1) a tabela e uma das tres do DSA, nominal; (2) cada
--    coluna pedida tem de existir no catalogo, nao ser gerada e nao ser de auditoria — qualquer outra
--    chave RECUSA a operacao inteira; (3) os nomes vao por `%I` e os valores por parametro, tipados
--    por `jsonb_populate_record`. Nenhum texto do cliente vira SQL.
--
-- ⚠️ SEM `RETURNING` NO INSERT (gotcha 4.1): o `id` vem gerado pela Server Action, como no `lancar`.
--
-- -------------------------------------------------------------------------------------
-- PLANO DE REVERSAO (DoD 6) — escrito ANTES do `up`. A funcao nao guarda dado: reverter e so tira-la,
-- e a Server Action volta a gravar sem empurrao (o codigo de antes deste PR).
--   begin;
--   drop function if exists public.gravar_lancamentos_em_transacao(jsonb);
--   commit;
-- =====================================================================================

create or replace function public.gravar_lancamentos_em_transacao(p_operacoes jsonb)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_op       jsonb;
  v_acao     text;
  v_tabela   text;
  v_campos   jsonb;
  v_id       uuid;
  v_colunas  text;
  v_qtd      integer;
  v_chaves   integer;
  v_linhas   integer;
  v_total    integer := 0;
begin
  if jsonb_typeof(p_operacoes) is distinct from 'array' or jsonb_array_length(p_operacoes) = 0 then
    raise exception 'Operacao invalida para gravar_lancamentos_em_transacao' using errcode = '22023', hint = 'operacoes_invalidas';
  end if;

  for v_op in select o from jsonb_array_elements(p_operacoes) as o loop
    v_acao   := v_op ->> 'acao';
    v_tabela := v_op ->> 'tabela';
    v_campos := v_op -> 'campos';

    if v_tabela is null
       or v_tabela not in ('registros_aula', 'avaliacoes', 'atividades_nao_letivas') then
      raise exception 'Operacao invalida para gravar_lancamentos_em_transacao' using errcode = '22023', hint = 'operacoes_invalidas';
    end if;
    if jsonb_typeof(v_campos) is distinct from 'object' then
      raise exception 'Operacao invalida para gravar_lancamentos_em_transacao' using errcode = '22023', hint = 'operacoes_invalidas';
    end if;

    select string_agg(format('%I', c.column_name), ', ' order by c.ordinal_position), count(*)
      into v_colunas, v_qtd
      from information_schema.columns c
     where c.table_schema = 'public'
       and c.table_name = v_tabela
       and c.is_generated = 'NEVER'
       and c.column_name not in ('criado_por', 'criado_em', 'editado_por', 'editado_em')
       and v_campos ? c.column_name;

    select count(*) into v_chaves from jsonb_object_keys(v_campos);
    if v_qtd = 0 or v_qtd <> v_chaves then
      raise exception 'Operacao invalida para gravar_lancamentos_em_transacao' using errcode = '22023', hint = 'operacoes_invalidas';
    end if;

    if v_acao = 'inserir' then
      execute format(
        'insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, $1)',
        v_tabela, v_colunas, v_colunas, v_tabela
      ) using v_campos;
    elsif v_acao = 'atualizar' then
      v_id := (v_op ->> 'id')::uuid;
      if v_id is null then
        raise exception 'Operacao invalida para gravar_lancamentos_em_transacao' using errcode = '22023', hint = 'operacoes_invalidas';
      end if;
      execute format(
        'update public.%I set (%s) = (select %s from jsonb_populate_record(null::public.%I, $1)) where id = $2',
        v_tabela, v_colunas, v_colunas, v_tabela
      ) using v_campos, v_id;
      get diagnostics v_linhas = row_count;
      if v_linhas = 0 then
        raise exception 'Lancamento fora do alcance de quem grava' using errcode = '42501', hint = 'lancamento_fora_do_alcance';
      end if;
    else
      raise exception 'Operacao invalida para gravar_lancamentos_em_transacao' using errcode = '22023', hint = 'operacoes_invalidas';
    end if;

    v_total := v_total + 1;
  end loop;

  return v_total;
end
$$;

comment on function public.gravar_lancamentos_em_transacao(jsonb) is
  'D-DSA-3 (decisao de Bernardo Villas Boas, 08/10/2026): aplica, numa transacao so, a lista de '
  'operacoes (inserir/atualizar) de um lancamento do DSA e dos que ele empurra — ou todas, ou nenhuma. '
  'SECURITY INVOKER: a RLS e os privilegios sao os de quem chama, e UPDATE sem linha (fora do alcance) '
  'e erro 42501. So as tres tabelas do DSA; so colunas existentes, nao geradas e nao de auditoria. '
  'Nao decide nada: a cascata e lib/dominio/dsa/empurrar.ts, os bloqueios sao da Server Action.';

revoke all on function public.gravar_lancamentos_em_transacao(jsonb) from public, anon;
grant execute on function public.gravar_lancamentos_em_transacao(jsonb) to authenticated, service_role;
