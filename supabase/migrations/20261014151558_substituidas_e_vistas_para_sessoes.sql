-- =================================================================================
-- Spec 014, PR 4 · migration de DADO D-7 — as substituídas, as vistas em sessão e o 2º instrutor
-- Data local: 14/10/2026 (o carimbo do nome é UTC; não renomear).
--
-- Três blocos, cada um com contagem própria e resposta própria de Bernardo no antes/depois
-- (antes-depois/substituidas_e_vistas_para_sessoes.md; FR-041, FR-046, FR-047, FR-049, Q-9, Q-10):
--
--   D-7  · as avaliações do ETL com a marca «[SUBSTITUIDO PELA PLANILHA DE CONTROLE] (status anterior: X)»
--          passam a `substituida_pela_planilha`, com `status_anterior = X`. A cancelada SEM a marca (a
--          `DSAP-C-EXP-OBS-ME-2026-L206-V`, cancelada pela tela) NÃO é tocada (FR-049).
--   D-7b · toda avaliação com vista na coluna única ganha a SESSÃO 1 em `vistas_de_avaliacao`, com os quatro
--          campos copiados e quem conduz nulo (a origem não dizia). ⚠️ Anda JUNTO da E-5: sem ele, as vistas
--          que já existem sairiam da CHD assim que a E-5 lê só as sessões.
--   D-8  · o 2º instrutor das aulas sai de `observacoes` («… Demais instrutores: <texto>.») para
--          `outros_instrutores`, pelo CÓDIGO do instrutor, casado no cadastro pelo nome de guerra (o texto é
--          «<posto> <nome de guerra>»). O texto antigo vai para `migracao_log`, para a volta. ⚠️ O texto que
--          não casa com UM instrutor fica onde está, e a migration o conta — nada é inventado.
--
-- ⚠️ NENHUM NOME DE PESSOA NESTE ARQUIVO (repositório público): o casamento do D-8 é feito no banco, em tempo de
--    execução, contra o cadastro.
-- ⚠️ Idempotente: rodar de novo não muda nada (D-7 só pega quem ainda está `cancelada` com a marca; D-7b só cria
--    sessão onde não há sessão 1 ativa; D-8 só pega aula que ainda tem o texto). Abstém-se em base sem dado.
--
-- Reversão (reversao-pr4.sql): D-7, `status_anterior` → `status` (cancelada) e `status_anterior` nulo; D-7b,
-- as sessões criadas por esta migration ficam `inativo`; D-8, `observacoes` restaurada do `migracao_log`.
-- =================================================================================

do $$
declare
  v_marca     constant text := '[SUBSTITUIDO PELA PLANILHA DE CONTROLE]';
  v_d7        integer := 0;
  v_d7_antes  integer;
  v_canc_sem  integer;
  v_canc_depois integer;
  v_d7b       integer := 0;
  v_d7b_alvo  integer;
  v_d8        integer := 0;
  v_d8_alvo   integer;
  v_d8_fica   integer;
  v_carimbo   text := to_char(now(), 'YYYYMMDDHH24MISS');
