-- =================================================================================
-- Spec 014 · D-11 — correções da lista de erros DECIDIDAS por Bernardo Villas Boas em 16/10/2026 (noite)
-- Migration de DADO (aprovada no comando de 16/10/2026: "Migration de DADO para os itens 5 e 7 a 12: aprovada aqui").
-- Nenhuma tabela, coluna, policy ou função nova.
--
-- 1. PEND-014-11 (item 5): as sugestões da planilha SEM VALOR — `sugestao_planilha` ativa, não confirmada, com
--    `ta_aplicacao` e `ta_vista` nulos — saem por exclusão lógica (`status = 'inativo'`, regra 4). A sincronização
--    deixou de criá-las (`scripts/carga_dsa/resolver.py`, `_sugestoes`). Medido na cópia do remoto
--    `remoto-20261016-141227.sql` restaurada no local, em 16/10/2026: 13 linhas, em 6 turmas.
-- 2. D1 (item 11): `DSAP-C-AP-HN-2026-L1111-V` (C-Ap-HN VII, PM de 20/08) → item PM 1 da disciplina, «U.E. 1 a 3», e
--    a sessão de vista de 27/08, 6º tempo, 1 TA, Sala 01 (PREENCHIMENTO linha 1182), conduzida pelo instrutor de
--    código 39 — o que a planilha diz e a edição na tela de 13/10 apagou. A sessão de vista de 16/10 (`VST-000160`),
--    lançada na tela, FICA como está: a nova entra como sessão seguinte.
-- 3. D2 (item 12): `DSAP-C-AP-HN-2026-L1249-V` (C-Ap-HN XVII, PP de 03/09) → item PP 3 da disciplina. A sessão de
--    vista de 10/10 (`VST-000028`) NÃO é tocada, por decisão.
--
-- ⚠️ As duas avaliações foram editadas na tela, e a tela vence a planilha (A3.4): a sincronização não as toca. A
--    edição AQUI roda sem sessão, então `app.set_auditoria()` grava `editado_por` nulo — e a marca
--    «[CORRIGIDO NO SISTEMA …]» em `observacoes` é o que a sincronização lê para continuar tratando a linha como
--    editada no sistema (`scripts/carga_dsa/banco.py`, `na_tela`). Sem ela, a rodada seguinte desfaria a correção.
--    E QUEM editou na tela (e quando) vai no `valor_antes` do evento em `migracao_log`: o gatilho apaga o carimbo
--    da linha, e o histórico não pode sumir com ele.
-- ⚠️ Os itens do currículo são BUSCADOS (disciplina da avaliação + instrumento + número), nunca fixos (regra 9.1).
-- Abstém-se onde a linha não existe (base recém-resetada); idempotente; evento em `migracao_log` só quando grava.
-- Reversão: `specs/014-atividades-e-avaliacoes/reversao-d11.sql`.
-- =================================================================================

do $$
declare
  v_n integer;
  v_aval public.avaliacoes%rowtype;
  v_item uuid;
  v_conduz uuid;
  v_numero smallint;
  v_marca constant text := ' [CORRIGIDO NO SISTEMA — DECISÃO DE BERNARDO VILLAS BOAS, 16/10/2026 (%s)]';
