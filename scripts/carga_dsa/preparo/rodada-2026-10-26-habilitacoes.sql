-- Preparo da rodada de 26/10/2026 da VIRADA-1 (exportacao 2026-10-26T1157): a HABILITACAO que a planilha da
-- C-Espc-FR 2026 passou a exigir e o cadastro nao tinha.
--
-- O QUE  : 1 par instrutor x disciplina — o instrutor de codigo 16 em MBFCFR-017 (disciplina XI, «MANUTENCAO DE
--          AUXILIOS A NAVEGACAO DE FIM DE CURSO»), com 9 blocos (72 TA) planejados na aba PREENCHIMENTO (RN-INST-01).
-- PORQUE : decisao com precedente — `onda-1-habilitacoes.sql` e `onda-2-habilitacoes.sql` (Bernardo Villas Boas,
--          06/10/2026): o instrutor que a planilha nomeia na aula e habilitado na disciplina. Aplicada pela
--          recomendacao, por autorizacao de Bernardo Villas Boas para esta rodada (26/10/2026); registrada em
--          `decisoes/c-espc-fr-2026.json` (`aprovadas`).
-- COMO   : a disciplina e a do CURRICULO DA TURMA (spec 021, D-17), casada pelo `cod_disciplina`; o instrutor, pelo
--          CODIGO. Idempotente; sem nome de pessoa. Roda nos dois bancos, antes do ensaio (o plano do remoto tem de ser
--          o do local).
--
-- ACRESCENTADO NO FECHAMENTO DA RODADA (26/10/2026, decisao R3 de Bernardo Villas Boas): o instrutor de codigo 55 em
--          XII do C-Ap-HN 2026 («GERENCIAMENTO DE DADOS HIDRO..»), que a nova fonte da turma (D1) nomeia nas aulas de XII
--          planejadas de 26/10 a 07/11 — 10 blocos, depois da virada de 13/10. Pelo mesmo caminho da primeira: e a
--          habilitacao que a rodada listou como «depois da virada» e que a tela vai pedir quando o operador lancar
--          essas aulas. Roda no local e, depois do merge, no remoto. O codigo sai do MAX+1 de `proximo_codigo_vinculo`, e os
--          dois bancos estavam em `VIN-000865` (865 vinculos) antes dele — medido em 26/10/2026.
with pares (turma, instrutor, disciplina) as (values
  ('C-Espc-FR 2026', '16', 'MBFCFR-017'),
  ('C-Ap-HN 2026', '55', 'XII')
)
insert into public.instrutor_disciplina (instrutor_id, disciplina_id)
select i.id, d.id
  from pares p
  join public.turmas t on t.codigo = p.turma
  join public.instrutores i on i.codigo = p.instrutor and i.status = 'ativo'
  join public.disciplinas d on d.curriculo_id = t.curriculo_id and d.cod_disciplina = p.disciplina and d.status = 'ativo'
 where not exists (select 1 from public.instrutor_disciplina v where v.instrutor_id = i.id and v.disciplina_id = d.id);
