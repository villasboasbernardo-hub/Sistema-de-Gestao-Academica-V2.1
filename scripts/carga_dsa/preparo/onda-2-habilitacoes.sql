-- Preparo da onda 2 da VIRADA-1: as HABILITACOES que as cinco planilhas regulares exigem e o cadastro nao tinha.
--
-- O QUE  : 31 pares (24 + 5 do codigo 55 + 2 das promocoes, a quem a decisao de 06/10/2026 atribui todo «CC ALVES») instrutor x disciplina — instrutor que deu aula na turma sem vinculo com a disciplina
--          (RN-INST-01). Aprovados por Bernardo Villas Boas em 06/10/2026 (lote da onda 2, item 2), com a lista
--          por posto + nome de guerra mostrada antes de aplicar no remoto. Idempotente; sem nome de pessoa.
--          O instrutor e casado por CODIGO da v2.0 e pelo POSTO do cadastro (conferido na execucao).
with pares (curso, instrutor, disciplina) as (values
  ('C-Ap-FR', '13', 'VI'),
  ('C-Ap-FR', '13', 'XII'),
  ('C-Ap-FR', '16', 'IV'),
  ('C-Ap-FR', '118', 'III'),
  ('C-Ap-FR', '151', 'VIII'),
  ('C-Ap-HN', '17', 'X'),
  ('C-Espc-FR', '13', 'NAV-015'),
  ('C-Espc-FR', '16', 'FONFR-011'),
  ('C-Espc-FR', '118', 'EQUFR-010'),
  ('C-Espc-FR', '162', 'ADMANFR-014'),
  ('C-Espc-FR', '164', 'ESTANFR-012'),
  ('C-Espc-FR', '174', 'IITFR-003'),
  ('C-Espc-FR', '177', 'SN-1103-0506'),
  ('C-Espc-HN', '15', 'HN-1114-0730'),
  ('C-Espc-HN', '17', 'HN-1109-0812'),
  ('C-Espc-HN', '17', 'HN-1111-0508'),
  ('C-Espc-HN', '17', 'HN-1114-0730'),
  ('C-Espc-HN', '39', 'HN-1114-0730'),
  ('C-Espc-HN', '60', 'HN-1114-0730'),
  ('C-Espc-HN', '103', 'HN-1114-0730'),
  ('C-Espc-HN', '173', 'HN-1104-0506'),
  ('C-Espc-HN', '174', 'HN-1102-0710'),
  ('C-Espc-HN', '177', 'SN-1103-0506'),
  ('CAHO', '17', 'II'),
  ('C-Ap-HN', '55', 'IX'),
  ('C-Ap-HN', '55', 'XIV'),
  ('C-Espc-HN', '55', 'HN-1110-0815'),
  ('C-Espc-HN', '55', 'HN-1105-0243'),
  ('C-Espc-HN', '55', 'HN-1114-0730'),
  -- + dois pares (06/10/2026, item 4): o 144 onde deu aula sem habilitacao e o 173 em Fisica no C-Espc-FR
  ('C-Ap-FR', '144', 'IX'),
  ('C-Espc-FR', '173', 'HN-1104-0506')
)
insert into public.instrutor_disciplina (instrutor_id, disciplina_id)
select i.id, d.id
  from pares p
  join public.cursos c on c.codigo = p.curso
  join public.instrutores i on i.codigo = p.instrutor and i.status = 'ativo'
  join public.disciplinas d on d.curso_id = c.id and d.cod_disciplina = p.disciplina and d.status = 'ativo'
 where not exists (select 1 from public.instrutor_disciplina v where v.instrutor_id = i.id and v.disciplina_id = d.id);

