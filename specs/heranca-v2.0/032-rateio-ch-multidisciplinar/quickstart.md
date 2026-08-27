# Quickstart: Motor de Atribuição de Instrutores Multidisciplinares e Rateio de Carga Horária Prevista

**Pré-requisitos**: deploy publicado com o `o SHA do commit` desta spec; migração
`migracao/adicionar_ch_prevista_turma_disciplina.py` aplicada (coluna `CH_Prevista_Por_Instrutor` em
`turma_disciplina`); login com um perfil que possa editar `turma_disciplina` (ex. `Admin`).

## Passo 1 — Filtro restrito (disciplina comum), sem busca livre

1. Abrir o Módulo de Disciplinas, selecionar um curso e uma turma, e clicar "Editar" numa disciplina
   comum (ex. "Navegação").
2. Confirmar que não há nenhum campo de busca no painel — só a lista de checkboxes.
3. Confirmar que só aparecem instrutores com vínculo Ativo para aquele `ID_Grade` específico.

**Esperado**: SC-001, FR-001, FR-002.

## Passo 2 — Filtro amplo (disciplina multidisciplinar)

1. No cadastro de disciplinas (ou via schema), confirmar que uma disciplina do curso testado tem
   `Modo_Atribuicao_Padrao = 'Simultaneo'` (ex. LHFC, Prática de Fim de Curso, ou Prática de
   Manutenção de Auxílios à Navegação).
2. Clicar "Editar" nessa disciplina em `app/(app)/disciplinas/page.tsx` e confirmar que TODOS os instrutores
   habilitados a QUALQUER disciplina daquele curso aparecem — inclusive um instrutor habilitado só a
   uma disciplina bem diferente.
3. Repetir o mesmo teste no painel "Período das Disciplinas" de `app/(app)/cursos/[curso]/page.tsx`, para a mesma
   disciplina/turma, e confirmar que a lista é idêntica.

**Esperado**: SC-002, SC-004, FR-003, FR-004, FR-005.

## Passo 3 — Rateio de carga horária prevista

1. Numa disciplina com CH total conhecida (ex. 200 tempos), selecionar 4 instrutores.
2. Marcar "Dividir Carga Horária Igualmente" e salvar.
3. Reabrir o painel e confirmar que cada um dos 4 mostra "50 tempos previstos" ao lado do nome.
4. Repetir sem marcar o checkbox — confirmar que cada instrutor selecionado mostra a CH **integral**
   (200 tempos, não 50).
5. Selecionar só 1 instrutor (com ou sem o checkbox marcado) — confirmar que recebe a CH integral.

**Esperado**: SC-003, FR-006, FR-007, FR-008.

## Passo 4 — CH Cumprida real permanece intocada

1. Antes de qualquer teste acima, anotar a "Carga Horária Ministrada" (painel de Estatísticas de
   Instrutores) de um dos instrutores envolvidos.
2. Depois de salvar rateios/atribuições nos passos 2-3, confirmar que esse número **não mudou** —
   só muda quando uma aula real é lançada via DSA.

**Esperado**: SC-005, FR-011.

## Passo 5 — Regressão

1. `pnpm vitest run` — 0 falhas, incluindo os casos novos de
   `calcularChPrevistaPorInstrutor_` e da extensão de `atualizarTurmaDisciplina`.
2. Confirmar que salvar período/instrutor numa disciplina comum (fluxo já existente, specs 029/030)
   continua funcionando sem nenhuma mudança de comportamento observável.

**Esperado**: SC-006.
