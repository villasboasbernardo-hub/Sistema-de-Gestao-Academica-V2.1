# Contrato — Funções de frontend (Substituição do Layout da Ficha)

## `app/(app)/instrutores/page.tsx`

### `renderizarFichaInstrutor_(instrutor)` (existente — miolo reescrito, assinatura inalterada)

- **Mudança**: o HTML gerado a partir de `BLOCOS_EDICAO_INSTRUTOR` (tabela genérica rótulo/valor,
  spec 025) é substituído pela estrutura exata de
  `SIS11/modelos/Ficha de cadastro/FICHACADASTRODEDOCENTESCIAARA_2_.docx.html`, transformada por
  script one-off (research.md §1) em: um `<style>` escopado sob `#fichaInstrutorConteudo` (novo,
  colado uma única vez no HTML gerado por esta função) + o miolo do `<body>` do arquivo com cada
  `{{TAG}}` trocada por interpolação JS (research.md §3) + as 2 imagens em Base64 (research.md §2)
  + o `<hr style="page-break-before:always">` removido (Clarifications 2026-08-19).
- **Inalterado**: assinatura da função; o toolbar de 3 botões (`Voltar`/`Salvar Ficha no
  Supabase Storage`/`Imprimir`) e seus `onclick`; o wrapper `id="fichaInstrutorConteudo" class="area-impressao
  ficha-instrutor"`; o toast de sucesso (`#toastFichaInstrutor`).
- **Removido**: a dependência de `BLOCOS_EDICAO_INSTRUTOR`/`valorExibicaoFichaInstrutor_` dentro
  desta função especificamente — essas continuam existindo e sendo usadas pelo formulário de
  edição (`renderizarPainelEdicaoInstrutor_`), fora do escopo desta spec.
- **Regras**: FR-001 a FR-008; research.md §1-4.

Nenhuma mudança em `mostrarPainelFichaInstrutor_`, `fecharPainelFichaInstrutor_`,
`salvarFichaClick_`, `abrirFichaInstrutor`, `instrutorFichaAtual_` ou qualquer outra função
do arquivo. Nenhuma mudança em `app/globals.css`, `lib/acoes/crud.ts` ou `lib/acoes/instrutores.ts`.
