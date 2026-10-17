-- =================================================================================
-- Spec 014 · D-12 — as respostas de Bernardo Villas Boas às dúvidas 1 e 2 do fechamento (16/10/2026, noite)
-- Migration de DADO (aprovada no comando: "Corrija por migration de dado (aprovada aqui)"). Nenhuma tabela, coluna,
-- policy ou função nova.
--
-- O código `DSAP-C-AP-HN-2026-L1550-V` é FANTASMA de uma versão antiga da planilha: no banco, uma prova da XIII de 09/10,
-- carregada em 07/10, quando a linha 1550 era outra. Na planilha de hoje, a linha 1550 é a PM 2 da VII (09/10). A A3.3
-- protege a prova inteira (ela tem vista depois da virada), então a sincronização nunca a corrigiria. A PM 2 da XIII foi
-- aplicada em 16/10 (planilha, linha 1610; na tela, `DSA-MV723OPT-V`).
--
-- 1. a `VST-000243` (23/10, lançada na tela na prova fantasma) vai para a PM 2 da XIII de 16/10 (`DSA-MV723OPT-V`);
-- 2. a `L1550-V` passa a ser o que a planilha diz: PM 2 da VII, 09/10, 1º e 2º tempos, 2 TA, «U.E. 4 a 6», ligada ao item
--    PM 2 da VII, instrutor 39 (aplicador e fiscal), o conteúdo da planilha;
-- 3. a `VST-000160` (16/10, 4º tempo) sai da PM 1 da VII (`L1111-V`) e vai para essa PM 2 — a planilha, linha 1613, a
--    põe ali: vista da U.E. 4 a 6;
-- 4. consequência do 3: a vista de 27/08 da PM 1 (`DSAP-C-AP-HN-2026-L1182-S`, a da D1) fica sozinha e passa a sessão 1.
--
-- ⚠️ A prova continua protegida pela A3.3 na sincronização (vista depois da virada); a marca «[CORRIGIDO NO SISTEMA …]»
--    vai em `observacoes`, e o estado de antes de cada linha, no `valor_antes` dos eventos em `migracao_log`.
-- ⚠️ Disciplina, item e instrutor são BUSCADOS (curso da prova + código), nunca fixos (regra 9.1).
-- Abstém-se onde as linhas não existem (base limpa) ou já estão corrigidas; evento em `migracao_log` só quando grava.
-- Reversão: `specs/014-atividades-e-avaliacoes/reversao-d12.sql`.
-- =================================================================================

do $$
declare
  v_fantasma public.avaliacoes%rowtype;
  v_xiii16 uuid;
  v_pm1 uuid;
  v_vii uuid;
  v_item uuid;
  v_instrutor uuid;
  v_numero smallint;
  v_marca constant text := ' [CORRIGIDO NO SISTEMA — DECISÃO DE BERNARDO VILLAS BOAS, 16/10/2026 (dúvidas 1 e 2): PM 2 da VII, como a planilha; a prova da XIII desta linha era de uma versão antiga]';
  v_antes text;