begin
  -- ------------------------------------------------------------ D-7
  select count(*) into v_d7_antes from public.avaliacoes
   where status = 'cancelada' and observacoes like '%' || v_marca || '%';
  select count(*) into v_canc_sem from public.avaliacoes
   where status = 'cancelada' and coalesce(observacoes, '') not like '%' || v_marca || '%';

  update public.avaliacoes
     set status_anterior = substring(observacoes from '\(status anterior: ([a-z_]+)\)')::public.status_avaliacao,
         status = 'substituida_pela_planilha'
   where status = 'cancelada' and observacoes like '%' || v_marca || '%'
     and substring(observacoes from '\(status anterior: ([a-z_]+)\)') is not null;
  get diagnostics v_d7 = row_count;

  if v_d7 <> v_d7_antes then
    raise exception 'D-7: % avaliações com a marca, mas % com o status anterior legível — confira a marca antes.', v_d7_antes, v_d7;
  end if;
  select count(*) into v_canc_depois from public.avaliacoes
   where status = 'cancelada' and coalesce(observacoes, '') not like '%' || v_marca || '%';
  if v_canc_depois <> v_canc_sem then
    raise exception 'D-7: a cancelada SEM marca mudou (% → %) — ela não pode ser tocada (FR-049).', v_canc_sem, v_canc_depois;
  end if;

  -- ------------------------------------------------------------ D-7b
  select count(*) into v_d7b_alvo from public.avaliacoes a
   where a.data_vista_prova is not null
     and not exists (select 1 from public.vistas_de_avaliacao s where s.avaliacao_id = a.id and s.numero = 1 and s.status = 'ativo');

  insert into public.vistas_de_avaliacao (avaliacao_id, numero, data, ta_inicial, tempos_consumidos, local,
                                          origem_migracao_v1, criado_por)
  select a.id, 1, a.data_vista_prova, a.ta_inicial_vista, a.tempos_consumidos_vista, a.local_vista,
         'spec014-D7b', a.criado_por
    from public.avaliacoes a
   where a.data_vista_prova is not null
     and not exists (select 1 from public.vistas_de_avaliacao s where s.avaliacao_id = a.id and s.numero = 1 and s.status = 'ativo');
  get diagnostics v_d7b = row_count;

  if v_d7b <> v_d7b_alvo then
    raise exception 'D-7b: % avaliações com vista sem sessão, % sessões criadas.', v_d7b_alvo, v_d7b;
  end if;
  if (select count(*) from public.avaliacoes where data_vista_prova is not null)
     <> (select count(distinct avaliacao_id) from public.vistas_de_avaliacao where numero = 1 and status = 'ativo') then
    raise exception 'D-7b: o número de avaliações com vista não é o número de sessões 1 ativas.';
  end if;

  -- ------------------------------------------------------------ D-8
  create temporary table d8 on commit drop as
  with t as (
    select r.id, r.codigo, r.observacoes,
           btrim(trim(trailing '.' from split_part(r.observacoes, ' Demais instrutores: ', 2))) as texto
      from public.registros_aula r
     where r.observacoes like '% Demais instrutores: %'
  ), pecas as (
    select t.id, btrim(p) as peca, ord
      from t, regexp_split_to_table(t.texto, '\s*/\s*') with ordinality as x(p, ord)
  ), casadas as (
    select pc.id, pc.ord,
           (select array_agg(i.codigo::text) from public.instrutores i
             where i.status = 'ativo' and i.nome_guerra is not null
               and app.normalizar_texto(pc.peca) like '%' || app.normalizar_texto(i.nome_guerra)) as achados
      from pecas pc
  )
  select t.id, t.codigo, t.observacoes, t.texto,
         bool_and(coalesce(array_length(c.achados, 1), 0) = 1) as casou,
         array_agg(c.achados[1] order by c.ord) as codigos
    from t join casadas c on c.id = t.id
   group by t.id, t.codigo, t.observacoes, t.texto;

  select count(*) into v_d8_alvo from d8;
  select count(*) into v_d8_fica from d8 where not casou;

  insert into public.migracao_log (codigo, origem_tabela, origem_chave, destino_tabela, destino_chave,
                                   acao, regra_aplicada, valor_antes, valor_depois, observacao)
  select 'MLOG-014-D8-' || v_carimbo || '-' || d8.codigo, 'registros_aula', d8.codigo, 'registros_aula', d8.codigo,
         'transformado'::public.acao_migracao, 'FR-046 / Q-10 (spec 014, D-8)', d8.observacoes,
         array_to_string(d8.codigos, ','), 'O 2º instrutor saiu de observacoes para outros_instrutores (por código).'
    from d8 where d8.casou;

  update public.registros_aula r
     set outros_instrutores = d8.codigos,
         observacoes = nullif(btrim(split_part(r.observacoes, ' Demais instrutores: ', 1)), '')
    from d8
   where d8.id = r.id and d8.casou;
  get diagnostics v_d8 = row_count;

  -- ------------------------------------------------------------ o registro
  if v_d7 + v_d7b + v_d8 = 0 then
    raise notice 'D-7 (spec 014): nada a fazer — base sem marca, sem vista e sem 2º instrutor em observacoes (abstenção).';
    return;
  end if;

  insert into public.migracao_log (codigo, origem_tabela, origem_chave, destino_tabela, destino_chave,
                                   acao, regra_aplicada, valor_antes, valor_depois, observacao)
  values ('MLOG-014-D7-' || v_carimbo, 'avaliacoes', 'marca da planilha de controle', 'avaliacoes', 'status',
          'transformado'::public.acao_migracao, 'FR-041/FR-047/FR-049 (spec 014, D-7 e D-7b)',
          v_d7_antes || ' canceladas com a marca; ' || v_d7b_alvo || ' vistas sem sessão',
          v_d7 || ' substituídas; ' || v_d7b || ' sessões 1; ' || v_d8 || ' aulas com 2º instrutor em vetor ('
            || v_d8_fica || ' textos sem casamento ficaram em observacoes)',
          'A cancelada sem a marca não foi tocada (' || v_canc_sem || ').');

  raise notice 'D-7 (spec 014): % substituída(s); % sessão(ões) 1; % aula(s) com o 2º instrutor movido; % texto(s) sem casamento ficaram.',
    v_d7, v_d7b, v_d8, v_d8_fica;
end;
$$;
