# Contrato — Funções de Frontend (`app/(app)/instrutores/page.tsx`)

## Botão "Gerar O.S. de Instrutoria"

Novo botão na barra de ações de `painelPrincipalInstrutores`, ao lado de "Cadastrar Novo
Instrutor"/"Estatísticas"/"LIQ" (mesma barra, spec 027).

## `abrirPainelOsInstrutoria_()` / `fecharPainelOsInstrutoria_()`

Alterna a visibilidade entre `painelPrincipalInstrutores` e o novo `id="view-os-instrutoria"`
(nome literal pedido) — mesmo mecanismo de `style.display` já usado por
`mostrarPainelFichaInstrutor_`/`fecharPainelFichaInstrutor_` (spec 025) e `alternarPainelLiq_`
(spec 027). Nunca `window.location`/reload.

## `renderizarFormularioOsInstrutoria_()`

Renderiza dentro de `view-os-instrutoria`:
- `<select>` de modalidade (`'Curso'`/`'Periodo'`), `onchange` chama
  `atualizarControlesRecorteOs_()`.
- Container `#osControlesRecorte_`, preenchido por `atualizarControlesRecorteOs_()`.
- Botões "Calcular Minuta" (`calcularOsInstrutoriaClick_`) e "Voltar"
  (`fecharPainelOsInstrutoria_`).
- Container `#osResultado_`, vazio até o cálculo.

## `atualizarControlesRecorteOs_()`

Se modalidade `'Curso'`: renderiza `<select id="osIdCurso_">` com `ID_Curso` de todo
`AppState.ctx.cursos` (ou `gs('listarCursos')`/equivalente já usado por outras views), de qualquer
classificação (achado real, research.md/spec.md).

Se modalidade `'Periodo'`: renderiza `<select id="osAno_">` (ano corrente como padrão) +
`<select id="osTipoRecorte_">` (`'Trimestre'`/`'Semestre'`) + `<select id="osNumeroRecorte_">`,
repopulado conforme `osTipoRecorte_` (1º-4º trimestre OU 1º-2º semestre).

## `calcularOsInstrutoriaClick_()`

Monta `filtros` a partir dos controles visíveis, chama `gs('calcularOsInstrutoria', filtros)`,
renderiza o resultado via `renderizarTabelaOsInstrutoria_` no sucesso, `alert()` no erro (mesmo
padrão de tratamento de erro pontual já usado por outras ações desta tela).

## `renderizarTabelaOsInstrutoria_(nosInstrutor)`

Constrói a tabela HTML com as colunas `Posto/Grad. | NIP | Nome | Téc. de Ens. | Início | Término |
Curso | Disciplina` (FR-009). Para cada nó de instrutor, a primeira `<tr>` inclui as 4 primeiras
células (`Posto/Grad.`, `NIP`, `Nome`, `Téc. de Ens.`) com `rowspan="${disciplinas.length}"`,
seguidas das 4 células da primeira disciplina; cada `<tr>` subsequente do mesmo instrutor contém
só as 4 células de disciplina (Início/Término/Curso/Disciplina), sem repetir as 4 primeiras
(FR-010). Se `nosInstrutor.length === 0`, renderiza mensagem informativa em vez de tabela vazia
(Edge Case de spec.md).
