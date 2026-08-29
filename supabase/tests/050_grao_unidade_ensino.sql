-- =====================================================================================
-- 050_grao_unidade_ensino.sql — o grao do fato de execucao
-- Epico 1 · T039, T064 · FR-020 · FR-021 · FR-024 · FR-025
-- -------------------------------------------------------------------------------------
-- O RISCO QUE ESTE ARQUIVO GUARDA (documento 06, Epico 1): "escrever `registros_aula` no
-- grao de disciplina por habito". O referencia esta no grao antigo, e copiar dali sem ler
-- reintroduziria o grao anterior COM AUTORIDADE. As assercoes abaixo falham se isso
-- acontecer.
-- =====================================================================================
begin;
select plan(8);

-- ============================================================== FR-020 — o grao
select has_column('public', 'registros_aula', 'unidade_ensino_id',
  'FR-020 · registros_aula aponta para UNIDADE DE ENSINO');

select hasnt_column('public', 'registros_aula', 'disciplina_id',
  'FR-020 · registros_aula NAO guarda disciplina_id — guardar as duas seria a segunda fonte de verdade que a rota (b) elimina');

select col_not_null('public', 'registros_aula', 'unidade_ensino_id',
  'FR-020 · o vinculo com a unidade e OBRIGATORIO — forca Q1.b a ser respondida antes da carga');

-- FR-028 — a contraparte: a grandeza derivada nao tem coluna gravavel em lugar nenhum.
select hasnt_column('public', 'disciplinas', 'ch_executada',
  'FR-028 · disciplinas NAO tem campo gravavel de carga executada — a violacao e impossivel, nao improvavel');

-- ============================================ FR-021 — a entidade e suas garantias
select has_column('public', 'unidades_ensino', 'numero_ue', 'FR-021 · unidades_ensino existe com numero_ue');

select ok(
  exists (select 1 from pg_constraint
           where conrelid = 'public.unidades_ensino'::regclass
             and contype = 'u'
             and pg_get_constraintdef(oid) like '%disciplina_id, numero_ue%'),
  'FR-021 · numeracao unica dentro da disciplina e imposta pelo motor'
);

-- =========================================== FR-024 — a soma das UE fecha com a CH
-- Invariante conferida em 134 de 134 disciplinas na extracao dos curriculos.
-- PASSA VACUAMENTE enquanto a base estiver vazia — a carga e do Epico 2 — e passa DE
-- VERDADE quando o catalogo chegar. Esta escrita agora para que o dado ja encontre o
-- teste pronto, em vez de o teste ser escrito depois, contra o dado que ja entrou.
insert into public.cursos (id, codigo, nome_curso, classificacao) values
  ('11111111-0000-0000-0000-0000000000e1', 'GRAO-A', 'Curso Grao', 'regular');
insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos) values
  ('22222222-0000-0000-0000-0000000000e1', 'GRAO-A-MAT', '11111111-0000-0000-0000-0000000000e1', 'MAT', 'Disciplina Grao', 60);
insert into public.unidades_ensino (codigo, disciplina_id, curso_id, numero_ue, topico, ch_prevista_tempos) values
  ('GRAO-A-MAT-UE1', '22222222-0000-0000-0000-0000000000e1', '11111111-0000-0000-0000-0000000000e1', 1, 'Unidade 1', 20),
  ('GRAO-A-MAT-UE2', '22222222-0000-0000-0000-0000000000e1', '11111111-0000-0000-0000-0000000000e1', 2, 'Unidade 2', 15),
  ('GRAO-A-MAT-UE4', '22222222-0000-0000-0000-0000000000e1', '11111111-0000-0000-0000-0000000000e1', 4, 'Unidade 4 (numero 3 ausente)', 25);

select is_empty(
  $$select d.codigo, d.carga_horaria_tempos, sum(u.ch_prevista_tempos)
      from public.disciplinas d
      join public.unidades_ensino u on u.disciplina_id = d.id and u.status = 'ativo'
     where d.status = 'ativo'
     group by d.id, d.codigo, d.carga_horaria_tempos
    having sum(u.ch_prevista_tempos) <> d.carga_horaria_tempos$$,
  'FR-024 · para toda disciplina com unidades, a soma das CH das unidades e igual a CH da disciplina'
);

-- ============================================== FR-025 — lacuna na numeracao e valida
-- O cenario acima usa 1, 2 e 4 de proposito: o curriculo do C-Exp-Metoc-OF-SP numera com
-- salto, e uma verificacao de contiguidade recusaria dado normativo correto.
select is(
  (select count(*)::int from public.unidades_ensino
    where disciplina_id = '22222222-0000-0000-0000-0000000000e1'),
  3,
  'FR-025 · unidades numeradas 1, 2 e 4 convivem — contiguidade NAO e invariante'
);

select * from finish();
rollback;