begin
  select * into v_fantasma from public.avaliacoes where codigo = 'DSAP-C-AP-HN-2026-L1550-V';
  select id into v_xiii16 from public.avaliacoes where codigo = 'DSA-MV723OPT-V';
  select id into v_pm1 from public.avaliacoes where codigo = 'DSAP-C-AP-HN-2026-L1111-V';
  if v_fantasma.id is null or v_xiii16 is null or v_pm1 is null then
    raise notice 'D-12 (spec 014): as provas da C-Ap-HN não existem nesta base — abstém-se.';
    return;
  end if;
  select d.id into strict v_vii from public.disciplinas d
   where d.curso_id = v_fantasma.curso_id and d.cod_disciplina = 'VII' and d.status = 'ativo';
  if v_fantasma.disciplina_id = v_vii then
    raise notice 'D-12 (spec 014): a L1550-V já é da VII — nada a fazer.';
    return;
  end if;
  select ac.id into strict v_item
    from public.avaliacoes_curriculo ac join public.config_listas l on l.id = ac.instrumento_id
   where ac.disciplina_id = v_vii and ac.status = 'ativo' and l.lista = 'instrumentos_avaliacao' and l.valor = 'PM' and ac.numero = 2;
  select i.id into strict v_instrutor from public.instrutores i where i.codigo::text = '39';

  -- 1. a vista de 23/10 vai para a PM 2 da XIII de 16/10
  select coalesce(max(numero), 0) + 1 into v_numero from public.vistas_de_avaliacao where avaliacao_id = v_xiii16 and status = 'ativo';
  update public.vistas_de_avaliacao set avaliacao_id = v_xiii16, numero = v_numero
   where codigo = 'VST-000243' and avaliacao_id = v_fantasma.id;

  -- 2. a L1550-V vira a PM 2 da VII
  v_antes := format('XIII, %s, TA %s×%s, UE %s, item %s, conteúdo «%s»; editada por %s em %s',
                    v_fantasma.data_avaliacao, v_fantasma.ta_inicial, v_fantasma.tempos_consumidos,
                    coalesce(v_fantasma.ues_abordadas, '—'), coalesce(v_fantasma.avaliacao_curriculo_id::text, '—'),
                    coalesce(v_fantasma.conteudo_resumo, '—'), coalesce(v_fantasma.editado_por::text, '—'),
                    coalesce(v_fantasma.editado_em::text, '—'));
  update public.avaliacoes
     set disciplina_id = v_vii, data_avaliacao = date '2026-10-09', ta_inicial = 1, tempos_consumidos = 2,
         tipo_avaliacao = 'Prova Escrita', metodologia = 'Prova Mista', local = 'Sala 01',
         instrutor_responsavel_id = v_instrutor, fiscal_id = v_instrutor, nome_fiscal_externo = null,
         ues_abordadas = 'U.E. 4 a 6', avaliacao_curriculo_id = v_item, instrumento_id = null,
         conteudo_resumo = 'PM2 – NAVEGAÇÃO ASTRONÔMICA AV. DA APRENDIZAGEM (U.E. 4 a 6)',
         observacoes = coalesce(observacoes, '') || v_marca
   where id = v_fantasma.id;

  -- 3. a vista de 16/10 sai da PM 1 e vai para a PM 2
  select coalesce(max(numero), 0) + 1 into v_numero from public.vistas_de_avaliacao where avaliacao_id = v_fantasma.id and status = 'ativo';
  update public.vistas_de_avaliacao set avaliacao_id = v_fantasma.id, numero = v_numero
   where codigo = 'VST-000160' and avaliacao_id = v_pm1;

  -- 4. a vista de 27/08 fica sozinha na PM 1: sessão 1
  update public.vistas_de_avaliacao set numero = 1
   where codigo = 'DSAP-C-AP-HN-2026-L1182-S' and avaliacao_id = v_pm1 and status = 'ativo'
     and not exists (select 1 from public.vistas_de_avaliacao x
                      where x.avaliacao_id = v_pm1 and x.status = 'ativo' and x.numero = 1);

  insert into public.migracao_log (codigo, origem_tabela, origem_chave, destino_tabela, destino_chave,
                                   acao, regra_aplicada, valor_antes, valor_depois, observacao)
  values ('MLOG-014-D12-' || to_char(now(), 'YYYYMMDDHH24MISS'), 'planilha de controle C-Ap-HN 2026',
          'PREENCHIMENTO linhas 1550–1551 e 1613; linha 1610 (XIII)', 'avaliacoes, vistas_de_avaliacao',
          'DSAP-C-AP-HN-2026-L1550-V, VST-000160, VST-000243, DSAP-C-AP-HN-2026-L1182-S', 'corrigido'::public.acao_migracao,
          'dúvidas 1 e 2 (spec 014, fechamento de 16/10/2026)',
          v_antes || '; VST-000243 na L1550-V; VST-000160 na L1111-V (sessão 1); L1182-S sessão 2',
          'PM 2 da VII, 09/10, TA 1×2, U.E. 4 a 6, item PM 2; VST-000243 na DSA-MV723OPT-V; VST-000160 na L1550-V; L1182-S sessão 1',
          'Decisão de Bernardo Villas Boas, 16/10/2026: a L1550-V era fantasma de uma versão antiga da planilha.');
  raise notice 'D-12 (spec 014): a L1550-V é a PM 2 da VII; as vistas de 16/10 e 23/10 foram para as provas delas.';
end;
$$;
