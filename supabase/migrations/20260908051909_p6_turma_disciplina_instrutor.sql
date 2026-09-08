-- =================================================================================
-- P-6 — `turma_disciplina` recebe o instrutor e a CH prevista por instrutor
--
-- O QUÊ  : duas colunas aditivas em `public.turma_disciplina`.
-- PARA QUÊ: esta tabela é a FONTE DE VERDADE do período previsto de cada disciplina
--          DENTRO DE CADA TURMA (achado LIQ-1). Sem `instrutor_id`, a LIQ do Épico 11
--          não tem de onde ler quem ministrou o quê naquela turma — e o documento 30
--          §13 registra que "sem elas o Épico 11 regride".
-- COMO   : `alter table ... add column`, ambas ANULÁVEIS. Nada é reescrito.
--
-- POR QUE ANULÁVEIS: a v2.0 não preenche as duas em todas as 210 linhas. Exigir valor
--          faria a carga falhar por dado que NUNCA EXISTIU na origem — e o Épico 2
--          transporta, não inventa (FR-003).
--
-- POR QUE `restrict` E NÃO `cascade`: nada é apagado neste sistema (BRIEF §2). Foi
--          exatamente este o achado nº 3 do Épico 1, quando uma FK veio com `cascade`
--          sem justificativa escrita. Não reintroduzir.
--
-- Origem: `docs/fase-3/30-Plano-de-Migracao-ETL.md` §13 (P-6) · spec 003 FR-026
-- Reversão: ver o rodapé.
-- =================================================================================

alter table public.turma_disciplina
  add column instrutor_id uuid references public.instrutores (id) on delete restrict;

comment on column public.turma_disciplina.instrutor_id is
  'Instrutor da disciplina NAQUELA turma. Anulavel: a v2.0 nao preenche as 210 linhas. '
  'E a coluna de onde a LIQ do Epico 11 le a atribuicao (achado LIQ-1). '
  'Acrescentada pela pendencia P-6, Epico 2.';

alter table public.turma_disciplina
  add column ch_prevista_por_instrutor numeric(6, 2);

comment on column public.turma_disciplina.ch_prevista_por_instrutor is
  'Carga horaria prevista atribuida aquele instrutor naquela turma. Anulavel, mesma razao. '
  'numeric(6,2) acompanha a precisao das demais colunas de CH do schema.';

-- Indice parcial: a LIQ consulta por instrutor dentro da turma, e so linhas ativas
-- interessam. Parcial porque exclusao e logica (`status`), nunca fisica.
create index idx_turma_disc_instrutor
  on public.turma_disciplina (instrutor_id)
  where status = 'ativo' and instrutor_id is not null;

-- =================================================================================
-- PLANO DE REVERSÃO (campo obrigatório do template de PR — documento 24 §6.3)
--
--   drop index if exists public.idx_turma_disc_instrutor;
--   alter table public.turma_disciplina drop column if exists ch_prevista_por_instrutor;
--   alter table public.turma_disciplina drop column if exists instrutor_id;
--
-- Seguro enquanto NÃO houver carga: as colunas nascem vazias nesta fatia. Depois da
-- primeira carga real, reverter APAGA dado migrado — e aí a regra do BRIEF vale
-- inteira: nada é apagado, e a reversão passa a ser a do documento 30 §9, não esta.
-- =================================================================================
