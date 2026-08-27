# Contrato — Funções de frontend (Hotfix: Título/Cabeçalho, Fluxo de Impressão via PDF, Tags do Template)

## `app/(app)/instrutores/page.tsx`

### `renderizarModalFichaInstrutor_(instrutor)` (existente — comportamento estendido)

- **Mudança 1 (título, FR-001)**: a chamada a `formatarNomeInstrutor_` para o `<h5>` do título
  (linha 1285) troca os dois primeiros argumentos de string vazia para `instrutor.Posto_Graduacao`/
  `instrutor.Esp_Hab_Obs` — os dois últimos argumentos (`Nome_Completo`, `Nome_Guerra`) e
  `isHTML=true` permanecem inalterados.
- **Mudança 2 (cabeçalho, FR-002)**: o bloco fixo (linhas 1281-1284) troca de 2 linhas
  (`"CIAARA — Centro de..."` / `"Marinha do Brasil — Ficha do Instrutor"`) para 3 linhas
  institucionais em TUDO MAIÚSCULO (`"MARINHA DO BRASIL"` / `"CENTRO DE INSTRUÇÃO E ADESTRAMENTO
  ALMIRANTE RADLER DE AQUINO"` / `"DIVISÃO DE ADMINISTRAÇÃO ACADÊMICA"`), seguidas de "Ficha do
  Instrutor" como subtítulo (texto normal, não maiúsculo). Nenhuma outra linha da função muda.
- **Regras**: FR-001, FR-002; research.md §1.

### Botões do `modal-footer` (HTML estático, linhas 49-50 — comportamento estendido)

- **Mudança 1 (FR-003)**: texto do botão muda de "Gerar PDF" para "Salvar Ficha".
  `onclick="gerarPdfFichaClick(instrutorFichaAtual_ && instrutorFichaAtual_.ID_Instrutor)"`
  inalterado.
- **Mudança 2 (FR-004)**: o botão "Imprimir" troca `onclick="window.print()"` por
  `onclick="gerarPdfFichaClick(instrutorFichaAtual_ && instrutorFichaAtual_.ID_Instrutor)"` — o
  mesmo `onclick` do botão "Salvar Ficha". Texto do botão ("Imprimir") inalterado.
- **Regras**: FR-003, FR-004; research.md §2.

Nenhuma mudança em `gerarPdfFichaClick`, `abrirModalFichaInstrutor_`, `instrutorFichaAtual_` ou
qualquer outra função do arquivo. Nenhuma mudança em `app/globals.css` — a correção `display`/
`revert`/`block` do `@media print` (spec 023) permanece intocada (FR-005), continua servindo o DSA.

## `lib/acoes/instrutores.ts`

Nenhuma mudança de código — `gerarFichaPDF`/`MAPA_TAGS_FICHA_PDF` já cobrem as 34 tags
automaticamente via `Object.keys(...).forEach(...)` (FR-007, research.md §3).
