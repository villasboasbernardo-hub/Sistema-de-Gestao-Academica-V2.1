-- =====================================================================================
-- 070_normativo.sql — o normativo ALERTA, nunca BLOQUEIA
-- Epico 1 · T053 · FR-048 · FR-049 · FR-050 · RN-DEG-02 · RN-2027-06
-- -------------------------------------------------------------------------------------
-- ESTE ARQUIVO E, EM BOA PARTE, UM TESTE POSITIVO — e isso e deliberado.
--
-- Ter um banco relacional torna trivial escrever `check (tempos_consumidos <= 8)`, e essa
-- facilidade e precisamente a armadilha. O 9o Tempo de Aula e AUTORIZACAO NORMATIVA
-- EXPLICITA nos curriculos de CAHO, C-Ap-HN e C-Ap-FR (RNF-NORM-01); bloquea-lo
-- contrariaria a norma que o autoriza. A capacitacao didatica esta ausente em 83,6% dos
-- 177 instrutores; torna-la obrigatoria inviabilizaria a operacao e a propria migracao.
--
-- Regra pratica para toda migration futura: ANTES de acrescentar um CHECK, verificar se a
-- regra correspondente esta classificada sob RN-DEG-02. Se estiver, o CHECK e o erro, nao
-- a solucao.
--
-- Este par de assercoes existe para DOCUMENTAR A INTENCAO e impedir que alguem, de boa-fe,
-- "conserte" o que nao esta quebrado.
-- =====================================================================================
begin;
select plan(7);

insert into public.cursos (id, codigo, nome_curso, classificacao) values
  ('11111111-0000-0000-0000-0000000000d1', 'NORM-A', 'Curso Normativo', 'regular');
insert into public.disciplinas (id, codigo, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos) values
  ('22222222-0000-0000-0000-0000000000d1', 'NORM-A-MAT', '11111111-0000-0000-0000-0000000000d1', 'MAT', 'Disciplina Normativa', 40);
insert into public.unidades_ensino (id, codigo, disciplina_id, curso_id, numero_ue, topico, ch_prevista_tempos) values
  ('33333333-0000-0000-0000-0000000000d1', 'NORM-A-MAT-UE1', '22222222-0000-0000-0000-0000000000d1', '11111111-0000-0000-0000-0000000000d1', 1, 'Unidade Normativa', 40);
insert into public.turmas (id, codigo, curso_id, turma, ano_letivo, status) values
  ('44444444-0000-0000-0000-0000000000d1', 'NORM-A 2026', '11111111-0000-0000-0000-0000000000d1', 'T1', 2026, 'ativa');

-- ======================================= FR-050 — O TESTE POSITIVO DO 9o TEMPO DE AULA
select lives_ok(
  $$insert into public.registros_aula (codigo, data, turma_id, unidade_ensino_id, curso_id, tempos_consumidos, categoria_normativa, instrutor_id)
    values ('REG-NORM-9TA', '2026-08-10',
            '44444444-0000-0000-0000-0000000000d1',
            '33333333-0000-0000-0000-0000000000d1',
            '11111111-0000-0000-0000-0000000000d1', 9, 'atividade_extraclasse', null)$$,
  'RN-DEG-02 · o 9o TEMPO DE AULA E ACEITO. Se esta assercao falhar, alguem transformou teto normativo em bloqueio'
);

-- ============================== FR-048 / RNF-NORM-08 — parametro e dado, com a norma
select is(
  (select valor from public.config_parametros where chave = 'teto.aec_percentual_chr'),
  '10',
  'FR-048 · teto de AEC (10%) vive como dado, nao como numero fixo em codigo'
);
select is(
  (select count(*)::int from public.config_parametros
    where chave in ('teto.aec_percentual_chr','teto.tad_percentual_chr','teto.tr_percentual_chr')),
  3,
  'FR-048 · os tres tetos — AEC 10%, TAD 5%, TR 10% — estao cadastrados'
);

-- RN-2027-06: o teto e a FAIXA, nunca o numero do regime. 20h -> 8-12h, 40h -> 16-24h,
-- Dedicacao Exclusiva -> 16-30h. Confundir a faixa com o regime foi o erro que a regra
-- existe para impedir.
select is(
  (select count(*)::int from public.config_parametros where chave like 'ch_docente.%'),
  6,
  'RN-2027-06 · as tres faixas de CH docente estao cadastradas como FAIXA (min e max), nunca como o numero do regime'
);
select is(
  (select valor from public.config_parametros where chave = 'ch_docente.20h.min') || '-' ||
  (select valor from public.config_parametros where chave = 'ch_docente.20h.max'),
  '8-12',
  'RN-2027-06 · regime de 20h tem faixa 8-12h, e nao "20"'
);

-- Todo parametro declara a norma de que veio. Sem isso, revisao normativa vira arqueologia.
select is_empty(
  $$select chave from public.config_parametros
     where fundamento_normativo is null or btrim(fundamento_normativo) = ''$$,
  'RNF-NORM-08 · todo parametro normativo declara o seu fundamento'
);

-- ============================ FR-046 — dominio administravel muda sem migration
select lives_ok(
  $$insert into public.config_listas (lista, valor, rotulo_exibicao, ordem)
    values ('metodologias', 'aula_invertida', 'Aula Invertida', 99)$$,
  'FR-046 · acrescentar valor a dominio administravel e um INSERT, nao uma migration'
);

select * from finish();
rollback;
