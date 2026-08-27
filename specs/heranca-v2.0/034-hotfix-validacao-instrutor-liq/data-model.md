# Data Model: Hotfix — Validação da LIQ Passa a Reconhecer o Instrutor Realmente Selecionado por Turma

Nenhuma entidade nova, nenhuma coluna nova. Troca de fonte de leitura dentro de 2 funções
existentes.

## Entidades existentes envolvidas

### `turma_disciplina` — leitura (campo já existente, agora consumido para este fim)

`ID_Instrutor` (já existente desde a spec 029, CSV de `ID_Instrutor` separados por vírgula) passa a
ser a fonte de "instrutor atribuído" para `validarLiq_`/`montarDadosSecao2Liq_`, no lugar de
`instrutor_disciplina`.

### `instrutor_disciplina` — leitura removida de 2 funções, mantida em 1

- `validarLiq_`: não lê mais esta aba.
- `montarDadosSecao2Liq_`: não lê mais esta aba.
- `montarDadosSecao1Liq_`: continua lendo normalmente — Seção 1 (roster geral de qualificação),
  fora de escopo desta spec.

### `instrutores` — leitura já existente, sem mudança

`montarDadosSecao2Liq_` já lia esta aba (`'instrutores'`) para resolver `ID_Instrutor` → nome/
posto/OM — continua exatamente igual, só a origem dos IDs a resolver muda (de
`instrutor_disciplina.ID_Instrutor` para `turma_disciplina.ID_Instrutor`).

## Regra pura (inline, sem extração de função — research.md §2)

Dentro das 2 funções: `String(td['ID_Instrutor'] || '').split(',').map(function(s){return
s.trim();}).filter(Boolean)` — mesmo parse já usado em outros pontos do projeto para o mesmo
formato de campo.
