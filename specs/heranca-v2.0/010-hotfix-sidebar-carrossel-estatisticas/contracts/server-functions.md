# Contrato — Funções de servidor (Hotfix Sidebar/Carrossel/Estatísticas)

Expostas via Server Action (chamada direta, tipada). Só uma função de backend é tocada
por este hotfix — assinatura e perfis de acesso preservados integralmente, só a lógica interna muda.

## `lib/acoes/estatisticas.ts`

### `getEstatisticasCursos()` (assinatura preservada, cálculo interno corrigido)

- **Perfis**: `PERFIS_TODOS` (`exigirFuncao`, inalterado).
- **Parâmetros**: nenhum (inalterado).
- **Retorno (forma preservada, valores corrigidos)**:
  ```
  {
    kpis: { totalCursos: number, totalTurmasAtivas: number },
    porClassificacao: [{ classificacao: string, quantidade: number }],
    duracaoMediaPorClassificacao: [{ classificacao: string, duracaoMediaSemanas: number }],
  }
  ```
  Forma idêntica à do Épico 009 — nenhum campo novo, nenhum campo removido. A diferença é que
  `totalCursos`, cada `quantidade` de `porClassificacao` e cada `duracaoMediaSemanas` de
  `duracaoMediaPorClassificacao` agora refletem `ID_Curso` **únicos**, nunca linhas brutas da aba
  (FR-006). `totalTurmasAtivas` é inalterado (já vinha de `turmas`, sem relação com a
  duplicidade de `cursos`).
- **Regras**: FR-006, RF-CURSOS-02 (já citada pelo Épico 009).

## Frontend — função pura nova, não exposta a Server Action

### `agruparCursosParaPagina_(cursos, turmasEmDestaque)` (nova, interna a `app/(app)/cursos/[curso]/page.tsx`)

- **Entrada**: `cursos` — `AppState.ctx.cursos` (array, forma inalterada desde o Épico 009);
  `turmasEmDestaque` — `AppState.ctx.turmasEmDestaque` (objeto `{idCurso: {...}}`, forma inalterada).
- **Saída**: objeto `{classificacao: {comDestaque: Curso[], semDestaque: Curso[]}}` — ver
  `data-model.md`.
- **Regras**: FR-003/004, Clarifications 2026-08-16 (ordem natural dentro de cada subgrupo, sem
  critério de desempate adicional).
- Função pura — testável isoladamente por `pnpm vitest run` sem DOM/a Server Action.

## Nenhuma outra função de backend ou de front-end exposta é criada, removida ou tem assinatura alterada.
