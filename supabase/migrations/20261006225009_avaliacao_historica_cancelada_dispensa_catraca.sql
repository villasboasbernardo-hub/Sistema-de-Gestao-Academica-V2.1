-- ════════════════════════════════════════════════════════════════════════════════════════════
-- A AVALIAÇÃO HISTÓRICA **CANCELADA** FICA DISPENSADA DA CATRACA DE TA — VIRADA-1, onda 2
-- ════════════════════════════════════════════════════════════════════════════════════════════
--
-- O QUÊ  : `aval_ta_coerente` ganha a mesma saída que as cinco catracas de `20261006184558`:
--          linha com procedência de ETL e `status = 'cancelada'`.
--
-- PARA QUÊ: a VIRADA-1 substitui a avaliação do ETL pela da planilha de controle por `cancelada` com a
--          marca em `observacoes` (forma aprovada por Bernardo Villas Boas em 06/10/2026, item 2 do lote
--          da onda 1). O `UPDATE` carimba `editado_em`, e a catraca — que só dispensa a linha migrada
--          ENQUANTO não editada — volta a exigir TA e tempos juntos.
--
-- ⚠️ MEDIDO ANTES, no banco LOCAL (cópia do remoto de 06/10/2026, 19:05): a migration `20261006184558`
--    dizia *"as avaliações não entram: medido, o UPDATE passa"*. Passava para as 25 do C-Esp-ME. A onda 2
--    achou a exceção que o próprio comentário da restrição já nomeava — **1 linha migrada da v2.0 com TA
--    e sem tempos** (`C-Espc-FR 2026`) —, e o ensaio da turma reprovou com `23514 aval_ta_coerente`.
--
-- ⚠️ O QUE A EMENDA NÃO AFROUXA (pgTAP `120`): avaliação ATIVA (pendente, em andamento, concluída,
--    atrasada) continua obrigada a TA e tempos juntos, histórica ou não; linha NOVA cancelada não escapa,
--    porque a saída exige `origem_migracao_v1 is not null`.
--
-- ⚠️ `DROP CONSTRAINT` + `ADD CONSTRAINT` descarta o `COMMENT ON CONSTRAINT`: reescrito abaixo.
--
-- REVERSÃO: `alter table public.avaliacoes drop constraint aval_ta_coerente;` e recriar com a definição
--    anterior — `((ta_inicial is null) = (tempos_consumidos is null)) or (origem_migracao_v1 is not null and
--    editado_em is null)` — e o comentário anterior. Nenhuma linha de dado é tocada aqui.
-- ════════════════════════════════════════════════════════════════════════════════════════════

alter table public.avaliacoes drop constraint aval_ta_coerente;
alter table public.avaliacoes add constraint aval_ta_coerente check (
  ((ta_inicial is null) = (tempos_consumidos is null))
  or (origem_migracao_v1 is not null and editado_em is null)
  or (origem_migracao_v1 is not null and status = 'cancelada')
);
comment on constraint aval_ta_coerente on public.avaliacoes is
  'TA inicial e tempos consumidos vem juntos ou faltam juntos. EXCECAO: 1 linha migrada da v2.0 com TA e sem tempos, '
  'ainda nao editada — e, desde 06/10/2026 (VIRADA-1), a linha migrada CANCELADA, que e como a carga da planilha '
  'de controle a substitui.';
