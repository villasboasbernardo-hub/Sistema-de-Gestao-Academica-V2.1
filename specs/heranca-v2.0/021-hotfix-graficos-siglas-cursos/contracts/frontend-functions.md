# Contrato — Funções de frontend (Hotfix: Polimento de UI/UX, Gráficos e Regra Global de Nomenclatura de Cursos)

## `app/(app)/instrutores/page.tsx`

### `ordenarPorAntiguidadePostoClient_(itensPorPosto)` (existente — comportamento alterado)

- **Mudança**: deixa de traduzir `item.posto` (sigla) para `NOMES_POSTO_POR_CODIGO[item.posto]`
  (nome extenso); devolve a sigla como está. Ordenação por `ordemAntiguidadePosto_` inalterada.
- **Regras**: FR-002, FR-003; research.md §1.

### `agregarEstatisticasInstrutores_(instrutoresFiltrados)` (existente — comportamento estendido)

- **Mudança**: objeto `kpis` retornado ganha a chave `semCapacitacaoDidatica` (= `total -
  comCapacitacaoDidatica`). Nenhuma outra chave muda.
- **Regras**: FR-004, FR-005; research.md §2.

### `renderizarEstatisticasInstrutores_()` (existente — comportamento estendido)

- **Mudança**: o HTML estático do painel (bloco `.row.g-3` das estatísticas) ganha um novo
  `<div class="col-md-6"><h6>Índice de Capacitação Geral</h6><div
  id="graficoInstrutoresCapacitacaoGeral"></div></div>`, ao lado do card existente "Capacitação
  Didática" (não no lugar dele). O `<h6>` do card "Qualificados vs. Selecionados" muda para "Status
  de Seleção" (Clarifications 2026-08-18). Uma nova chamada
  `renderizarGrafico_('graficoInstrutoresCapacitacaoGeral', 'pie', ['Com Capacitação Didática', 'Sem
  Capacitação Didática'], [r.kpis.comCapacitacaoDidatica, r.kpis.semCapacitacaoDidatica])` é
  adicionada ao lado das chamadas já existentes de `renderizarGrafico_`.
- **Regras**: FR-001, FR-004, FR-005, FR-006; research.md §2.

### `renderizarListagemInstrutores_()` (existente — comportamento estendido)

- **Mudança**: a expressão condicional do botão de ação (`${i.Status !== 'Inativo' ? '<button ...
  Desativar</button>' : ''}`) vira uma ramificação completa: `Status === 'Inativo'` renderiza
  `<button class="btn btn-sm btn-outline-success"
  onclick="reativarInstrutorClick('${i.ID_Instrutor}')">Reativar</button>` no lugar de nada; qualquer
  outro `Status` mantém o botão "Desativar" (`btn-outline-danger`) exatamente como hoje.
- **Regras**: FR-007, FR-008; research.md §3.

### `reativarInstrutorClick(idInstrutor)` (NOVA — espelha `desativarInstrutorClick`)

- **Nova função**, mesmo padrão de `desativarInstrutorClick` (linha 404-408): `confirm('Reativar este
  instrutor? Ele voltará a poder ser selecionado em novos lançamentos.')` (Clarifications
  2026-08-18); se confirmado, `gs('reativarInstrutor', idInstrutor).then(() =>
  carregarInstrutores()).catch(e => alert(e && e.message ? e.message : e))`.
- **Regras**: FR-009, FR-010; research.md §3.

### `popularOpcoesFiltrosInstrutores_()` (existente — comportamento alterado)

- **Mudança**: a ordenação do array de cursos antes de montar `#filtroCurso` muda de
  `.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))` para `.sort((a, b) => (a.idCurso ||
  '').localeCompare(b.idCurso || ''))`; a opção montada muda de `[c.idCurso, c.nome || c.idCurso]`
  para `[c.idCurso, c.idCurso]` (texto = sigla, valor inalterado).
- **Regras**: FR-011; research.md §4.

### `disciplinasHabilitadasDoInstrutor_(idInstrutor, vinculos, disciplinas)` (existente — assinatura alterada)

- **Mudança**: o parâmetro `cursosPorId` é removido (sem uso após esta mudança). A linha
  `resultado.push(nomeCurso + ' — ' + (d.Nome_Disciplina || d.ID_Grade))` vira
  `resultado.push((d.Nome_Disciplina || d.ID_Grade) + ' (' + d.ID_Curso + ')')`, eliminando a
  variável local `nomeCurso` e seu lookup em `cursosPorId`.
- **Chamadores atualizados**: as 2 chamadas em `disciplinasHabilitadasHtmlInstrutor_` (linha 952) e
  `valorExibicaoFichaInstrutor_`/bloco da Ficha (linha 1193) deixam de montar `nomeCursoPorId` (bloco
  `(AppState.ctx.cursos || []).forEach(c => { nomeCursoPorId[c.idCurso] = ... })` removido em ambos os
  pontos) e passam a chamar `disciplinasHabilitadasDoInstrutor_(idInstrutor, vinculos, disciplinas)`
  sem o 4º argumento.
- **Regras**: FR-012; research.md §5.

## `app/(app)/cronograma/page.tsx`

### Popular `#cronoCurso` (HTML inline, não função nomeada)

- **Mudança**: `(AppState.ctx.cursos || []).map(c => \`<option value="${c.idCurso}">${c.nome ||
  c.idCurso}</option>\`)` vira `.map(c => \`<option value="${c.idCurso}">${c.idCurso}</option>\`)`.
- **Regras**: FR-011; research.md §4.

## `app/(app)/disciplinas/page.tsx`

### Popular `#discCursoSelecao` (HTML inline, não função nomeada)

- **Mudança**: idêntica à de `app/(app)/cronograma/page.tsx` acima, mesmo padrão de `<option>`.
- **Regras**: FR-011; research.md §4.

## `app/(app)/admin/usuarios/page.tsx`

### Popular `#usrCursoParaVincular` (HTML inline, não função nomeada)

- **Mudança**: idêntica à de `app/(app)/cronograma/page.tsx` acima, mesmo padrão de `<option>`.
- **Regras**: FR-011; research.md §4.

### Lista de cursos já vinculados a um usuário (HTML inline, não função nomeada)

- **Mudança**: `curso ? curso.nome : v.ID_Curso` vira `curso ? curso.idCurso : v.ID_Curso`.
- **Regras**: FR-011; research.md §4.
