-- =================================================================================
-- 134 — Spec 014, D-11 (`20261016225643`, 16/10/2026): as correções da lista de erros decididas por Bernardo Villas Boas.
--
-- PEND-014-11: a sugestão da planilha SEM VALOR (os dois tempos nulos) não existe ativa — a sincronização deixou de
--              criá-la e a D-11 tirou as 13 do remoto por exclusão lógica. A asserção vale na base limpa (trivial)
--              E na base carregada com a cópia do remoto, que é onde ela pega uma reincidência.
-- D-11 é migration de DADO: nenhuma policy de DELETE nasceu com ela (regra 4), e o que ela grava fica em migracao_log.
-- =================================================================================
begin;
select plan(2);

select is(
  (select count(*)::int from public.avaliacoes_curriculo_turma
    where origem = 'sugestao_planilha' and status = 'ativo' and confirmado_em is null
      and ta_aplicacao is null and ta_vista is null),
  0,
  'PEND-014-11 · nenhuma sugestão da planilha ativa sem valor (os dois tempos nulos)');

select is(
  (select count(*)::int from pg_policy where polcmd = 'd'),
  0,
  'D-11 · migration de dado: zero policy de DELETE no catálogo (regra 4)');

select * from finish();
rollback;
