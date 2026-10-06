-- Preparo da onda 1 da VIRADA-1: as HABILITACOES que a planilha de controle exige e o cadastro nao tinha.
--
-- O QUE  : oito pares instrutor x disciplina — instrutor que deu aula na turma sem vinculo com a
--          disciplina (RN-INST-01). Aprovados por Bernardo Villas Boas em 06/10/2026 (item 4 do lote
--          da onda 1), com a lista por posto + nome de guerra mostrada antes de aplicar no remoto.
--
-- ⚠️ REGISTRO DO QUE FOI RODADO A MAO, nao migration: e cadastro, e a regra de direcao so admite
--    dado no remoto por decisao nominal. Idempotente: o par que ja existe nao e repetido.
--
-- ⚠️ OS NOMES NAO ESTAO AQUI, de proposito: o repositorio e publico. O instrutor e casado por
--    CODIGO da v2.0 e por POSTO; a conferencia pelo nome de guerra foi feita na execucao.
--
-- C-Esp-ME 2026: 149 em XI (49 TA) · 47 em IV (28 TA), V (19 TA) e XI (34 TA)
-- C-Exp-MetocOf 2026: 18 em IV (18 TA) · 127 em V (4 TA) · 26 em V (3 TA) · 45 em V (2 TA)
with pares (curso, instrutor, posto, disciplina) as (values
  ('C-Esp-ME', '149', '1ºSG', 'XI'),
  ('C-Esp-ME', '47', 'CC', 'IV'),
  ('C-Esp-ME', '47', 'CC', 'V'),
  ('C-Esp-ME', '47', 'CC', 'XI'),
  ('C-Exp-MetocOf', '18', 'SC', 'IV'),
  ('C-Exp-MetocOf', '127', '1ºTen', 'V'),
  ('C-Exp-MetocOf', '26', 'CT', 'V'),
  ('C-Exp-MetocOf', '45', 'CC', 'V')
)
insert into public.instrutor_disciplina (instrutor_id, disciplina_id)
select i.id, d.id
  from pares p
  join public.cursos c on c.codigo = p.curso
  join public.instrutores i on i.codigo = p.instrutor and i.posto_graduacao = p.posto
  join public.disciplinas d on d.curso_id = c.id and d.cod_disciplina = p.disciplina and d.status = 'ativo'
 where not exists (select 1 from public.instrutor_disciplina v where v.instrutor_id = i.id and v.disciplina_id = d.id);
