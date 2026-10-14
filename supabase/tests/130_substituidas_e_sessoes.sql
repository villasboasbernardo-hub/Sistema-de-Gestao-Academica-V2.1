-- =================================================================================
-- 130 — Spec 014, PR 4: as substituídas, as sessões migradas e o 2º instrutor (migration D-7), por
--       INVARIANTES. Na base sem linha marcada, conferem que a D-7 não tocou nada.
--
-- RN-AVAL-02 (Risco Alto): a substituída sai de toda conta e não é outro fato.
-- ⚠️ pgTAP de dado nunca pula.
-- =================================================================================
begin;
select plan(6);

select is(
  (select count(*)::int from public.avaliacoes
    where observacoes like '%[SUBSTITUIDO PELA PLANILHA DE CONTROLE]%' and status <> 'substituida_pela_planilha'),
  0, 'D-7 · toda avaliação com a marca está substituída');
select is(
  (select count(*)::int from public.avaliacoes
    where status = 'substituida_pela_planilha'
      and status_anterior::text is distinct from substring(observacoes from '\(status anterior: ([a-z_]+)\)')),
  0, 'D-7 · o status anterior é o do parêntese da marca');
select is(
  (select count(*)::int from public.avaliacoes where status = 'cancelada' and observacoes like '%[SUBSTITUIDO PELA PLANILHA DE CONTROLE]%'),
  0, 'FR-049 · nenhuma linha com a marca fica cancelada');
select is(
  (select count(*)::int from public.avaliacoes a where a.data_vista_prova is not null
     and not exists (select 1 from public.vistas_de_avaliacao s where s.avaliacao_id = a.id and s.numero = 1 and s.status = 'ativo')),
  0, 'D-7b · toda avaliação com vista tem a sessão 1');
select is(
  (select count(*)::int from public.registros_aula r
    where r.observacoes like '% Demais instrutores: %' and cardinality(r.outros_instrutores) > 0),
  0, 'D-8 · aula com o vetor não guarda mais o texto em observacoes');
select is(
  (select count(*)::int from public.vw_ocupacao_ta o join public.avaliacoes a on a.id = o.fato_id
    where a.status = 'substituida_pela_planilha'),
  0, 'RN-AVAL-02 · a substituída não ocupa TA nem aparece no DSA');

select * from finish();
rollback;
