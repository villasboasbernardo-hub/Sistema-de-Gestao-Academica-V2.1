# Contrato — Funções de servidor (Hotfix Carrosséis Fixos da Página Inicial)

Expostas via Server Action (chamada direta, tipada). **Nenhuma função de backend é
tocada por este hotfix** — este documento existe para registrar explicitamente essa garantia como
parte do contrato (FR-002), não para descrever uma mudança.

## ``app/layout.tsx` + `lib/supabase/server.ts``

### `getContextoInicial()` (assinatura e comportamento preservados integralmente)

- **Perfis**: `PERFIS_TODOS` (`exigirFuncao`, inalterado).
- **Parâmetros**: nenhum (inalterado).
- **Retorno (forma e conteúdo preservados)**:
  ```
  {
    usuario: {...},
    cursos: [{ idCurso, nome, classificacao, status, duracaoSemanas, modalidade, proposito }],
    turmas: [{ idTurma, idCurso, nome, status, dataInicio, dataTermino }],
    turmasEmDestaque: { [idCurso]: { idTurma, nome, status, progresso } },
  }
  ```
  `cursos` já inclui, hoje, 100% dos cursos do escopo do usuário — nenhum filtro por status de turma
  jamais existiu aqui (achado 1 de `spec.md`). Este hotfix não muda esse retorno; a mudança é
  inteiramente em como `app/(app)/inicio/page.tsx` consome `cursos`/`turmasEmDestaque`.
- **Regras**: FR-002 (regressão), RF-INI-01/02 (Épico 009, já citadas).

## Frontend — função pura nova, não exposta a Server Action

### `montarCarrosseisPainelInicio_(cursos, turmasEmDestaque)` (nova, interna a `app/(app)/inicio/page.tsx`)

- **Entrada**: `cursos` — `AppState.ctx.cursos` (array, forma inalterada); `turmasEmDestaque` —
  `AppState.ctx.turmasEmDestaque` (objeto `{idCurso: {...}}`, forma inalterada).
- **Saída**: array de 5 objetos `{classificacao, titulo, comDestaque, semDestaque}`, sempre nesta
  ordem — ver `data-model.md`.
- **Regras**: FR-001/003/004/008, Clarifications 2026-08-16 (ordem natural dentro de cada subgrupo,
  destaque primeiro).
- Função pura — testável isoladamente por `pnpm vitest run` sem DOM/a Server Action, mesmo padrão de
  `agruparCursosParaPagina_` (`app/(app)/cursos/[curso]/page.tsx`, Hotfix 010).

### `aoClicarCardInicio(idCurso, idTurma)` (assinatura preservada; `idTurma` passa a poder ser
`undefined`)

- Comportamento inalterado para o caso já existente (curso com turma em destaque): idêntico a antes
  deste hotfix.
- Caso novo (curso sem turma em destaque, FR-006): chamado só com `idCurso`; `AppState.setTurma
  (undefined)` é o comportamento nativo já existente de `AppState` (`components/ciaara/`) — limpa qualquer
  seleção de turma anterior, sem lançar erro. Nenhuma mudança de código em `AppState`/
  `aoClicarCardInicio` é necessária; só o cartão sem destaque passa a chamar a função com um
  argumento a menos.

## Nenhuma outra função de backend ou de front-end exposta é criada, removida ou tem assinatura alterada.
