-- ════════════════════════════════════════════════════════════════════════════════════════════
-- SÓ O LANÇAMENTO **ATIVO** TRAVA A VIGÊNCIA DE REGIME — emenda à RN-2027-09 / FR-021.2
-- ════════════════════════════════════════════════════════════════════════════════════════════
--
-- O QUÊ  : `app.lancamentos_que_travam_vigencia` passa a ignorar o lançamento excluído logicamente —
--          aula e atividade com `status = 'inativo'`, avaliação com `status = 'cancelada'`.
--          Mesma assinatura, mesmo retorno, mesma ACL. Nenhuma tabela nova, nenhuma coluna.
--
-- PARA QUÊ: *(decisão de Bernardo Villas Boas, 06/10/2026, item 3a do lote da onda 1 da VIRADA-1)*
--          "o piso da vigência conta só lançamentos ATIVOS — exclusão lógica vale em todo lugar,
--          como no feriado inativado". O relógio gravado para `C-Esp-ME` e para os cinco cursos
--          regulares nunca foi o real (08:00 e 13:00 no banco; 08:10 e 13:05 na aba HORÁRIOS da
--          planilha de controle, com intervalo de 5 min na tarde), e a correção pelo caminho
--          permitido — cancelar a vigência e registrar a certa — era recusada com
--          `vigencia_com_lancamento` por causa dos lançamentos do ETL **já inativados** pela carga
--          das planilhas.
--
-- ⚠️ MEDIDO ANTES DA EMENDA, no banco LOCAL (cópia do remoto de 06/10/2026, `C-Esp-ME 2026` com os
--    172 aulas, 25 avaliações e 77 atividades do ETL inativados pela carga da planilha):
--      `select public.corrigir_vigencia_regime(…)` → ERROR "Esta vigencia ja tem 286 lancamento(s)
--      que dependem dela", HINT `vigencia_com_lancamento`. Dos 286, **zero** estavam ativos.
--
-- ⚠️ O QUE A EMENDA **NÃO** AFROUXA — e o pgTAP `118` tem o caso de cada um:
--    1. lançamento ATIVO continua travando, nas três tabelas e pela vista de prova (caso negativo);
--    2. a atividade GLOBAL ativa continua alcançando o curso pela janela da turma (FR-021.5);
--    3. reativar o lançamento inativo volta a travar — o critério é o estado de agora, nunca o
--       histórico, e é por isso que a emenda não reinterpreta o passado: o DSA já impresso de uma
--       linha inativa não existe mais como fato ativo do curso.
--
-- ⚠️ A FRASE DA RN-2027-09 NÃO MUDA: *"a mudança nunca altera a interpretação de registros já
--    lançados sob a configuração anterior"*. O que muda é o que conta como "registro lançado":
--    linha excluída logicamente não é registro do curso, pela mesma regra que a tira do DSA, da
--    CH e dos painéis (`vw_ocupacao_ta`, `vw_carga_horaria_turma`, `vw_disciplinas_execucao` já
--    filtravam `ativo` / `<> cancelada`). A função era a única leitura de lançamento que não filtrava.
--
-- REVERSÃO: reaplicar o `create or replace function` da migration `20260918025141` (PARTE B), que
--    é o corpo anterior sem as três condições de status. Nenhuma linha de dado é tocada aqui.
-- ════════════════════════════════════════════════════════════════════════════════════════════

