# Contrato — Funções de frontend (SPA Ficha, Máscaras, Abas)

## `app/(app)/instrutores/page.tsx`

### Ficha do Instrutor — modal removido, 3º painel novo (FR-001/002)

- **Removidos**: `<div id="modalFichaInstrutor" class="modal fade">` (todo o markup),
  `renderizarModalFichaInstrutor_(instrutor)`, `abrirModalFichaInstrutor_(idInstrutor)`.
- **Novos**:
  - `<div id="painelFichaInstrutor" style="display:none">` — 3º painel dentro de
    `[data-view="tabInstrutores"]`, irmão de `painelPrincipalInstrutores`/`painelEdicaoInstrutor`.
  - `mostrarPainelFichaInstrutor_()`/`fecharPainelFichaInstrutor_()` — mesmo padrão de
    `mostrarPainelEdicaoInstrutor_`/`fecharPainelEdicaoInstrutor_` (research.md §1).
  - `abrirFichaInstrutor(idInstrutor)` — substitui `abrirModalFichaInstrutor_`, chamada pelo botão
    "Ficha" da listagem (`onclick` atualizado).
  - `renderizarFichaInstrutor_(instrutor)` — substitui `renderizarModalFichaInstrutor_`, monta o
    HTML adaptado de `ficha-cadastro-docente-template.html` (grade de 12 colunas, cabeçalho de 3
    linhas maiúsculas já existente desde a spec 024) dentro de `painelFichaInstrutor`, com 3 botões
    no topo: "Voltar" (`onclick="fecharPainelFichaInstrutor_()"`), "Salvar Ficha"
    (`onclick="salvarFichaClick_(...)"`) e "Imprimir" (`onclick="window.print()"`).
  - `salvarFichaClick_(idInstrutor)` — substitui `gerarPdfFichaClick` como nome (mesmo
    corpo/lógica: calcula `nomeExibicao`, chama `gs('gerarFichaPDF', idInstrutor, nomeExibicao)`);
    em sucesso, mostra um Tailwind CSS Toast (`Tailwind.Toast`, primeiro uso no projeto) em vez de só
    `window.open(url, '_blank')`; em erro, mantém `.catch(e => alert(...))` inalterado
    (Clarifications 2026-08-19).
- **Regras**: FR-001, FR-002, FR-003; research.md §1/§2.

### Reorganização de abas (FR-004)

- **`renderizarPainelEdicaoInstrutor_`**: ponto de concatenação do bloco "Sistema"
  (`blocosForaDeAbaHtml`) e dos 2 painéis de disciplinas
  (`disciplinasHabilitadasHtmlInstrutor_`/`painelAtribuicaoDisciplinasHtmlInstrutor_`) muda de
  "depois de `<div class="tab-content">`" para "dentro do `tab-pane` de `aba === 'complementares'`"
  (research.md §3). Nenhuma das 3 funções muda de assinatura/lógica interna.
- **`BLOCOS_EDICAO_INSTRUTOR`**: título do bloco sem `aba` muda de `'Sistema (somente leitura)'`
  para `'Sistema'`; o campo `Instrutor_Completo` é removido da lista (FR-005).
- **Regras**: FR-004; research.md §3.

### Campo Estado e máscaras (FR-006/007)

- **`BLOCOS_EDICAO_INSTRUTOR`**: bloco "Identificação" (aba `pessoais`) ganha
  `{ chave: 'Endereco_Estado', rotulo: 'Estado', tipo: 'dropdown-uf' }`, logo após
  `Endereco_CEP`; os 4 campos `CPF`/`Endereco_CEP`... — **atenção**: `Endereco_CEP` recebe o tipo
  `texto-mascarado-generico` com `mascara: 'mascaraCep_'`; `CPF`, `Telefone`, `RETELMA` recebem o
  mesmo tipo com `mascara: 'mascaraCpf_'`/`'mascaraTelefone_'`/`'mascaraRetelma_'`
  respectivamente.
- **`renderizarCampoEdicaoInstrutor_`**: novo ramo `if (campo.tipo === 'dropdown-uf')` — `<select>`
  com as 27 UFs (`UNIDADES_FEDERATIVAS_`, nova constante), `"RJ"` selecionado quando `!instrutor`
  (modo cadastro) ou quando `valor` já é `"RJ"`. Ramo `if (campo.tipo === 'texto-mascarado')`
  generalizado para `texto-mascarado-generico`, recebendo a função de máscara pelo nome em
  `campo.mascara` (`window[campo.mascara]` ou um mapa `{mascaraNip_, mascaraCpf_, mascaraCep_,
  mascaraTelefone_, mascaraRetelma_}`) em vez de chamar `mascaraNip_` fixo — `NIP` migra para o
  mesmo tipo genérico, mantendo comportamento idêntico (FR-008).
- **4 funções novas**: `mascaraCpf_`, `mascaraCep_`, `mascaraTelefone_`, `mascaraRetelma_`
  (research.md §5) — funções puras, mesmo padrão de `mascaraNip_`.
- **Regras**: FR-006, FR-007, FR-008; research.md §5.

Nenhuma mudança em `lib/acoes/instrutores.ts`/`MAPA_TAGS_FICHA_PDF` — `Endereco_Estado` fica fora do PDF
(FR-006, Princípio IX).
