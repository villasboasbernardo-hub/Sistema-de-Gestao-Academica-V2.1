# Contrato — Funções de Frontend (`app/(app)/cursos/[curso]/page.tsx` e `app/(app)/disciplinas/page.tsx`)

Convenção: as duas telas implementam o **mesmo padrão**, cada uma em sua própria cópia de função
(Next.js não compartilha código entre arquivos `.html` distintos — mesmo precedente de
`intervaloContidoEmClient_`, spec 030).

## `app/(app)/disciplinas/page.tsx`

### Retirada
- `#buscaInstrutorEdicao` (input), `filtrarInstrutoresEdicaoDisciplina_()` — removidos por completo
  (FR-002). O `oninput` correspondente sai do HTML do painel.

### Nova: `instrutoresElegiveis_(linha, disciplinaGrade)`
Função pura (contrato em `data-model.md`). Lê `disciplinasCarregadas` (já em memória, spec 031) para
montar o conjunto de `ID_Grade` do curso quando `disciplinaGrade.Modo_Atribuicao_Padrao ===
'Simultaneo'`; senão usa só `linha.ID_Grade`. Filtra `vinculosInstrutorCarregados` por esse conjunto
e deduplica por `ID_Instrutor` (um instrutor habilitado a 2 disciplinas do mesmo curso multidisciplinar
aparece 1 única vez).

### Ajustada: `abrirEdicaoDisciplinaTurma_(idTurmaDisciplina)`
- Resolve `disciplinaGrade` (já faz isso hoje, join por `ID_Grade` em `disciplinasCarregadas`,
  reaproveitado de spec 031).
- `habilitados` passa a vir de `instrutoresElegiveis_(linha, disciplinaGrade)` em vez do filtro
  direto por `ID_Grade`.
- Cada linha de checkbox passa a mostrar a CH Prevista atual ao lado do nome, quando existir em
  `linha.CH_Prevista_Por_Instrutor` (parse simples do formato `"ID:valor, ID:valor"`) — ex. `"SO
  Fulano — 50 tempos previstos"`.
- Novo checkbox no painel: `#dividirChEdicaoDisciplina` ("Dividir Carga Horária Igualmente entre os
  selecionados"), sempre renderizado desmarcado (FR-006).

### Ajustada: `salvarEdicaoDisciplinaTurma_(idTurmaDisciplina)`
- Lê `document.getElementById('dividirChEdicaoDisciplina').checked`.
- Chama `gs('atualizarTurmaDisciplina', idTurmaDisciplina, { Previsao_Inicio, Previsao_Termino,
  ID_Instrutor }, dividirMarcado)` — 4º argumento novo na chamada a Server Action.
- Resto do corpo (validação client-side de janela, `intervaloContidoEmClient_`, recarregamento via
  `carregarDisciplinasView_`) permanece idêntico (spec 031).

## `app/(app)/cursos/[curso]/page.tsx`

### Ajustada: `abrirPainelPeriodoTurma_(idCurso)`
- `Promise.all` ganha uma 4ª chamada: `gs('listarDisciplinas')` (já existente, reaproveitada — FR-005,
  research.md), cujo resultado é filtrado por `ID_Curso === idCurso` antes de passar para
  `renderizarPainelPeriodoTurma_`.

### Ajustada: `renderizarPainelPeriodoTurma_(idCurso, idTurma, linhas, vinculos, instrutores, disciplinasDoCurso)`
- Ganha o parâmetro `disciplinasDoCurso` (novo).
- `checkboxesInstrutor_(l)` passa a resolver `disciplinaGrade = disciplinasDoCurso.find(d =>
  d.ID_Grade === l.ID_Grade)` e usar `instrutoresElegiveis_(l, disciplinaGrade, disciplinasDoCurso,
  vinculos)` (mesma função pura de `data-model.md`, cópia própria deste arquivo) em vez do filtro
  direto por `ID_Grade`.
- Cada checkbox mostra a CH Prevista atual ao lado do nome, quando existir em
  `l.CH_Prevista_Por_Instrutor` (mesmo parse de `app/(app)/disciplinas/page.tsx`).
- Novo checkbox por linha: `#dividirCh_${l.ID_turma_disciplina}` ("Dividir Carga Horária
  Igualmente"), dentro da mesma célula `instrutoresSel_${l.ID_turma_disciplina}`, sempre desmarcado.

### Ajustada: `salvarPeriodoTurmaClick_(idTurmaDisciplina)`
- Lê `document.getElementById('dividirCh_' + idTurmaDisciplina).checked`.
- Chama `gs('atualizarTurmaDisciplina', idTurmaDisciplina, { Previsao_Inicio, Previsao_Termino,
  ID_Instrutor }, dividirMarcado)` — mesmo 4º argumento novo.
- Resto do corpo (atualização do badge de status) permanece idêntico (spec 029).

## Regra pura duplicada (mesmo corpo nas 2 telas)

### `instrutoresElegiveis_(linhaOuDisciplinaAtual, disciplinaGrade, idGradesDoCurso, vinculos)`
Ver `data-model.md` § Regra pura nova. Sem chamada de rede, sem efeito colateral.

### Parser de exibição: `resumoChPrevista_(chPrevistaCsv, idInstrutor)`
```js
function resumoChPrevista_(chPrevistaCsv, idInstrutor) {
  const par = String(chPrevistaCsv || '').split(',').map(s => s.trim()).find(p => p.startsWith(idInstrutor + ':'));
  return par ? par.split(':')[1] : null;
}
```
Usada nas 2 telas para exibir `"N tempos previstos"` ao lado de cada checkbox marcado, quando houver
valor persistido.
