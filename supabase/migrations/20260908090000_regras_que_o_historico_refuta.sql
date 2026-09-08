-- =================================================================================
-- Três regras do Épico 1 que o histórico da v2.0 refuta
--
-- Terceiro e último arquivo da série aberta por `…_not_null_que_o_dado_real_refuta`.
-- Mesma disciplina: onde a ausência é legítima para sempre, o `NOT NULL` cai; onde é
-- ausência só do passado, entra CATRACA — que para dado novo é MAIS forte que a
-- regra original, porque também volta a exigir quando alguém edita a linha migrada.
--
-- Aplicado sob a autorização de 08/09/2026 de consertar os defeitos do Épico 1.
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- 1. `reg_aula_instrutor_obrigatorio`  —  173 de 1.566
--
-- A regra: registro de categoria `aula` tem de nomear instrutor. É a regra certa: uma
-- aula sem instrutor não pode entrar na LIQ nem contar CHD. Mas 173 lançamentos da
-- v2.0 — todos `Aula` / `Aula Teórica` — não têm `ID_Instrutor`, e são 11% do
-- histórico letivo.
--
-- ⚠️ ESTES 173 SÃO TRABALHO PENDENTE DA DIVISÃO, NÃO RUÍDO. Aula lançada sem
--    instrutor é exatamente o que a LIQ cobra quando se recusa a emitir. Entram pela
--    catraca para que o histórico fique completo e MENSURÁVEL — e a reconciliação os
--    lista nominalmente. No instante em que alguém editar uma dessas linhas, o banco
--    exige o instrutor.
-- ---------------------------------------------------------------------------------
alter table public.registros_aula drop constraint reg_aula_instrutor_obrigatorio;
alter table public.registros_aula add constraint reg_aula_instrutor_obrigatorio check (
  categoria_normativa <> 'aula'
  or instrutor_id is not null
  or (origem_migracao_v1 is not null and editado_em is null)
);

comment on constraint reg_aula_instrutor_obrigatorio on public.registros_aula is
  'Aula exige instrutor. EXCECAO: linha migrada da v2.0 ainda nao editada — 173 das '
  '1.566, todas Aula Teorica. Sao pendencia da Divisao, listadas na reconciliacao; '
  'editar a linha reativa a exigencia e lancamento novo nunca escapa dela.';

-- ---------------------------------------------------------------------------------
-- 2. `aval_ta_coerente`  —  1 de 188
--
-- A regra: `ta_inicial` e `tempos_consumidos` estão ambos preenchidos ou ambos nulos.
-- É coerência real — saber onde a avaliação começa sem saber quanto durou não permite
-- alocá-la no dia. Uma única avaliação da v2.0 tem TA inicial e não tem tempos.
-- ---------------------------------------------------------------------------------
alter table public.avaliacoes drop constraint aval_ta_coerente;
alter table public.avaliacoes add constraint aval_ta_coerente check (
  (ta_inicial is null) = (tempos_consumidos is null)
  or (origem_migracao_v1 is not null and editado_em is null)
);

comment on constraint aval_ta_coerente on public.avaliacoes is
  'TA inicial e tempos consumidos vem juntos ou faltam juntos. EXCECAO: 1 linha '
  'migrada da v2.0 com TA e sem tempos, ainda nao editada.';

-- ---------------------------------------------------------------------------------
-- 3. `reservas_proens.curso_id`  —  reserva do PROENS pode não ser de curso nenhum
--
-- As 12 reservas usam seis códigos: `C-Ap-FR`, `C-Ap-HN`, `C-Espc-FR`, `C-Espc-HN`,
-- `CAHO` — e `GERAL`. Os cinco primeiros são cursos; **`GERAL` não é um curso**: é a
-- convenção da v2.0 para "reserva que vale para a Divisão inteira". O mesmo `GERAL`
-- que aparece em `_Migracao_Log` (LOG-000399: "2 sementes GERAL criadas").
--
-- ⚠️ NÃO CRIAR UM CURSO CHAMADO "GERAL". Seria uma linha de `cursos` que não é curso,
--    e ela apareceria em toda listagem, todo filtro e todo relatório de curso pelo
--    resto da vida do sistema. O `NULL` diz a mesma coisa e não polui nada.
-- ---------------------------------------------------------------------------------
alter table public.reservas_proens alter column curso_id drop not null;

comment on column public.reservas_proens.curso_id is
  'Curso a que a reserva do PROENS se destina. NULO = reserva GERAL, valida para a '
  'Divisao inteira — e a convencao `GERAL` da v2.0, transportada como ausencia de '
  'vinculo. Nao criar um curso "GERAL" para preencher esta coluna.';

-- =================================================================================
-- PLANO DE REVERSÃO
--   · os dois constraints voltam à definição sem a clausula de catraca;
--   · `alter table public.reservas_proens alter column curso_id set not null;`
--   ⚠️ Todos falham enquanto as 174 + 12 linhas estiverem carregadas.
-- =================================================================================
