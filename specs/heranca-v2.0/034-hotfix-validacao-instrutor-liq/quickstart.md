# Quickstart: Hotfix — Validação da LIQ Passa a Reconhecer o Instrutor Realmente Selecionado por Turma

**Pré-requisitos**: deploy publicado com o `o SHA do commit` desta spec; login com um perfil que possa
gerar a LIQ (ex. `Admin`); a disciplina LHFC do CAHO (ou equivalente) já com
`turma_disciplina.ID_Instrutor` preenchido.

## Passo 1 — LIQ deixa de bloquear por falso positivo

1. No Módulo de Instrutores, abrir o painel LIQ e tentar gerar para um trimestre de 2026 que
   intercepta a disciplina LHFC do CAHO (ex. 4º trimestre).
2. Confirmar que a geração não é mais bloqueada pela mensagem "LHFC ... sem instrutor selecionado" —
   antes desta spec, esse era 1 dos 27 falsos positivos confirmados.
3. Repetir para os outros 3 trimestres de 2026, confirmando que nenhum deles bloqueia mais pelos
   casos onde `turma_disciplina.ID_Instrutor` já estava preenchido.

**Esperado**: SC-001.

## Passo 2 — Disciplina genuinamente sem instrutor continua bloqueando

1. Escolher uma disciplina cujo `turma_disciplina.ID_Instrutor` está vazio e cujo período intercepta
   o trimestre testado.
2. Confirmar que a geração continua bloqueada, com a mesma mensagem "sem instrutor selecionado" —
   este caso é genuíno, não um bug, e não deve mudar de comportamento.

**Esperado**: SC-004.

## Passo 3 — Seção 2 do documento lista o instrutor certo

1. Gerar a LIQ de um trimestre que passa na validação.
2. Abrir o documento gerado e conferir, para a disciplina LHFC (ou outra com instrutor
   selecionado), que a Seção 2 lista exatamente o(s) instrutor(es) selecionado(s) via
   `turma_disciplina.ID_Instrutor` — não qualquer outro instrutor apenas habilitado à disciplina.
3. Conferir a Seção 1 do mesmo documento e confirmar que continua com o mesmo roster geral de
   sempre (sem mudança).

**Esperado**: SC-002, SC-003.

## Passo 4 — Regressão

1. `pnpm vitest run` — 0 falhas, incluindo os casos atualizados/novos de `validarLiq_`.
2. Confirmar que nenhum outro teste de `lib/acoes/liq.ts` (rateio de CH Prevista, `intervaloContidoEm_`,
   `atualizarTurmaDisciplina`) mudou de resultado.

**Esperado**: SC-005.
