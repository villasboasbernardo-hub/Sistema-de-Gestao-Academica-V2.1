-- Reversão da migration 20261014223818_trilha_do_arbitrado (PR 5, condição da D5.3).
-- ⚠️ SÓ EM BASE DESCARTÁVEL. No remoto, a reversão é só tirar os dois gatilhos de registro; a tabela FICA
--    (regra 4 — a trilha gravada é histórico).
begin;
drop trigger trg_avaliacoes_curriculo_trilha on public.avaliacoes_curriculo;
drop trigger trg_avaliacoes_curriculo_turma_trilha on public.avaliacoes_curriculo_turma;
drop function app.registrar_arbitragem();
drop trigger trg_avaliacoes_curriculo_arbitragens_imutavel on public.avaliacoes_curriculo_arbitragens;
drop trigger trg_avaliacoes_curriculo_arbitragens_sem_truncate on public.avaliacoes_curriculo_arbitragens;
drop function app.avaliacoes_curriculo_arbitragens_imutavel();
drop table public.avaliacoes_curriculo_arbitragens;
commit;