create or replace function app.lancamentos_que_travam_vigencia(p_vigencia_id uuid, p_desde date)
returns table (tipo text, data date, turma text, atividade text, total bigint, ponta_ausente text)
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  with v as (
    select curso_id from public.curso_regime_historico where id = p_vigencia_id
  ),
  achados (a_tipo, a_data, a_turma, a_atividade, a_ponta) as (
    -- ⚠️ A LISTA E A GARANTIA, E ELA ENVELHECE (FR-021.2). Toda tabela nova que passe a depender do
    --    regime entra AQUI, na mesma migration que a cria — senao o cancelamento continua sendo
    --    aprovado e isto vira falsa garantia, sem erro nenhum.
    -- ⚠️ SO O LANCAMENTO ATIVO TRAVA (emenda de 06/10/2026): a linha excluida logicamente nao e
    --    registro do curso — e a mesma regra que a tira do DSA e da CH.
    select 'aula'::text, r.data, t.codigo, null::text, null::text
      from public.registros_aula r
      join v on v.curso_id = r.curso_id
      left join public.turmas t on t.id = r.turma_id
     where r.data >= p_desde
       and r.status = 'ativo'
    union all
    select 'avaliacao', a.data_avaliacao, t.codigo, null, null
      from public.avaliacoes a
      join v on v.curso_id = a.curso_id
      left join public.turmas t on t.id = a.turma_id
     where a.data_avaliacao >= p_desde
       and a.status <> 'cancelada'
    union all
    -- A vista de prova e lancamento com horario proprio: ignora-la deixaria uma ponta do mesmo
    -- registro fora da protecao.
    select 'vista_de_prova', a.data_vista_prova, t.codigo, null, null
      from public.avaliacoes a
      join v on v.curso_id = a.curso_id
      left join public.turmas t on t.id = a.turma_id
     where a.data_vista_prova >= p_desde
       and a.status <> 'cancelada'
    union all
    select 'atividade', n.data, t.codigo, n.descricao, null
      from public.atividades_nao_letivas n
      join public.turmas t on t.id = n.turma_id
      join v on v.curso_id = t.curso_id
     where n.data >= p_desde
       and n.status = 'ativo'
    union all
    -- ⚠️ ESCOPO GLOBAL, pelos TRES casos do FR-021.5 — pela JANELA, nunca pelo status da turma, que
    --    e mutavel e destravaria a vigencia ao virar `concluida`.
    select 'atividade_global', n.data, t.codigo, n.descricao, t.ponta
      from public.atividades_nao_letivas n
      cross join lateral (
        select tu.codigo,
               case when tu.data_inicio is not null and tu.data_termino is null then 'termino'
                    when tu.data_inicio is null and tu.data_termino is not null then 'inicio' end as ponta
          from public.turmas tu
          join v on v.curso_id = tu.curso_id
         where (tu.data_inicio is not null and tu.data_termino is not null
                and n.data between tu.data_inicio and tu.data_termino)
            or (tu.data_inicio is not null and tu.data_termino is null and n.data >= tu.data_inicio)
            or (tu.data_inicio is null and tu.data_termino is not null and n.data <= tu.data_termino)
         order by tu.codigo
         limit 1
      ) t
     where n.turma_id is null and n.data >= p_desde
       and n.status = 'ativo'
  )
  -- ⚠️ As colunas da CTE levam prefixo `a_` porque os nomes de saida de `returns table` ficam em
  --    escopo aqui dentro, e `data` colidiria com `data`.
  select a.a_tipo, a.a_data, a.a_turma, a.a_atividade, count(*) over () as total, a.a_ponta
    from achados a
   order by a.a_data, a.a_tipo
   limit 1;
$$;

comment on function app.lancamentos_que_travam_vigencia(uuid, date) is
  'FR-021.2: o primeiro lancamento ATIVO do curso com data >= `p_desde`, nas TRES tabelas, e o total. '
  'Decidido pelo FATO, nao pela data da vigencia. Emenda de 06/10/2026 (decisao de Bernardo Villas '
  'Boas, VIRADA-1): aula e atividade `inativo` e avaliacao `cancelada` NAO travam — exclusao logica '
  'vale em todo lugar. Escopo global alcanca pela JANELA da turma (FR-021.5).';

-- A ACL nao muda com `create or replace`; repetida aqui para que a leitura da migration baste.
revoke all on function app.lancamentos_que_travam_vigencia(uuid, date) from public, anon;
grant execute on function app.lancamentos_que_travam_vigencia(uuid, date) to authenticated, service_role;
