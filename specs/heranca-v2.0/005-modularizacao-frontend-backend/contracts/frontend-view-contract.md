# Contrato — Limites de arquivo e pontos de integração (Épico B)

Não há contrato de API/backend novo nesta spec (FR-003: zero função de backend criada, movida ou
com assinatura alterada — ver `research.md` achado 4). O contrato real desta feature é **de
arquivo**: o que cada view passa a possuir, e os únicos dois pontos onde uma view chama uma função
que fisicamente mora em outra.

## Backend — inalterado (referência, não contrato novo)

| Função | Arquivo | Chamada por (frontend) |
|---|---|---|
| `calcularTetosDoCurso(idCurso)` | `lib/dominio/regras-normativas.ts` | `app/(app)/cursos/[curso]/page.tsx` |
| `acompanharEstudoIndividualDaTurma(idTurma)` | `lib/dominio/regras-normativas.ts` | `app/(app)/cursos/[curso]/page.tsx` |
| `getRelatorio(idCurso)` | `lib/acoes/relatorio.ts` | `app/(app)/relatorio/page.tsx` (era `app/(app)/cursos/[curso]/page.tsx`) |
| `registrarAvaliacao(obj)` | `lib/acoes/avaliacoes.ts` | `app/(app)/avaliacoes/page.tsx` (era `app/(app)/atividades/page.tsx`) |
| `getPainelavaliacoesCurso(idCurso)` | `lib/acoes/avaliacoes.ts` | `app/(app)/avaliacoes/page.tsx` (era `app/(app)/cursos/[curso]/page.tsx`) |
| `cancelarAvaliacao(idAvaliacao)` | `lib/acoes/avaliacoes.ts` | `app/(app)/avaliacoes/page.tsx` (era `app/(app)/cursos/[curso]/page.tsx`) |
| `registrarVistaProva(obj)` | `lib/acoes/avaliacoes.ts` | `app/(app)/avaliacoes/page.tsx` (era `app/(app)/cursos/[curso]/page.tsx`) |

## Frontend — o que cada view passa a possuir depois da extração

### `app/(app)/cursos/[curso]/page.tsx` (dono de `#cursoSelecao`)

- Mantém: seletor de curso, `aoTrocarCurso()`, bloco de tetos normativos, Estudo Individual.
- Perde: `#totalizadoresCurso`/`carregarTotalizadoresCurso` (→ `app/(app)/relatorio/page.tsx`),
  `#painelavaliacoes`/`carregarPainelavaliacoes`/`cancelarLancamentoAvaliacao`,
  `#blocoVistaProva`/`popularSelectVistaProva`/`salvarVistaProva` (→ `app/(app)/avaliacoes/page.tsx`).
- `aoTrocarCurso()` chama as duas funções que saíram via guarda `typeof` (contrato de integração
  abaixo) — nunca a importação de componentes ou referência direta a arquivo.

### `app/(app)/atividades/page.tsx` (dono de `#extraTurma`/lançamento AEC/TAD/TR/EI)

- Mantém: `#rowLancamentosExtra`, `#formExtra`, `salvarExtra()`, `aoMudarCategoriaExtra()`,
  `aoMudarEscopoExtra()`, `popularTurmasExtra()` (só `#extraTurma` depois da extração),
  `aplicarVisibilidadePorPerfilExtra()` (só `#rowLancamentosExtra`/`#avisoSomenteLeituraExtra`).
- Perde: `#formAvaliacao`/`salvarAvaliacao()`/`#avalTurma` (→ `app/(app)/avaliacoes/page.tsx`, FR-001a).
- Depois da extração, este arquivo não contém nenhum campo/função com "aval" ou "avaliac" no nome
  (critério verificável de FR-001a).

### `app/(app)/avaliacoes/page.tsx` (NOVO)

- Recebe: `#formAvaliacao`/`salvarAvaliacao()`/`#avalTurma`/`popularTurmasavaliacoes()` (de
  `app/(app)/atividades/page.tsx`); `#painelavaliacoes`/`carregarPainelavaliacoes()`/
  `cancelarLancamentoAvaliacao()`/`#blocoVistaProva`/`popularSelectVistaProva()`/
  `salvarVistaProva()` (de `app/(app)/cursos/[curso]/page.tsx`).
- Novo: `aplicarVisibilidadePorPerfilavaliacoes()` (perfil `Admin`/`Operador`, mesmo gate de hoje,
  cobrindo só `#rowAgendarAvaliacao`/`#avisoSomenteLeituraavaliacoes` — ver `research.md` achado 2).
- `carregarPainelavaliacoes(idCurso)` é acionada por `app/(app)/cursos/[curso]/page.tsx` via guarda `typeof` — não por
  evento próprio de seleção de curso (não existe `AppState.cursoSelecionado` change listener nesta
  versão do AppState, Épico D constrói isso).

### `app/(app)/relatorio/page.tsx` (NOVO)

- Recebe: `#totalizadoresCurso`/`carregarTotalizadoresCurso()` (de `app/(app)/cursos/[curso]/page.tsx`).
- `carregarTotalizadoresCurso(idCurso)` é acionada por `app/(app)/cursos/[curso]/page.tsx` via guarda `typeof` —
  já era esse o padrão antes da extração (``app/(app)/cursos/[curso]/page.tsx`:127`, único ponto que já antecipava esta
  extração).

## Contrato de integração entre views (o único acoplamento permitido)

```js
// `app/(app)/cursos/[curso]/page.tsx` — dentro de aoTrocarCurso(idCurso), depois de setar AppState.cursoSelecionado
if (typeof carregarTotalizadoresCurso === 'function') carregarTotalizadoresCurso(idCurso);
if (typeof carregarPainelavaliacoes === 'function') carregarPainelavaliacoes(idCurso);
```

Regra: **nenhuma outra forma de acoplamento entre views é introduzida** por este épico (sem
`CustomEvent` novo, sem registro de callback, sem a importação de componentes de uma view dentro de outra) — só a
guarda `typeof` já usada no código antes desta extração (`research.md` achado 1). Qualquer PR que
adicione uma chamada direta de função entre dois arquivos de view (sem a guarda) viola FR-001/User
Story 1 (a tela de Avaliações deixaria de ser editável isoladamente).

## Índice de views em `app/layout.tsx` (novo item de menu)

| Hash | View | Perfis com acesso (RF-AUTH-04, inalterado — mesma matriz de `PERFIS_TODOS` já aplicada às
  funções de leitura) |
|---|---|---|
| `#tabavaliacoes` | `app/(app)/avaliacoes/page.tsx` | `PERFIS_TODOS` para o painel (leitura, já era a regra
  de `getPainelavaliacoesCurso`); `Admin`/`Operador` para agendar/vista (escrita, inalterado). |
| `#tabRelatorio` | `app/(app)/relatorio/page.tsx` | `PERFIS_TODOS` (leitura, já era a regra de `getRelatorio`). |