begin
  -- 1. PEND-014-11 — as sugestões sem valor
  update public.avaliacoes_curriculo_turma
     set status = 'inativo'
   where origem = 'sugestao_planilha' and status = 'ativo' and confirmado_em is null
     and ta_aplicacao is null and ta_vista is null;
  get diagnostics v_n := row_count;
  if v_n > 0 then
    insert into public.migracao_log (codigo, origem_tabela, origem_chave, destino_tabela, destino_chave,
                                     acao, regra_aplicada, valor_antes, valor_depois, observacao)
    values ('MLOG-014-D11-SUG-' || to_char(now(), 'YYYYMMDDHH24MISS'), 'avaliacoes_curriculo_turma', 'sugestao_planilha sem valor',
            'avaliacoes_curriculo_turma', 'por linha', 'descartado'::public.acao_migracao, 'PEND-014-11 (spec 014)',
            v_n || ' ativas', 'inativo',
            'Sugestões da planilha sem valor (os dois tempos nulos) saem por exclusão lógica — decisão de Bernardo Villas Boas, 16/10/2026.');
  end if;
  raise notice 'D-11 (1): % sugestão(ões) sem valor inativada(s).', v_n;

  -- 2. D1
  select * into v_aval from public.avaliacoes where codigo = 'DSAP-C-AP-HN-2026-L1111-V';
  if not found then
    raise notice 'D-11 (2): DSAP-C-AP-HN-2026-L1111-V não existe nesta base — abstém-se.';
  elsif v_aval.avaliacao_curriculo_id is not null then
    raise notice 'D-11 (2): DSAP-C-AP-HN-2026-L1111-V já está ligada a item — nada a fazer.';
  else
    select ac.id into strict v_item
      from public.avaliacoes_curriculo ac join public.config_listas l on l.id = ac.instrumento_id
     where ac.disciplina_id = v_aval.disciplina_id and ac.status = 'ativo'
       and l.lista = 'instrumentos_avaliacao' and l.valor = 'PM' and ac.numero = 1;
    select i.id into strict v_conduz from public.instrutores i where i.codigo::text = '39';
    update public.avaliacoes
       set avaliacao_curriculo_id = v_item, instrumento_id = null, ues_abordadas = 'U.E. 1 a 3',
           observacoes = coalesce(observacoes, '') || format(v_marca, 'D1: item PM 1, U.E. 1 a 3 e a vista de 27/08')
     where id = v_aval.id;
    select coalesce(max(numero), 0) + 1 into v_numero
      from public.vistas_de_avaliacao where avaliacao_id = v_aval.id and status = 'ativo';
    insert into public.vistas_de_avaliacao (codigo, avaliacao_id, numero, data, ta_inicial, tempos_consumidos, local,
                                            conduz_instrutor_id)
    values ('DSAP-C-AP-HN-2026-L1182-S', v_aval.id, v_numero, date '2026-08-27', 6, 1, 'Sala 01', v_conduz)
    on conflict (codigo) do nothing;
    insert into public.migracao_log (codigo, origem_tabela, origem_chave, destino_tabela, destino_chave,
                                     acao, regra_aplicada, valor_antes, valor_depois, observacao)
    values ('MLOG-014-D11-D1-' || to_char(now(), 'YYYYMMDDHH24MISS'), 'planilha de controle C-Ap-HN 2026',
            'PREENCHIMENTO linhas 1111 e 1182', 'avaliacoes', 'DSAP-C-AP-HN-2026-L1111-V', 'corrigido'::public.acao_migracao,
            'D1 (spec 014, lista de erros de 16/10/2026)',
            'sem item, sem U.E., vista só a de 16/10; editada na tela por ' || coalesce(v_aval.editado_por::text, '—')
              || ' em ' || coalesce(v_aval.editado_em::text, '—'),
            'PM 1, U.E. 1 a 3, + vista DSAP-C-AP-HN-2026-L1182-S (27/08, 6º tempo, 1 TA)',
            'Decisão de Bernardo Villas Boas, 16/10/2026. A vista de 16/10 lançada na tela (VST-000160) ficou como estava.');
    raise notice 'D-11 (2): D1 corrigida; vista de 27/08 como sessão %.', v_numero;
  end if;

  -- 3. D2
  select * into v_aval from public.avaliacoes where codigo = 'DSAP-C-AP-HN-2026-L1249-V';
  if not found then
    raise notice 'D-11 (3): DSAP-C-AP-HN-2026-L1249-V não existe nesta base — abstém-se.';
  elsif v_aval.avaliacao_curriculo_id is not null then
    raise notice 'D-11 (3): DSAP-C-AP-HN-2026-L1249-V já está ligada a item — nada a fazer.';
  else
    select ac.id into strict v_item
      from public.avaliacoes_curriculo ac join public.config_listas l on l.id = ac.instrumento_id
     where ac.disciplina_id = v_aval.disciplina_id and ac.status = 'ativo'
       and l.lista = 'instrumentos_avaliacao' and l.valor = 'PP' and ac.numero = 3;
    update public.avaliacoes
       set avaliacao_curriculo_id = v_item, instrumento_id = null,
           observacoes = coalesce(observacoes, '') || format(v_marca, 'D2: item PP 3; a vista de 10/10 não foi tocada')
     where id = v_aval.id;
    insert into public.migracao_log (codigo, origem_tabela, origem_chave, destino_tabela, destino_chave,
                                     acao, regra_aplicada, valor_antes, valor_depois, observacao)
    values ('MLOG-014-D11-D2-' || to_char(now(), 'YYYYMMDDHH24MISS'), 'planilha de controle C-Ap-HN 2026',
            'PREENCHIMENTO linha 1249', 'avaliacoes', 'DSAP-C-AP-HN-2026-L1249-V', 'corrigido'::public.acao_migracao,
            'D2 (spec 014, lista de erros de 16/10/2026)',
            'sem item; editada na tela por ' || coalesce(v_aval.editado_por::text, '—') || ' em ' || coalesce(v_aval.editado_em::text, '—'),
            'PP 3',
            'Decisão de Bernardo Villas Boas, 16/10/2026. A sessão de vista de 10/10 (VST-000028) não foi tocada.');
    raise notice 'D-11 (3): D2 corrigida.';
  end if;
end;
$$;
