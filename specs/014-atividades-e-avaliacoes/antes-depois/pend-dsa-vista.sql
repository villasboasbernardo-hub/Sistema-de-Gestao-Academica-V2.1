-- =================================================================================
-- PEND-DSA-VISTA — a correção da D-SYNC-2 (spec 014, decisão de Bernardo Villas Boas, 14/10/2026)
--
-- ⛔ PARA APROVAÇÃO. NÃO APLICAR NO REMOTO sem a palavra de Bernardo (A6.1 em `aprovacoes-pendentes.md`).
--    Ensaiado só no banco LOCAL, sobre a cópia do remoto (relatório: `pend-dsa-vista.md`).
--
-- O que faz, numa transação:
--   1. REATIVA a prova original `DSAP-C-EXP-OBS-ME-2026-L206-V` (cancelada na tela em 07/10/2026) — volta a
--      `pendente`, o estado em que a carga a pôs; a situação (concluída, por ter sessão de vista) é calculada na
--      leitura. A sessão de vista 1 dela (09/10/2026, 6º tempo, 1 TA) JÁ EXISTE, ativa, desde a D-7b: com a mãe
--      viva, ela volta a contar na CHD.
--   2. CANCELA a relançada `DSA-MUYK0RFD-V` (o mesmo fato, lançado de novo na tela nove minutos depois, sem a
--      vista) — `cancelada`, como a tela cancela (regra 4: nada é apagado).
--   3. Confere: exatamente UMA avaliação viva da PM no dia 07/10/2026 na turma, e ela tem a sessão de vista.
--
-- ⚠️ A RELANÇADA traz um fiscal de fora do cadastro que a original não tem. A rodada do PR 6 regrava a original
--    pela planilha (fiscal incluído, pelo que a planilha diz); o nome NÃO é copiado aqui por script.
-- Reversão: o inverso — a original de volta a `cancelada`, a relançada de volta a `pendente`.
-- =================================================================================
begin;

update public.avaliacoes
   set status = 'pendente',
       observacoes = concat_ws(' ', '[REATIVADA — PEND-DSA-VISTA, D-SYNC-2]', observacoes)
 where codigo = 'DSAP-C-EXP-OBS-ME-2026-L206-V' and status = 'cancelada';

update public.avaliacoes
   set status = 'cancelada',
       observacoes = concat_ws(' ', '[CANCELADA — relançamento da DSAP-C-EXP-OBS-ME-2026-L206-V; PEND-DSA-VISTA, D-SYNC-2]', observacoes)
 where codigo = 'DSA-MUYK0RFD-V' and status in ('pendente', 'em_andamento', 'concluida', 'atrasada');

do $$
declare
  vivas integer;
  com_vista integer;
begin
  select count(*), count(*) filter (where exists (
           select 1 from public.vistas_de_avaliacao s where s.avaliacao_id = a.id and s.status = 'ativo'))
    into vivas, com_vista
    from public.avaliacoes a join public.turmas t on t.id = a.turma_id
   where t.codigo = 'C-Exp-Obs-ME 2026' and a.data_avaliacao = '2026-10-07'
     and a.status in ('pendente', 'em_andamento', 'concluida', 'atrasada');
  if vivas <> 1 or com_vista <> 1 then
    raise exception 'PEND-DSA-VISTA: esperado 1 avaliação viva com vista em 07/10/2026; achei % viva(s), % com vista.', vivas, com_vista;
  end if;
  raise notice 'PEND-DSA-VISTA: 1 avaliação viva em 07/10/2026, com a sessão de vista.';
end $$;

commit;
