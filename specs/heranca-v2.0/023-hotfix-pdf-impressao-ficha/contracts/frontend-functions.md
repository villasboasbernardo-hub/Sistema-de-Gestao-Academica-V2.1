# Contrato — Funções de frontend (Hotfix: Motor de PDF, Impressão e Limpeza de UI)

## `app/(app)/instrutores/page.tsx`

### Botão "Imprimir Ficha" (HTML estático, linha 399 — comportamento inalterado)

- **Mudança**: texto do botão muda de "Imprimir Ficha" para "Ficha". `onclick` inalterado
  (`abrirModalFichaInstrutor_('${i.ID_Instrutor}')`).
- **Regras**: FR-001.

### `renderizarModalFichaInstrutor_(instrutor)` (existente — comportamento estendido)

- **Mudança**: o `<h5>` do título (linha 1285) remove o wrapper `escapar(...)` ao redor de
  `formatarNomeInstrutor_('', '', instrutor.Nome_Completo, instrutor.Nome_Guerra, true)` — a
  chamada em si não muda (`isHTML=true` preservado, Clarifications 2026-08-19). Nenhuma outra
  linha da função muda (as demais chamadas de `escapar()`, sobre valores de texto simples,
  continuam corretas e intocadas).
- **Regras**: FR-002; research.md §1.

### `gerarPdfFichaClick(idInstrutor)` (existente — comportamento estendido)

- **Mudança**: antes de chamar `gs('gerarFichaPDF', ...)`, calcula `nomeExibicao =
  formatarNomeInstrutor_(instrutorFichaAtual_.Posto_Graduacao, instrutorFichaAtual_.Esp_Hab_Obs,
  instrutorFichaAtual_.Nome_Completo, instrutorFichaAtual_.Nome_Guerra, false)` (texto puro,
  `isHTML=false`) e passa a chamar `gs('gerarFichaPDF', idInstrutor, nomeExibicao)` — segundo
  argumento novo. Guarda condicional estendida para também checar `instrutorFichaAtual_` (mesma
  degradação seg já usada, `idInstrutor` sozinho não é mais suficiente já que `nomeExibicao`
  depende do objeto completo).
- **Regras**: FR-003, FR-006; research.md §3.

Nenhuma mudança em `abrirModalFichaInstrutor_`, `instrutorFichaAtual_` ou qualquer outra função do
arquivo.

## `app/globals.css`

### Bloco `@media print` (existente — reescrito, compartilhado por DSA e Ficha)

- **Mudança**: `body * { visibility: hidden; }` e `#areaImpressao, #areaImpressao *,
  .area-impressao, .area-impressao * { visibility: visible; }` viram `body * { display: none
  !important; }` e `.area-impressao, .area-impressao * { display: revert !important; }`, com uma
  regra adicional, mais específica, `.area-impressao { display: block !important; ... }` (mantendo
  o `position: absolute; top: 0; left: 0; width: 100%;` já existente). As regras `@page`/`@page
  ficha-instrutor`/`.area-impressao.ficha-instrutor { page: ... }` não mudam.
- **Regras**: FR-004, FR-005; research.md §2.
