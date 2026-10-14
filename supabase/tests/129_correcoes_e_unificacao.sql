-- =================================================================================
-- 129 — Spec 014, PR 4: as correções banco × currículo (D-5) e a unificação (D-6), por INVARIANTES do estado
--       final. Na base limpa as disciplinas não existem e cada asserção confere o valor que prova a abstenção.
--
-- RN-MAT-01 (Risco Alto): a CH da disciplina é a do currículo, e a soma das UEs fecha com ela.
-- ⚠️ pgTAP de dado nunca pula.
-- =================================================================================
begin;
select plan(12);

create temporary table _d as
select c.codigo as curso, d.cod_disciplina as cod, d.nome_disciplina as nome, d.carga_horaria_tempos as ch, d.status::text as status, d.id
  from public.disciplinas d join public.cursos c on c.id = d.curso_id;
create temporary table _carregada as select exists (select 1 from public.cursos where codigo = 'C-Espc-FR') as sim;

-- ── D-5 ──
select is((select ch from _d where curso = 'C-Ap-FR' and cod = 'III' and status = 'ativo'),
  case when (select sim from _carregada) then 75 end, 'D-5 B-1 · C-Ap-FR III = 75');
select is((select array_agg(ch order by cod) from _d where curso = 'C-Exp-MetocOf' and cod in ('I', 'V') and status = 'ativo'),
  case when (select sim from _carregada) then array[30, 50] end, 'D-5 B-2/B-3 · MetocOf I = 30 e V = 50');
select is((select ch from _d where curso = 'C-Espc-FR' and cod = 'TFMFR-004' and status = 'ativo'),
  case when (select sim from _carregada) then 48 end, 'D-5 B-6 · C-Espc-FR TFM = 48');
select is((select array_agg(cod order by cod) from _d where curso = 'C-Espc-FR' and cod in ('FAANFR-005', 'PSFFR-014', 'HN-1104-0506', 'SN-1103-0506') and status = 'ativo'),
  case when (select sim from _carregada) then array['FAANFR-005', 'PSFFR-014'] end, 'D-5 B-7 · os dois códigos do currículo no C-Espc-FR');
select is((select array_agg(ch order by cod) from _d where curso = 'C-Espc-HN' and cod in ('HN-1106-0423', 'HN-1107-1011') and status = 'ativo'),
  case when (select sim from _carregada) then array[108, 120] end, 'D-5 B-8 · NAV I e NAV II = 108 e 120');
select is((select status from _d where curso = 'C-Esp-ALH' and cod = 'ALH-III'),
  case when (select sim from _carregada) then 'ativo' end, 'D-5 B-5 · C-Esp-ALH III ativa, com o código do currículo');

-- ── D-6 ──
select is((select (cod, ch)::text from _d where curso = 'C-Ap-HN' and nome = 'MATEMÁTICA E FÍSICA APLICADAS À HIDROGRAFIA.' and status = 'ativo'),
  case when (select sim from _carregada) then ('I', 126)::text end, 'D-6 · C-Ap-HN HN-2101 unificada com 126');
select is((select (cod, ch)::text from _d where curso = 'CAHO' and cod = 'MATFIS' and status = 'ativo'),
  case when (select sim from _carregada) then ('MATFIS', 56)::text end, 'D-6 · CAHO MATFIS com 56');
select is((select count(*)::int from _d where (curso, cod) in (('C-Ap-HN', 'I-I'), ('CAHO', 'FIS')) and status = 'ativo'),
  0, 'D-6 · as duas extras não estão ativas (inativadas, nunca apagadas)');
select is(
  (select count(*)::int from public.registros_aula r join _d on _d.id = r.disciplina_id where _d.status = 'inativo' and _d.cod in ('I-I', 'FIS') and r.status = 'ativo')
  + (select count(*)::int from public.avaliacoes a join _d on _d.id = a.disciplina_id where _d.status = 'inativo' and _d.cod in ('I-I', 'FIS'))
  + (select count(*)::int from public.unidades_ensino u join _d on _d.id = u.disciplina_id where _d.status = 'inativo' and _d.cod in ('I-I', 'FIS')),
  0, 'D-6 · nenhum lançamento nem UE apontando para a I-I ou para a FIS');

-- ── RN-MAT-01 ──
select is(
  (select count(*)::int from _d
    where _d.status = 'ativo' and (_d.curso, _d.cod) in (('C-Ap-HN', 'I'), ('CAHO', 'MATFIS'))
      and _d.ch <> (select coalesce(sum(u.ch_prevista_tempos), 0) from public.unidades_ensino u where u.disciplina_id = _d.id and u.status = 'ativo')),
  0, 'RN-MAT-01 · a CH das unificadas fecha com a soma das UEs');
select is(
  (select count(*)::int from public.migracao_log where codigo like 'MLOG-014-D6-%-REFERENCIA'
     and valor_antes is distinct from valor_depois),
  0, 'D-6 · o evento de referência tem antes = depois (contagens e CHD por turma)');

select * from finish();
rollback;
